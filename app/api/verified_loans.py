import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import VerifiedLoan, Loan, ValidationException
from app.schemas import VerifiedLoanSchema
from app.services.verification_service import VerificationService
from app.services.audit_service import AuditService

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

    matches, recalculated = VerificationService.verify_hash_integrity(verified)
    
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
    verified_by: str = "Elena Rostova (Operator)",
    db: Session = Depends(get_db)
):
    verified_count = VerificationService.verify_clean_loans_batch(
        db=db,
        verified_by=verified_by,
        actor_id="usr-001",
        actor_role="OPERATOR"
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
