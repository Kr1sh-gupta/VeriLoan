import hashlib
import json
import uuid
import datetime
from typing import Dict, Any, Tuple, Optional, List
from sqlalchemy.orm import Session
from app.models import Loan, VerifiedLoan, ValidationException
from app.services.audit_service import AuditService

class VerificationService:
    @staticmethod
    def canonical_json(data: Dict[str, Any]) -> str:
        """
        Produces deterministic, canonically sorted JSON string representation.
        Ensures consistent cryptographic hash calculation across platforms.
        """
        return json.dumps(data, sort_keys=True, separators=(',', ':'), default=str)

    @classmethod
    def compute_hash(cls, data: Dict[str, Any]) -> str:
        canonical_str = cls.canonical_json(data)
        return hashlib.sha256(canonical_str.encode('utf-8')).hexdigest()

    @classmethod
    def verify_and_seal_loan(
        cls,
        db: Session,
        loan: Loan,
        verified_by: str = "Marcus Vance (Reviewer)",
        resolution_notes: str = "All validation exceptions resolved and verified.",
        ai_assisted: bool = False,
        ai_recommendation: Optional[Dict[str, Any]] = None,
        actor_id: str = "usr-002",
        actor_role: str = "REVIEWER"
    ) -> VerifiedLoan:
        # Build canonical verified data payload
        canonical_payload = {
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

        record_hash = cls.compute_hash(canonical_payload)
        raw_hash = cls.compute_hash(loan.raw_data or canonical_payload)

        # Snapshot all exceptions and resolutions associated with this loan
        exceptions = db.query(ValidationException).filter(ValidationException.loan_id_ref == loan.id).all()
        validation_snapshot = [
            {
                "rule_code": exc.rule_code,
                "category": exc.category,
                "severity": exc.severity,
                "status": exc.status,
                "field_name": exc.field_name,
                "error_message": exc.error_message,
                "resolution_action": exc.resolution_action,
                "resolved_by": exc.resolved_by
            }
            for exc in exceptions
        ]

        # Extract AI recommendation from exceptions if not explicitly provided
        if ai_recommendation is None and any(exc.ai_suggested_patch for exc in exceptions):
            for exc in exceptions:
                if exc.ai_suggested_patch:
                    ai_recommendation = exc.ai_suggested_patch
                    break

        # Check if verified record already exists
        verified = db.query(VerifiedLoan).filter(VerifiedLoan.loan_id_ref == loan.id).first()
        if not verified:
            verified = VerifiedLoan(
                id=f"ver-{uuid.uuid4().hex[:12]}",
                loan_id_ref=loan.id,
                loan_id=loan.loan_id or f"UNKNOWN-{loan.id}",
                canonical_data=canonical_payload,
                record_hash=record_hash,
                raw_hash=raw_hash,
                source_file=loan.batch_id or "loan_tape.csv",
                verified_by=verified_by,
                verified_at=datetime.datetime.utcnow(),
                resolution_notes=resolution_notes,
                ai_assisted=ai_assisted,
                validation_snapshot=validation_snapshot,
                ai_recommendation=ai_recommendation
            )
            db.add(verified)
        else:
            verified.canonical_data = canonical_payload
            verified.record_hash = record_hash
            verified.verified_by = verified_by
            verified.verified_at = datetime.datetime.utcnow()
            verified.resolution_notes = resolution_notes
            verified.ai_assisted = ai_assisted
            verified.validation_snapshot = validation_snapshot
            verified.ai_recommendation = ai_recommendation

        loan.status = "VERIFIED"
        db.commit()
        db.refresh(verified)

        # Log audit event
        AuditService.log_event(
            db=db,
            event_type="VERIFIED_RECORD_CREATED",
            actor_id=actor_id,
            actor_role=actor_role,
            summary=f"Loan {loan.loan_id} sealed as Verified Record with SHA-256: {record_hash[:16]}...",
            loan_id=loan.loan_id,
            previous_state={"status": "FLAGGED_OR_PENDING"},
            new_state={"status": "VERIFIED", "record_hash": record_hash},
            metadata_json={"record_hash": record_hash, "raw_hash": raw_hash, "ai_assisted": ai_assisted}
        )

        return verified

    @classmethod
    def verify_clean_loans_batch(
        cls,
        db: Session,
        verified_by: str = "Elena Rostova (Operator)",
        actor_id: str = "usr-001",
        actor_role: str = "OPERATOR"
    ) -> int:
        """
        Batch seals all clean loans (those without open exceptions) into VerifiedLoan records.
        Avoids N+1 queries by fetching open exception loan references in a single set.
        """
        open_exc_refs = {
            r[0] for r in db.query(ValidationException.loan_id_ref).filter(ValidationException.status == "OPEN").all()
        }

        pending_loans = db.query(Loan).filter(Loan.status.in_(["PENDING", "RESOLVED"])).all()
        verified_count = 0

        for loan in pending_loans:
            if loan.id not in open_exc_refs:
                cls.verify_and_seal_loan(
                    db=db,
                    loan=loan,
                    verified_by=verified_by,
                    resolution_notes="Clean record passed all validation rules without exceptions.",
                    ai_assisted=False,
                    actor_id=actor_id,
                    actor_role=actor_role
                )
                verified_count += 1

        return verified_count

    @classmethod
    def verify_hash_integrity(cls, verified_loan: VerifiedLoan) -> Tuple[bool, str]:
        recalculated_hash = cls.compute_hash(verified_loan.canonical_data)
        matches = (recalculated_hash == verified_loan.record_hash)
        return matches, recalculated_hash
