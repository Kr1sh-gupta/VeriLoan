import re
import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Loan, ValidationException, ServicerUpdate, DocumentManifest
from app.services.audit_service import AuditService

VALID_US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", 
    "DC", "PR", "VI", "GU"
}

def parse_iso_date(date_str: Optional[str]) -> Optional[datetime.date]:
    if not date_str:
        return None
    try:
        # Standard YYYY-MM-DD
        return datetime.datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
    except Exception:
        return None

class ValidationService:
    @classmethod
    def run_all_validations(cls, db: Session, batch_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes complete 14-rule validation engine against all pending or batch loans.
        Populates validation_exceptions and updates loan statuses.
        """
        query = db.query(Loan)
        if batch_id:
            query = query.filter(Loan.batch_id == batch_id)
        
        loans = query.all()
        if not loans:
            return {"total_loans": 0, "exceptions_raised": 0, "flagged_loans": 0}

        # Clear existing open exceptions for re-validation if needed
        loan_ids = [l.id for l in loans]
        db.query(ValidationException).filter(ValidationException.loan_id_ref.in_(loan_ids), ValidationException.status == "OPEN").delete(synchronize_session=False)
        db.commit()

        # Build lookup indices for fast inter-record checks
        loan_id_counts: Dict[str, List[Loan]] = {}
        borrower_combo_counts: Dict[str, List[Loan]] = {}
        
        for loan in loans:
            lid = (loan.loan_id or "").strip()
            if lid:
                loan_id_counts.setdefault(lid, []).append(loan)
            
            b_key = f"{loan.borrower_id}_{loan.original_principal}_{loan.origination_date}"
            if loan.borrower_id and loan.original_principal:
                borrower_combo_counts.setdefault(b_key, []).append(loan)

        # Pre-fetch servicer updates & document manifests
        servicer_updates = {su.loan_id: su for su in db.query(ServicerUpdate).all()}
        doc_manifests = {}
        for dm in db.query(DocumentManifest).all():
            doc_manifests.setdefault(dm.loan_id, []).append(dm)

        total_exceptions = 0
        flagged_loan_count = 0
        now_date = datetime.date.today()

        for loan in loans:
            loan_exceptions: List[ValidationException] = []
            lid = (loan.loan_id or "").strip()

            # VAL-001: Mandatory Loan ID
            if not lid:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code="UNKNOWN",
                    rule_code="VAL-001",
                    category="MANDATORY",
                    severity="CRITICAL",
                    field_name="loan_id",
                    error_message="Missing Loan ID. Record contains empty or null identifier.",
                    actual_value=str(loan.loan_id),
                    expected_condition="Non-empty unique string (e.g. LN-XXXXX)",
                    status="OPEN"
                ))

            # VAL-002: Duplicate Loan ID across dataset
            elif len(loan_id_counts.get(lid, [])) > 1:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-002",
                    category="INTEGRITY",
                    severity="CRITICAL",
                    field_name="loan_id",
                    error_message=f"Duplicate Loan ID '{lid}' detected across {len(loan_id_counts[lid])} records in portfolio.",
                    actual_value=lid,
                    expected_condition="Unique Loan ID per tape record",
                    status="OPEN"
                ))

            # VAL-003: Duplicate borrower + original principal + origination date
            b_key = f"{loan.borrower_id}_{loan.original_principal}_{loan.origination_date}"
            if len(borrower_combo_counts.get(b_key, [])) > 1:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-003",
                    category="INTEGRITY",
                    severity="HIGH",
                    field_name="borrower_id",
                    error_message=f"Suspicious duplicate loan combination: Borrower {loan.borrower_id} has identical principal (${loan.original_principal:,.2f}) and origination date ({loan.origination_date}).",
                    actual_value=f"Borrower: {loan.borrower_id}, Principal: {loan.original_principal}, Orig: {loan.origination_date}",
                    expected_condition="Distinct borrower applications or differentiated origination parameters",
                    status="OPEN"
                ))

            # VAL-004: Invalid Date Formats
            orig_dt = parse_iso_date(loan.origination_date)
            mat_dt = parse_iso_date(loan.maturity_date)
            
            if loan.origination_date and not orig_dt:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-004",
                    category="FORMAT",
                    severity="HIGH",
                    field_name="origination_date",
                    error_message=f"Invalid date format for origination_date: '{loan.origination_date}'. Must be ISO-8601 YYYY-MM-DD.",
                    actual_value=str(loan.origination_date),
                    expected_condition="YYYY-MM-DD",
                    status="OPEN"
                ))
            if loan.maturity_date and not mat_dt:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-004",
                    category="FORMAT",
                    severity="HIGH",
                    field_name="maturity_date",
                    error_message=f"Invalid date value/format for maturity_date: '{loan.maturity_date}'. Must be valid calendar date in YYYY-MM-DD.",
                    actual_value=str(loan.maturity_date),
                    expected_condition="YYYY-MM-DD",
                    status="OPEN"
                ))

            # VAL-005: Maturity date before origination date
            if orig_dt and mat_dt and mat_dt <= orig_dt:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-005",
                    category="LOGIC",
                    severity="CRITICAL",
                    field_name="maturity_date",
                    error_message=f"Maturity date ({loan.maturity_date}) occurs before or on origination date ({loan.origination_date}).",
                    actual_value=f"Orig: {loan.origination_date} | Mat: {loan.maturity_date}",
                    expected_condition="maturity_date > origination_date",
                    status="OPEN"
                ))

            # VAL-006: Negative principal or current balance
            orig_p = loan.original_principal if loan.original_principal is not None else 0.0
            curr_b = loan.current_balance if loan.current_balance is not None else 0.0
            
            if orig_p < 0 or curr_b < 0:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-006",
                    category="FINANCIAL",
                    severity="CRITICAL",
                    field_name="original_principal" if orig_p < 0 else "current_balance",
                    error_message=f"Negative financial balance detected (Principal: ${orig_p:,.2f}, Balance: ${curr_b:,.2f}).",
                    actual_value=f"Principal: {orig_p}, Balance: {curr_b}",
                    expected_condition="Non-negative balances (>= 0.0)",
                    status="OPEN"
                ))

            # VAL-007: Current balance greater than original principal
            if orig_p > 0 and curr_b > orig_p:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-007",
                    category="FINANCIAL",
                    severity="HIGH",
                    field_name="current_balance",
                    error_message=f"Current balance (${curr_b:,.2f}) exceeds original principal (${orig_p:,.2f}) without negative amortization authorization.",
                    actual_value=f"Current: ${curr_b:,.2f} > Principal: ${orig_p:,.2f}",
                    expected_condition="current_balance <= original_principal",
                    status="OPEN"
                ))

            # VAL-008: Interest rate outside expected range
            ir = loan.interest_rate if loan.interest_rate is not None else 0.0
            if ir < 0.0 or ir > 36.0:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-008",
                    category="FINANCIAL",
                    severity="MEDIUM",
                    field_name="interest_rate",
                    error_message=f"Interest rate {ir:.2f}% is outside permissible regulatory bounds [0.0%, 36.0%].",
                    actual_value=f"{ir}%",
                    expected_condition="0.0% <= interest_rate <= 36.0%",
                    status="OPEN"
                ))

            # VAL-009: Payment status inconsistent with days past due
            p_status = (loan.payment_status or "").upper()
            dpd = loan.days_past_due or 0
            if p_status == "CURRENT" and dpd > 30:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-009",
                    category="CONSISTENCY",
                    severity="HIGH",
                    field_name="payment_status",
                    error_message=f"Payment status is marked 'CURRENT' but record reports {dpd} Days Past Due.",
                    actual_value=f"Status: {p_status}, DPD: {dpd}",
                    expected_condition="CURRENT status requires DPD <= 30",
                    status="OPEN"
                ))
            elif "DELINQUENT" in p_status and dpd == 0:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-009",
                    category="CONSISTENCY",
                    severity="HIGH",
                    field_name="days_past_due",
                    error_message=f"Payment status is marked '{p_status}' but Days Past Due is 0.",
                    actual_value=f"Status: {p_status}, DPD: {dpd}",
                    expected_condition="Delinquent status requires DPD > 0",
                    status="OPEN"
                ))

            # VAL-010: Required document status
            d_status = (loan.document_status or "").upper()
            if d_status in ["MISSING", "EXPIRED", "UNVERIFIED", ""]:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-010",
                    category="DOCUMENTATION",
                    severity="MEDIUM",
                    field_name="document_status",
                    error_message=f"Mandatory mortgage/loan documentation is {d_status or 'UNSPECIFIED'}.",
                    actual_value=d_status or "EMPTY",
                    expected_condition="document_status == 'VERIFIED' or 'AVAILABLE'",
                    status="OPEN"
                ))

            # VAL-011: Conflicting values between loan_tape and servicer_update
            if lid and lid in servicer_updates:
                su = servicer_updates[lid]
                diffs = []
                if su.current_balance is not None and abs(su.current_balance - curr_b) > 50.0:
                    diffs.append(f"Balance: Tape=${curr_b:,.2f} vs Servicer=${su.current_balance:,.2f}")
                if su.payment_status and su.payment_status != loan.payment_status:
                    diffs.append(f"Status: Tape='{loan.payment_status}' vs Servicer='{su.payment_status}'")
                
                if diffs:
                    loan_exceptions.append(ValidationException(
                        id=f"exc-{uuid.uuid4().hex[:12]}",
                        loan_id_ref=loan.id,
                        loan_id_code=lid,
                        rule_code="VAL-011",
                        category="RECONCILIATION",
                        severity="HIGH",
                        field_name="current_balance, payment_status",
                        error_message=f"Cross-source servicer conflict detected: {'; '.join(diffs)}.",
                        actual_value=f"Tape: Balance=${curr_b}, Status={loan.payment_status}",
                        expected_condition=f"Servicer Update: Balance=${su.current_balance}, Status={su.payment_status}",
                        status="OPEN"
                    ))

            # VAL-012: Stale records based on last_updated_at (> 180 days)
            if loan.last_updated_at:
                try:
                    dt_str = loan.last_updated_at.split()[0]
                    upd_date = datetime.datetime.strptime(dt_str, "%Y-%m-%d").date()
                    if (now_date - upd_date).days > 180:
                        loan_exceptions.append(ValidationException(
                            id=f"exc-{uuid.uuid4().hex[:12]}",
                            loan_id_ref=loan.id,
                            loan_id_code=lid,
                            rule_code="VAL-012",
                            category="FRESHNESS",
                            severity="LOW",
                            field_name="last_updated_at",
                            error_message=f"Stale loan record: Last updated on {loan.last_updated_at} ({(now_date - upd_date).days} days ago > 180 day SLA).",
                            actual_value=loan.last_updated_at,
                            expected_condition="last_updated_at within prior 180 days",
                            status="OPEN"
                        ))
                except Exception:
                    pass

            # VAL-013: Invalid US state codes
            st = (loan.borrower_state or "").strip().upper()
            if not st or st not in VALID_US_STATES:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-013",
                    category="FORMAT",
                    severity="MEDIUM",
                    field_name="borrower_state",
                    error_message=f"Invalid borrower US state code '{loan.borrower_state}'. Must be valid 2-letter postal abbreviation.",
                    actual_value=str(loan.borrower_state),
                    expected_condition="Valid 2-letter US State/Territory code (e.g. CA, NY, TX)",
                    status="OPEN"
                ))

            # VAL-014: Loans marked closed/paid off but showing positive balance
            if p_status in ["PAID_OFF", "CLOSED"] and curr_b > 0.0:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-014",
                    category="STATUS",
                    severity="HIGH",
                    field_name="current_balance",
                    error_message=f"Loan marked '{p_status}' but still carries a positive outstanding balance (${curr_b:,.2f}).",
                    actual_value=f"Status: {p_status}, Balance: ${curr_b:,.2f}",
                    expected_condition="current_balance == $0.00 when status is PAID_OFF or CLOSED",
                    status="OPEN"
                ))

            # Save exceptions and update loan status
            if loan_exceptions:
                flagged_loan_count += 1
                loan.status = "FLAGGED"
                for exc in loan_exceptions:
                    db.add(exc)
                    total_exceptions += 1
            else:
                if loan.status != "VERIFIED":
                    loan.status = "PENDING"

        db.commit()

        # Audit event for validation execution
        AuditService.log_event(
            db=db,
            event_type="VALIDATION_RUN",
            actor_id="system",
            actor_role="VALIDATION_ENGINE",
            summary=f"Validation Engine executed 14 rules across {len(loans)} loans. Flagged {flagged_loan_count} loans with {total_exceptions} exceptions.",
            metadata_json={"total_loans": len(loans), "flagged_loans": flagged_loan_count, "exceptions_raised": total_exceptions}
        )

        return {
            "total_loans": len(loans),
            "flagged_loans": flagged_loan_count,
            "exceptions_raised": total_exceptions,
            "pass_rate_pct": round((1.0 - (flagged_loan_count / max(1, len(loans)))) * 100.0, 2)
        }
