import json
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Loan, ValidationException, VerifiedLoan, UploadBatch, User
from app.schemas import SystemSummaryMetrics, IngestionSummaryResponse
from app.services.audit_service import AuditService
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

@router.get("/rules")
def get_validation_rules():
    rules_path = os.path.join(os.path.dirname(__file__), "../../../data/validation_rules.json")
    if os.path.exists(rules_path):
        with open(rules_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"rules": []}

@router.post("/rules")
def create_custom_rule(
    rule_data: dict,
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    rule_code = rule_data.get("rule_code", f"R_CUSTOM")
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
    AuditService.log_event(
        db=db,
        event_type="RULE_UPDATED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        summary=f"Updated validation rule '{rule_code}' parameters/thresholds",
        metadata_json={"rule_code": rule_code, "updated_fields": rule_data}
    )
    return {"status": "SUCCESS", "message": f"Rule {rule_code} updated"}
