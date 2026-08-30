from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import Loan, ValidationException, ServicerUpdate, DocumentManifest, User
from app.schemas import LoanRecordSchema, ValidationExceptionSchema
from app.services.audit_service import AuditService
from app.api.auth import require_role

router = APIRouter(prefix="/loans", tags=["Loans"])

@router.get("", response_model=List[LoanRecordSchema])
def list_loans(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, FLAGGED, VERIFIED, REJECTED"),
    search: Optional[str] = Query(None, description="Search by loan_id or borrower_id"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Loan)
    if status:
        query = query.filter(Loan.status == status)
    if search:
        query = query.filter(
            (Loan.loan_id.ilike(f"%{search}%")) | (Loan.borrower_id.ilike(f"%{search}%"))
        )
    loans = query.order_by(Loan.created_at.asc()).offset(offset).limit(limit).all()
    return [LoanRecordSchema.from_orm(l) for l in loans]

@router.get("/{id}")
def get_loan_detail(id: str, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter((Loan.id == id) | (Loan.loan_id == id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan record not found.")

    exceptions = db.query(ValidationException).filter(ValidationException.loan_id_ref == loan.id).all()
    servicer_update = db.query(ServicerUpdate).filter(ServicerUpdate.loan_id == loan.loan_id).first() if loan.loan_id else None
    documents = db.query(DocumentManifest).filter(DocumentManifest.loan_id == loan.loan_id).all() if loan.loan_id else []

    return {
        "loan": LoanRecordSchema.from_orm(loan),
        "exceptions": [ValidationExceptionSchema.from_orm(e) for e in exceptions],
        "servicer_update": {
            "current_balance": servicer_update.current_balance if servicer_update else None,
            "payment_status": servicer_update.payment_status if servicer_update else None,
            "days_past_due": servicer_update.days_past_due if servicer_update else None,
            "servicer_name": servicer_update.servicer_name if servicer_update else None,
            "update_timestamp": servicer_update.update_timestamp if servicer_update else None
        } if servicer_update else None,
        "documents": [
            {
                "doc_type": d.doc_type,
                "doc_status": d.doc_status,
                "file_hash_md5": d.file_hash_md5,
                "last_verified_at": d.last_verified_at
            }
            for d in documents
        ]
    }

@router.put("/{id}")
def update_loan_fields(
    id: str,
    fields: dict,
    reviewer_name: Optional[str] = None,
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter((Loan.id == id) | (Loan.loan_id == id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan record not found.")

    reviewer_display_name = reviewer_name or current_user.full_name
    prev_state = {k: getattr(loan, k, None) for k in fields.keys() if hasattr(loan, k)}

    for k, v in fields.items():
        if hasattr(loan, k):
            setattr(loan, k, v)

    new_state = {k: getattr(loan, k, None) for k in fields.keys() if hasattr(loan, k)}
    db.commit()
    db.refresh(loan)

    AuditService.log_event(
        db=db,
        event_type="FIELD_EDITED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        summary=f"Reviewer {reviewer_display_name} manually edited fields on Loan {loan.loan_id}: {list(fields.keys())}",
        loan_id=loan.loan_id,
        previous_state=prev_state,
        new_state=new_state,
        metadata_json={"modified_fields": list(fields.keys()), "editor": reviewer_display_name}
    )

    return {"message": "Loan updated successfully.", "loan": LoanRecordSchema.from_orm(loan)}
