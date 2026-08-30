import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import ValidationException, Loan, User
from app.schemas import ValidationExceptionSchema, ResolveExceptionRequest
from app.services.verification_service import VerificationService
from app.services.audit_service import AuditService
from app.api.auth import require_role

router = APIRouter(prefix="/exceptions", tags=["Exceptions"])

@router.get("", response_model=List[ValidationExceptionSchema])
def list_exceptions(
    severity: Optional[str] = Query(None, description="CRITICAL, HIGH, MEDIUM, LOW"),
    status: Optional[str] = Query("OPEN", description="OPEN, RESOLVED, DISMISSED"),
    rule_code: Optional[str] = Query(None, description="e.g. VAL-001, VAL-007"),
    search: Optional[str] = Query(None, description="Search by loan_id or borrower_id"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(ValidationException)
    if status:
        query = query.filter(ValidationException.status == status)
    if severity:
        query = query.filter(ValidationException.severity == severity)
    if rule_code:
        query = query.filter(ValidationException.rule_code == rule_code)
    if search:
        query = query.filter(
            (ValidationException.loan_id_code.ilike(f"%{search}%")) |
            (ValidationException.error_message.ilike(f"%{search}%"))
        )

    exceptions = query.order_by(ValidationException.created_at.desc()).offset(offset).limit(limit).all()
    return [ValidationExceptionSchema.from_orm(e) for e in exceptions]

@router.post("/{id}/resolve")
def resolve_exception(
    id: str,
    payload: ResolveExceptionRequest,
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    exc = db.query(ValidationException).filter(ValidationException.id == id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found.")

    loan = db.query(Loan).filter(Loan.id == exc.loan_id_ref).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Associated loan record not found.")

    reviewer_display_name = payload.reviewer_name or current_user.full_name

    prev_loan_state = {
        "loan_id": loan.loan_id,
        "original_principal": loan.original_principal,
        "current_balance": loan.current_balance,
        "interest_rate": loan.interest_rate,
        "origination_date": loan.origination_date,
        "maturity_date": loan.maturity_date,
        "payment_status": loan.payment_status,
        "days_past_due": loan.days_past_due,
        "borrower_state": loan.borrower_state,
        "document_status": loan.document_status,
        "last_updated_at": loan.last_updated_at,
        "status": loan.status
    }

    ai_assisted = False

    if payload.action == "ACCEPT_AI":
        ai_assisted = True
        if exc.ai_suggested_patch:
            for field, val in exc.ai_suggested_patch.items():
                if hasattr(loan, field):
                    setattr(loan, field, val)
        exc.status = "RESOLVED"
        exc.resolution_action = "ACCEPTED_AI"
        exc.resolution_notes = payload.notes or f"Accepted AI suggestion: {exc.ai_suggested_patch}"
        exc.resolved_by = reviewer_display_name
        exc.resolved_at = datetime.datetime.utcnow()

    elif payload.action == "MANUAL_EDIT":
        if payload.corrected_data:
            for field, val in payload.corrected_data.items():
                if hasattr(loan, field):
                    setattr(loan, field, val)
        exc.status = "RESOLVED"
        exc.resolution_action = "MANUAL_OVERRIDE"
        exc.resolution_notes = payload.notes or f"Manual override applied: {payload.corrected_data}"
        exc.resolved_by = reviewer_display_name
        exc.resolved_at = datetime.datetime.utcnow()

    elif payload.action == "DISMISS":
        exc.status = "DISMISSED"
        exc.resolution_action = "DISMISSED"
        exc.resolution_notes = payload.notes or "Exception dismissed by diligence reviewer."
        exc.resolved_by = reviewer_display_name
        exc.resolved_at = datetime.datetime.utcnow()

    elif payload.action == "REJECT":
        exc.status = "RESOLVED"
        exc.resolution_action = "REJECTED_LOAN"
        exc.resolution_notes = payload.notes or "Loan rejected from portfolio."
        exc.resolved_by = reviewer_display_name
        exc.resolved_at = datetime.datetime.utcnow()
        loan.status = "REJECTED"

    db.commit()

    remaining_open = db.query(ValidationException).filter(
        ValidationException.loan_id_ref == loan.id,
        ValidationException.status == "OPEN"
    ).count()

    verified_result = None
    if remaining_open == 0 and loan.status != "REJECTED":
        verified_result = VerificationService.verify_and_seal_loan(
            db=db,
            loan=loan,
            verified_by=reviewer_display_name,
            resolution_notes=exc.resolution_notes or "All exceptions cleared.",
            ai_assisted=ai_assisted
        )

    AuditService.log_event(
        db=db,
        event_type="RECORD_APPROVED" if loan.status == "VERIFIED" else ("RECORD_REJECTED" if loan.status == "REJECTED" else "EXCEPTION_RESOLVED"),
        actor_id=current_user.id,
        actor_role=current_user.role,
        summary=f"Reviewer {reviewer_display_name} took action '{payload.action}' on exception {exc.rule_code} for Loan {loan.loan_id}.",
        loan_id=loan.loan_id,
        previous_state=prev_loan_state,
        new_state={
            "loan_id": loan.loan_id,
            "current_balance": loan.current_balance,
            "status": loan.status
        },
        metadata_json={
            "exception_id": exc.id,
            "action": payload.action,
            "ai_assisted": ai_assisted,
            "notes": payload.notes
        }
    )

    return {
        "message": f"Exception {exc.id} resolved via {payload.action}.",
        "exception_status": exc.status,
        "loan_status": loan.status,
        "remaining_open_exceptions": remaining_open,
        "verified_record": verified_result.record_hash if verified_result else None
    }
