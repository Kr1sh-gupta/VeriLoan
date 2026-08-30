import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import ValidationException, Loan, User
from app.schemas import ValidationExceptionSchema, ResolveExceptionRequest, CommentExceptionRequest
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
    query = db.query(ValidationException, Loan.borrower_id).join(Loan, ValidationException.loan_id_ref == Loan.id, isouter=True)
    if status:
        query = query.filter(ValidationException.status == status)
    if severity:
        query = query.filter(ValidationException.severity == severity)
    if rule_code:
        query = query.filter(ValidationException.rule_code == rule_code)
    if search:
        query = query.filter(
            (ValidationException.loan_id_code.ilike(f"%{search}%")) |
            (ValidationException.error_message.ilike(f"%{search}%")) |
            (Loan.borrower_id.ilike(f"%{search}%"))
        )

    results = query.order_by(ValidationException.created_at.desc()).offset(offset).limit(limit).all()
    exceptions = []
    for exc, b_id in results:
        schema_item = ValidationExceptionSchema.from_orm(exc)
        schema_item.borrower_id = b_id
        exceptions.append(schema_item)
    return exceptions

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

    reviewer_display_name = payload.reviewer_name or current_user.full_name or current_user.username

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

    elif payload.action == "REQUEST_CORRECTION":
        exc.status = "OPEN"
        exc.resolution_action = "CORRECTION_REQUESTED"
        exc.resolution_notes = payload.notes or "Correction requested from servicer / primary lender."
        exc.resolved_by = reviewer_display_name
        exc.resolved_at = datetime.datetime.utcnow()
        loan.status = "FLAGGED"

    db.commit()

    remaining_open = db.query(ValidationException).filter(
        ValidationException.loan_id_ref == loan.id,
        ValidationException.status == "OPEN"
    ).count()

    verified_result = None
    if remaining_open == 0 and loan.status != "REJECTED" and payload.action != "REQUEST_CORRECTION":
        verified_result = VerificationService.verify_and_seal_loan(
            db=db,
            loan=loan,
            verified_by=reviewer_display_name,
            resolution_notes=exc.resolution_notes or "All exceptions cleared.",
            ai_assisted=ai_assisted
        )

    event_type = "EXCEPTION_RESOLVED"
    if payload.action == "REQUEST_CORRECTION":
        event_type = "CORRECTION_REQUESTED"
    elif loan.status == "VERIFIED":
        event_type = "RECORD_APPROVED"
    elif loan.status == "REJECTED":
        event_type = "RECORD_REJECTED"

    AuditService.log_event(
        db=db,
        event_type=event_type,
        actor_id=current_user.id,
        actor_role=current_user.role,
        summary=f"Reviewer {reviewer_display_name} requested correction from servicer on exception {exc.rule_code} for Loan {loan.loan_id}: {payload.notes or 'Remediation requested'}" if payload.action == "REQUEST_CORRECTION" else f"Reviewer {reviewer_display_name} took action '{payload.action}' on exception {exc.rule_code} for Loan {loan.loan_id}.",
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

@router.post("/{id}/comment")
def add_exception_comment(
    id: str,
    payload: CommentExceptionRequest,
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    exc = db.query(ValidationException).filter(ValidationException.id == id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception record not found.")

    if not payload.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty.")

    reviewer_display_name = payload.reviewer_name or current_user.full_name or current_user.username

    if exc.resolution_notes:
        exc.resolution_notes += f" | Comment by {reviewer_display_name}: {payload.comment}"
    else:
        exc.resolution_notes = f"Comment by {reviewer_display_name}: {payload.comment}"

    db.commit()
    db.refresh(exc)

    # Log REVIEWER_COMMENT audit event
    AuditService.log_event(
        db=db,
        event_type="REVIEWER_COMMENT",
        actor_id=current_user.id,
        actor_role=current_user.role,
        summary=f"Reviewer {reviewer_display_name} commented on exception {exc.rule_code} (Loan {exc.loan_id_code}): {payload.comment[:80]}",
        loan_id=exc.loan_id_code,
        metadata_json={
            "exception_id": exc.id,
            "rule_code": exc.rule_code,
            "comment": payload.comment,
            "reviewer_name": reviewer_display_name
        }
    )

    return {
        "message": "Comment added successfully.",
        "exception_id": exc.id,
        "resolution_notes": exc.resolution_notes
    }
