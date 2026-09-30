import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.database import get_db
from app.models import VerifiedLoan, Loan, ValidationException, User
from app.schemas import VerifiedLoanSchema
from app.services.verification_service import VerificationService
from app.services.audit_service import AuditService
from app.api.auth import require_role

router = APIRouter(prefix="/verified-loans", tags=["Verified Loans"])

@router.get("", response_model=List[VerifiedLoanSchema])
def list_verified_loans(
    search: Optional[str] = Query(None, description="Search by loan_id or record_hash"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(VerifiedLoan)
    if search:
        query = query.filter(
            (VerifiedLoan.loan_id.ilike(f"%{search}%")) |
            (VerifiedLoan.record_hash.ilike(f"%{search}%"))
        )
    verified = query.order_by(VerifiedLoan.verified_at.desc()).offset(offset).limit(limit).all()
    return [VerifiedLoanSchema.from_orm(v) for v in verified]

@router.get("/{id}")
def get_verified_loan_detail(id: str, db: Session = Depends(get_db)):
    verified = db.query(VerifiedLoan).filter((VerifiedLoan.id == id) | (VerifiedLoan.loan_id == id)).first()
    if not verified:
        raise HTTPException(status_code=404, detail="Verified loan record not found.")

    matches, recalculated = VerificationService.verify_hash_integrity(verified, db=db)
    
    return {
        "verified_record": VerifiedLoanSchema.from_orm(verified),
        "hash_verification": {
            "is_valid": matches,
            "stored_hash": verified.record_hash,
            "recalculated_hash": recalculated,
            "tamper_detected": not matches
        }
    }

@router.post("/verify-all-clean")
def verify_all_clean_loans(
    verified_by: Optional[str] = None,
    current_user: User = Depends(require_role(["REVIEWER", "OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    verifier_name = verified_by or current_user.full_name
    verified_count = VerificationService.verify_clean_loans_batch(
        db=db,
        verified_by=verifier_name,
        actor_id=current_user.id,
        actor_role=current_user.role
    )

    return {
        "message": f"Successfully verified {verified_count} clean loan records.",
        "verified_count": verified_count
    }

@router.get("/export/csv")
def export_verified_csv(db: Session = Depends(get_db)):
    verified_loans = db.query(VerifiedLoan).order_by(VerifiedLoan.verified_at.desc()).all()
    
    if not verified_loans:
        return Response(content="loan_id,record_hash,verified_at,status\n", media_type="text/csv")

    output = io.StringIO()
    sample_canon = verified_loans[0].canonical_data
    headers = list(sample_canon.keys()) + ["record_hash", "raw_hash", "verified_by", "verified_at"]
    
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    
    for vl in verified_loans:
        row = dict(vl.canonical_data)
        row["record_hash"] = vl.record_hash
        row["raw_hash"] = vl.raw_hash
        row["verified_by"] = vl.verified_by
        row["verified_at"] = vl.verified_at.isoformat()
        writer.writerow(row)

    AuditService.log_event(
        db=db,
        event_type="EXPORT_GENERATED",
        actor_id="usr-003",
        actor_role="CONSUMER",
        summary=f"Exported {len(verified_loans)} verified loan records as CSV.",
        metadata_json={"export_type": "CSV", "record_count": len(verified_loans)}
    )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=verified_loans_export.csv"}
    )

class TamperSimulationRequest(BaseModel):
    tampered_fields: dict
    reason: Optional[str] = "Live tamper detection demonstration"

@router.post("/{id}/simulate-tamper")
def simulate_tamper(
    id: str,
    payload: TamperSimulationRequest,
    db: Session = Depends(get_db)
):
    verified = db.query(VerifiedLoan).filter((VerifiedLoan.id == id) | (VerifiedLoan.loan_id == id)).first()
    if not verified:
        raise HTTPException(status_code=404, detail="Verified loan record not found.")

    original_canonical = dict(verified.canonical_data)
    updated_canonical = dict(original_canonical)
    for k, v in payload.tampered_fields.items():
        updated_canonical[k] = v

    verified.canonical_data = updated_canonical
    db.commit()
    db.refresh(verified)

    # Computes hash mismatch and automatically triggers TAMPER_DETECTED audit event
    matches, recalculated = VerificationService.verify_hash_integrity(verified, db=db)

    return {
        "message": "Tamper injected successfully into canonical payload.",
        "verified_record": VerifiedLoanSchema.from_orm(verified),
        "hash_verification": {
            "is_valid": matches,
            "stored_hash": verified.record_hash,
            "recalculated_hash": recalculated,
            "tamper_detected": not matches
        }
    }

@router.post("/{id}/restore")
def restore_tampered_loan(
    id: str,
    db: Session = Depends(get_db)
):
    verified = db.query(VerifiedLoan).filter((VerifiedLoan.id == id) | (VerifiedLoan.loan_id == id)).first()
    if not verified:
        raise HTTPException(status_code=404, detail="Verified loan record not found.")

    loan = verified.loan
    if not loan:
        raise HTTPException(status_code=404, detail="Underlying loan record not found.")

    authentic_payload = {
        "loan_id": loan.loan_id,
        "borrower_id": loan.borrower_id,
        "loan_type": loan.loan_type,
        "origination_date": loan.origination_date,
        "maturity_date": loan.maturity_date,
        "original_principal": float(loan.original_principal) if loan.original_principal is not None else 0.0,
        "current_balance": float(loan.current_balance) if loan.current_balance is not None else 0.0,
        "interest_rate": float(loan.interest_rate) if loan.interest_rate is not None else 0.0,
        "term_months": int(loan.term_months) if loan.term_months is not None else 0,
        "borrower_state": loan.borrower_state,
        "loan_purpose": loan.loan_purpose,
        "credit_grade": loan.credit_grade,
        "employment_length": loan.employment_length,
        "income_band": loan.income_band,
        "payment_status": loan.payment_status,
        "days_past_due": int(loan.days_past_due) if loan.days_past_due is not None else 0,
        "servicer_name": loan.servicer_name,
        "last_payment_date": loan.last_payment_date,
        "last_updated_at": loan.last_updated_at,
        "document_status": loan.document_status,
        "source_system": loan.source_system
    }

    verified.canonical_data = authentic_payload
    authentic_hash = VerificationService.compute_hash(authentic_payload)
    verified.record_hash = authentic_hash
    db.commit()
    db.refresh(verified)

    AuditService.log_event(
        db=db,
        event_type="INTEGRITY_RESTORED",
        actor_id="usr-tamper-demo",
        actor_role="AUDITOR",
        summary=f"Cryptographic integrity restored for Loan {verified.loan_id}. Canonical payload realigned with primary ledger.",
        loan_id=verified.loan_id,
        new_state=authentic_payload
    )

    matches, recalculated = VerificationService.verify_hash_integrity(verified, db=db)

    return {
        "message": "Loan integrity restored successfully.",
        "verified_record": VerifiedLoanSchema.from_orm(verified),
        "hash_verification": {
            "is_valid": matches,
            "stored_hash": verified.record_hash,
            "recalculated_hash": recalculated,
            "tamper_detected": not matches
        }
    }
