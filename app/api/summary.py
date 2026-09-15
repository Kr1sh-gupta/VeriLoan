import json
import os
import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Loan, ValidationException, VerifiedLoan, UploadBatch, User, ServicerUpdate, DocumentManifest, AuditEvent
from app.schemas import SystemSummaryMetrics, IngestionSummaryResponse
from app.services.audit_service import AuditService
from app.services.ingestion_service import IngestionService
from app.services.verification_service import VerificationService
from app.api.auth import require_role

router = APIRouter(prefix="/summary", tags=["Summary & Metrics"])

@router.get("", response_model=SystemSummaryMetrics)
def get_system_summary(db: Session = Depends(get_db)):
    total_loans = db.query(Loan).count()
    total_exceptions = db.query(ValidationException).count()
    open_exceptions = db.query(ValidationException).filter(ValidationException.status == "OPEN").count()
    resolved_exceptions = db.query(ValidationException).filter(ValidationException.status.in_(["RESOLVED", "DISMISSED"])).count()
    verified_loans = db.query(VerifiedLoan).count()

    critical_exceptions = db.query(ValidationException).filter(ValidationException.severity == "CRITICAL", ValidationException.status == "OPEN").count()
    high_exceptions = db.query(ValidationException).filter(ValidationException.severity == "HIGH", ValidationException.status == "OPEN").count()
    medium_exceptions = db.query(ValidationException).filter(ValidationException.severity == "MEDIUM", ValidationException.status == "OPEN").count()
    low_exceptions = db.query(ValidationException).filter(ValidationException.severity == "LOW", ValidationException.status == "OPEN").count()

    # Data quality health score: (Verified + Clean / Total) * 100
    if total_loans > 0:
        flagged_count = db.query(Loan).filter(Loan.status == "FLAGGED").count()
        data_quality_score = round(((total_loans - flagged_count) / total_loans) * 100.0, 1)
    else:
        data_quality_score = 100.0

    recent_batches = db.query(UploadBatch).order_by(UploadBatch.created_at.desc()).limit(5).all()

    return SystemSummaryMetrics(
        total_loans=total_loans,
        total_exceptions=total_exceptions,
        open_exceptions=open_exceptions,
        resolved_exceptions=resolved_exceptions,
        verified_loans=verified_loans,
        critical_exceptions=critical_exceptions,
        high_exceptions=high_exceptions,
        medium_exceptions=medium_exceptions,
        low_exceptions=low_exceptions,
        data_quality_score=data_quality_score,
        recent_batches=[
            IngestionSummaryResponse(
                batch_id=b.id,
                filename=b.filename,
                file_type=b.file_type,
                total_rows=b.total_rows,
                valid_rows=b.valid_rows,
                exception_count=b.exception_count,
                status=b.status,
                created_at=b.created_at
            )
            for b in recent_batches
        ]
    )

def _get_rules_file_path() -> str:
    candidate_paths = [
        os.path.join(os.path.dirname(__file__), "../../data/validation_rules.json"),
        os.path.join(os.path.dirname(__file__), "../../../main/data/validation_rules.json"),
        os.path.join(os.path.dirname(__file__), "../../../data/validation_rules.json"),
        os.path.abspath(os.path.join(os.getcwd(), "data/validation_rules.json")),
        os.path.abspath(os.path.join(os.getcwd(), "backend/data/validation_rules.json")),
        os.path.abspath(os.path.join(os.getcwd(), "main/data/validation_rules.json")),
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return p
    return os.path.join(os.path.dirname(__file__), "../../data/validation_rules.json")

@router.get("/rules")
def get_validation_rules():
    rules_path = _get_rules_file_path()
    if os.path.exists(rules_path):
        with open(rules_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"version": "1.0.0", "rules": []}

@router.post("/rules")
def create_custom_rule(
    rule_data: dict,
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    rule_code = rule_data.get("code") or rule_data.get("rule_code") or f"R_CUSTOM"
    rules_path = _get_rules_file_path()
    
    rules_json = {"version": "1.0.0", "rules": []}
    if os.path.exists(rules_path):
        try:
            with open(rules_path, "r", encoding="utf-8") as f:
                rules_json = json.load(f)
        except Exception:
            pass

    existing_rules = rules_json.get("rules", [])
    # Replace if exists, else append
    updated = False
    for i, r in enumerate(existing_rules):
        if r.get("code") == rule_code:
            existing_rules[i] = {**r, **rule_data, "code": rule_code}
            updated = True
            break
    if not updated:
        new_entry = {**rule_data, "code": rule_code}
        existing_rules.append(new_entry)

    rules_json["rules"] = existing_rules
    rules_json["last_updated"] = datetime.datetime.utcnow().isoformat() + "Z"

    try:
        os.makedirs(os.path.dirname(rules_path), exist_ok=True)
        with open(rules_path, "w", encoding="utf-8") as f:
            json.dump(rules_json, f, indent=2)
    except Exception as e:
        print(f"[WARN] Failed to write custom rule to {rules_path}: {e}")

    AuditService.log_event(
        db=db,
        event_type="RULE_CREATED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        summary=f"Created validation rule '{rule_code}': {rule_data.get('name', 'Custom Rule')}",
        metadata_json={"rule_code": rule_code, "rule_data": rule_data}
    )
    return {"status": "SUCCESS", "message": f"Rule {rule_code} registered", "rule_code": rule_code}

@router.put("/rules/{rule_code}")
def update_validation_rule(
    rule_code: str,
    rule_data: dict,
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    rules_path = _get_rules_file_path()
    rules_json = {"version": "1.0.0", "rules": []}
    if os.path.exists(rules_path):
        try:
            with open(rules_path, "r", encoding="utf-8") as f:
                rules_json = json.load(f)
        except Exception:
            pass

    existing_rules = rules_json.get("rules", [])
    found = False
    for i, r in enumerate(existing_rules):
        if r.get("code") == rule_code:
            existing_rules[i] = {**r, **rule_data, "code": rule_code}
            found = True
            break
    
    if not found:
        existing_rules.append({**rule_data, "code": rule_code})

    rules_json["rules"] = existing_rules
    rules_json["last_updated"] = datetime.datetime.utcnow().isoformat() + "Z"

    try:
        os.makedirs(os.path.dirname(rules_path), exist_ok=True)
        with open(rules_path, "w", encoding="utf-8") as f:
            json.dump(rules_json, f, indent=2)
    except Exception as e:
        print(f"[WARN] Failed to write updated rule to {rules_path}: {e}")

    AuditService.log_event(
        db=db,
        event_type="RULE_UPDATED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        summary=f"Updated validation rule '{rule_code}' parameters/thresholds",
        metadata_json={"rule_code": rule_code, "updated_fields": rule_data}
    )
    return {"status": "SUCCESS", "message": f"Rule {rule_code} updated", "rule_code": rule_code}

def _find_data_file(filename: str):
    candidates = [
        os.path.join(os.path.dirname(__file__), "../data", filename),
        os.path.join(os.path.dirname(__file__), "../../data", filename),
        os.path.join(os.path.dirname(__file__), "../../../main/data", filename),
        os.path.abspath(os.path.join(os.getcwd(), "data", filename)),
        os.path.abspath(os.path.join(os.getcwd(), "backend/data", filename)),
        os.path.abspath(os.path.join(os.getcwd(), "main/data", filename)),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

@router.post("/reset")
def reset_database(
    mode: str = Query("EMPTY", description="EMPTY (clears all loans/batches for live showcase) or BASELINE (re-seeds default 1,200 loans)"),
    current_user: User = Depends(require_role(["ADMIN", "OPERATOR", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    """
    Resets the database for demonstration and testing purposes.
    - EMPTY mode: Clears all loans, batches, exceptions, and verified records so the user can showcase live ingestion from 0.
    - BASELINE mode: Restores the clean 1-batch standard demo state (1,200 loans, ~89 exceptions, 1,114 verified).
    Users and validation rules are preserved across both modes.
    """
    mode_upper = mode.strip().upper()
    if mode_upper not in ["EMPTY", "BASELINE"]:
        mode_upper = "EMPTY"

    # Strictly ordered deletion to respect foreign keys (PRAGMA foreign_keys=ON)
    db.query(ValidationException).delete(synchronize_session=False)
    db.query(VerifiedLoan).delete(synchronize_session=False)
    db.query(Loan).delete(synchronize_session=False)
    db.query(ServicerUpdate).delete(synchronize_session=False)
    db.query(DocumentManifest).delete(synchronize_session=False)
    db.query(UploadBatch).delete(synchronize_session=False)
    db.query(AuditEvent).delete(synchronize_session=False)
    db.commit()

    if mode_upper == "BASELINE":
        doc_path = _find_data_file("document_manifest.csv")
        if doc_path and os.path.exists(doc_path):
            with open(doc_path, "r", encoding="utf-8") as f:
                IngestionService.ingest_csv_content(
                    db=db,
                    csv_text=f.read(),
                    filename="document_manifest.csv",
                    file_type="DOC_MANIFEST",
                    run_validation=False
                )

        servicer_path = _find_data_file("servicer_update.csv")
        if servicer_path and os.path.exists(servicer_path):
            with open(servicer_path, "r", encoding="utf-8") as f:
                IngestionService.ingest_csv_content(
                    db=db,
                    csv_text=f.read(),
                    filename="servicer_update.csv",
                    file_type="SERVICER_UPDATE",
                    run_validation=False
                )

        tape_path = _find_data_file("loan_tape.csv")
        if tape_path and os.path.exists(tape_path):
            with open(tape_path, "r", encoding="utf-8") as f:
                IngestionService.ingest_csv_content(
                    db=db,
                    csv_text=f.read(),
                    filename="loan_tape.csv",
                    file_type="LOAN_TAPE",
                    run_validation=True
                )

        VerificationService.verify_clean_loans_batch(db=db)

    # Log audit event for reset
    AuditService.log_event(
        db=db,
        event_type="DATABASE_RESET",
        actor_id=current_user.id,
        actor_role=current_user.role,
        summary=f"Database reset to {mode_upper} mode by {current_user.full_name} ({current_user.role}).",
        metadata_json={"mode": mode_upper, "actor_id": current_user.id}
    )

    total_loans = db.query(Loan).count()
    total_exceptions = db.query(ValidationException).count()
    verified_loans = db.query(VerifiedLoan).count()
    upload_batches = db.query(UploadBatch).count()

    return {
        "status": "SUCCESS",
        "mode": mode_upper,
        "message": f"Database successfully reset to {mode_upper} state.",
        "total_loans": total_loans,
        "total_exceptions": total_exceptions,
        "verified_loans": verified_loans,
        "upload_batches": upload_batches
    }

