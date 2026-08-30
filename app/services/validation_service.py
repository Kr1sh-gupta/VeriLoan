import re
import os
import json
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

def load_rules_config() -> Dict[str, Dict[str, Any]]:
    """
    Dynamically loads rule definitions, enabled status, and threshold parameters from validation_rules.json.
    Searches multiple potential workspace paths with robust fallback.
    """
    candidate_paths = [
        os.path.join(os.path.dirname(__file__), "../../../main/data/validation_rules.json"),
        os.path.join(os.path.dirname(__file__), "../../../data/validation_rules.json"),
        os.path.join(os.path.dirname(__file__), "../../data/validation_rules.json"),
        os.path.abspath(os.path.join(os.getcwd(), "data/validation_rules.json")),
        os.path.abspath(os.path.join(os.getcwd(), "main/data/validation_rules.json")),
        os.path.abspath(os.path.join(os.getcwd(), "../main/data/validation_rules.json")),
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    rules_list = data.get("rules", [])
                    return {r.get("code"): r for r in rules_list if "code" in r}
            except Exception as e:
                print(f"[WARN] Error loading validation rules from {p}: {e}")
    return {}

class ValidationService:
    @classmethod
    def run_all_validations(cls, db: Session, batch_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes complete 15-rule validation engine against all pending or batch loans.
        Dynamically loads thresholds and parameter limits from validation_rules.json.
        Populates validation_exceptions and updates loan statuses.
        """
        rules_cfg = load_rules_config()

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
        borrower_id_counts: Dict[str, int] = {}
        
        for loan in loans:
            lid = (loan.loan_id or "").strip()
            if lid:
                loan_id_counts.setdefault(lid, []).append(loan)
            
            if loan.borrower_id and str(loan.borrower_id).strip():
                bid = str(loan.borrower_id).strip()
                borrower_id_counts[bid] = borrower_id_counts.get(bid, 0) + 1

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
            r1 = rules_cfg.get("VAL-001", {})
            if r1.get("enabled", True) and not lid:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code="UNKNOWN",
                    rule_code="VAL-001",
                    category=r1.get("category", "MANDATORY"),
                    severity=r1.get("severity", "CRITICAL"),
                    field_name="loan_id",
                    error_message=r1.get("description", "Missing Loan ID. Record contains empty or null identifier."),
                    actual_value=str(loan.loan_id),
                    expected_condition="Non-empty unique string (e.g. LN-XXXXX)",
                    status="OPEN"
                ))

            # VAL-002: Duplicate Loan ID across dataset
            r2 = rules_cfg.get("VAL-002", {})
            if r2.get("enabled", True) and lid and len(loan_id_counts.get(lid, [])) > 1:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-002",
                    category=r2.get("category", "INTEGRITY"),
                    severity=r2.get("severity", "CRITICAL"),
                    field_name="loan_id",
                    error_message=f"Duplicate Loan ID '{lid}' detected across {len(loan_id_counts[lid])} records in portfolio.",
                    actual_value=lid,
                    expected_condition="Unique Loan ID per tape record",
                    status="OPEN"
                ))

            # VAL-003: Duplicate borrower + original principal + origination date
            r3 = rules_cfg.get("VAL-003", {})
            b_key = f"{loan.borrower_id}_{loan.original_principal}_{loan.origination_date}"
            if r3.get("enabled", True) and len(borrower_combo_counts.get(b_key, [])) > 1:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-003",
                    category=r3.get("category", "INTEGRITY"),
                    severity=r3.get("severity", "HIGH"),
                    field_name="borrower_id",
                    error_message=f"Suspicious duplicate loan combination: Borrower {loan.borrower_id} has identical principal (${loan.original_principal:,.2f}) and origination date ({loan.origination_date}).",
                    actual_value=f"Borrower: {loan.borrower_id}, Principal: {loan.original_principal}, Orig: {loan.origination_date}",
                    expected_condition="Distinct borrower applications or differentiated origination parameters",
                    status="OPEN"
                ))

            # VAL-004: Invalid Date Formats
            r4 = rules_cfg.get("VAL-004", {})
            orig_dt = parse_iso_date(loan.origination_date)
            mat_dt = parse_iso_date(loan.maturity_date)
            
            if r4.get("enabled", True):
                if loan.origination_date and not orig_dt:
                    loan_exceptions.append(ValidationException(
                        id=f"exc-{uuid.uuid4().hex[:12]}",
                        loan_id_ref=loan.id,
                        loan_id_code=lid,
                        rule_code="VAL-004",
                        category=r4.get("category", "FORMAT"),
                        severity=r4.get("severity", "HIGH"),
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
                        category=r4.get("category", "FORMAT"),
                        severity=r4.get("severity", "HIGH"),
                        field_name="maturity_date",
                        error_message=f"Invalid date value/format for maturity_date: '{loan.maturity_date}'. Must be valid calendar date in YYYY-MM-DD.",
                        actual_value=str(loan.maturity_date),
                        expected_condition="YYYY-MM-DD",
                        status="OPEN"
                    ))

            # VAL-005: Maturity date before origination date
            r5 = rules_cfg.get("VAL-005", {})
            if r5.get("enabled", True) and orig_dt and mat_dt and mat_dt <= orig_dt:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-005",
                    category=r5.get("category", "LOGIC"),
                    severity=r5.get("severity", "CRITICAL"),
                    field_name="maturity_date",
                    error_message=f"Maturity date ({loan.maturity_date}) occurs before or on origination date ({loan.origination_date}).",
                    actual_value=f"Orig: {loan.origination_date} | Mat: {loan.maturity_date}",
                    expected_condition="maturity_date > origination_date",
                    status="OPEN"
                ))

            # VAL-006: Negative principal or current balance
            r6 = rules_cfg.get("VAL-006", {})
            orig_p = loan.original_principal if loan.original_principal is not None else 0.0
            curr_b = loan.current_balance if loan.current_balance is not None else 0.0
            allow_neg = r6.get("allow_negative", False)
            
            if r6.get("enabled", True) and not allow_neg and (orig_p < 0 or curr_b < 0):
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-006",
                    category=r6.get("category", "FINANCIAL"),
                    severity=r6.get("severity", "CRITICAL"),
                    field_name="original_principal" if orig_p < 0 else "current_balance",
                    error_message=f"Negative financial balance detected (Principal: ${orig_p:,.2f}, Balance: ${curr_b:,.2f}).",
                    actual_value=f"Principal: {orig_p}, Balance: {curr_b}",
                    expected_condition="Non-negative balances (>= 0.0)",
                    status="OPEN"
                ))

            # VAL-007: Current balance greater than original principal
            r7 = rules_cfg.get("VAL-007", {})
            allow_exceeds = r7.get("allow_exceeds_principal", False)
            if r7.get("enabled", True) and not allow_exceeds and orig_p > 0 and curr_b > orig_p:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-007",
                    category=r7.get("category", "FINANCIAL"),
                    severity=r7.get("severity", "HIGH"),
                    field_name="current_balance",
                    error_message=f"Current balance (${curr_b:,.2f}) exceeds original principal (${orig_p:,.2f}) without negative amortization authorization.",
                    actual_value=f"Current: ${curr_b:,.2f} > Principal: ${orig_p:,.2f}",
                    expected_condition="current_balance <= original_principal",
                    status="OPEN"
                ))

            # VAL-008: Interest rate outside expected range (Dynamic thresholds)
            r8 = rules_cfg.get("VAL-008", {})
            min_ir = float(r8.get("min_value", 0.0))
            max_ir = float(r8.get("max_value", 36.0))
            ir = loan.interest_rate if loan.interest_rate is not None else 0.0
            if r8.get("enabled", True) and (ir < min_ir or ir > max_ir):
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-008",
                    category=r8.get("category", "FINANCIAL"),
                    severity=r8.get("severity", "MEDIUM"),
                    field_name="interest_rate",
                    error_message=f"Interest rate {ir:.2f}% is outside permissible regulatory bounds [{min_ir:.1f}%, {max_ir:.1f}%].",
                    actual_value=f"{ir}%",
                    expected_condition=f"{min_ir:.1f}% <= interest_rate <= {max_ir:.1f}%",
                    status="OPEN"
                ))

            # VAL-009: Payment status inconsistent with days past due
            r9 = rules_cfg.get("VAL-009", {})
            max_curr_dpd = int(r9.get("current_max_dpd", 30))
            p_status = (loan.payment_status or "").upper()
            dpd = loan.days_past_due or 0
            if r9.get("enabled", True):
                if p_status == "CURRENT" and dpd > max_curr_dpd:
                    loan_exceptions.append(ValidationException(
                        id=f"exc-{uuid.uuid4().hex[:12]}",
                        loan_id_ref=loan.id,
                        loan_id_code=lid,
                        rule_code="VAL-009",
                        category=r9.get("category", "CONSISTENCY"),
                        severity=r9.get("severity", "HIGH"),
                        field_name="payment_status",
                        error_message=f"Payment status is marked 'CURRENT' but record reports {dpd} Days Past Due (> {max_curr_dpd} threshold).",
                        actual_value=f"Status: {p_status}, DPD: {dpd}",
                        expected_condition=f"CURRENT status requires DPD <= {max_curr_dpd}",
                        status="OPEN"
                    ))
                elif "DELINQUENT" in p_status and dpd == 0:
                    loan_exceptions.append(ValidationException(
                        id=f"exc-{uuid.uuid4().hex[:12]}",
                        loan_id_ref=loan.id,
                        loan_id_code=lid,
                        rule_code="VAL-009",
                        category=r9.get("category", "CONSISTENCY"),
                        severity=r9.get("severity", "HIGH"),
                        field_name="days_past_due",
                        error_message=f"Payment status is marked '{p_status}' but Days Past Due is 0.",
                        actual_value=f"Status: {p_status}, DPD: {dpd}",
                        expected_condition="Delinquent status requires DPD > 0",
                        status="OPEN"
                    ))

            # VAL-010: Required document status
            r10 = rules_cfg.get("VAL-010", {})
            disallowed_doc = r10.get("disallowed_statuses", ["MISSING", "EXPIRED", "UNVERIFIED", ""])
            d_status = (loan.document_status or "").upper()
            if r10.get("enabled", True) and (d_status in disallowed_doc or d_status == ""):
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-010",
                    category=r10.get("category", "DOCUMENTATION"),
                    severity=r10.get("severity", "MEDIUM"),
                    field_name="document_status",
                    error_message=f"Mandatory mortgage/loan documentation is {d_status or 'UNSPECIFIED'}.",
                    actual_value=d_status or "EMPTY",
                    expected_condition="document_status == 'VERIFIED' or 'AVAILABLE'",
                    status="OPEN"
                ))

            # VAL-011: Conflicting values between loan_tape and servicer_update
            r11 = rules_cfg.get("VAL-011", {})
            bal_tol = float(r11.get("balance_diff_threshold", 50.0))
            if r11.get("enabled", True) and lid and lid in servicer_updates:
                su = servicer_updates[lid]
                diffs = []
                if su.current_balance is not None and abs(su.current_balance - curr_b) > bal_tol:
                    diffs.append(f"Balance: Tape=${curr_b:,.2f} vs Servicer=${su.current_balance:,.2f}")
                if su.payment_status and su.payment_status != loan.payment_status:
                    diffs.append(f"Status: Tape='{loan.payment_status}' vs Servicer='{su.payment_status}'")
                
                if diffs:
                    loan_exceptions.append(ValidationException(
                        id=f"exc-{uuid.uuid4().hex[:12]}",
                        loan_id_ref=loan.id,
                        loan_id_code=lid,
                        rule_code="VAL-011",
                        category=r11.get("category", "RECONCILIATION"),
                        severity=r11.get("severity", "HIGH"),
                        field_name="current_balance, payment_status",
                        error_message=f"Cross-source servicer conflict detected: {'; '.join(diffs)}.",
                        actual_value=f"Tape: Balance=${curr_b}, Status={loan.payment_status}",
                        expected_condition=f"Servicer Update: Balance=${su.current_balance}, Status={su.payment_status}",
                        status="OPEN"
                    ))

            # VAL-012: Stale records based on last_updated_at (> SLA days)
            r12 = rules_cfg.get("VAL-012", {})
            max_age = int(r12.get("max_age_days", 180))
            if r12.get("enabled", True) and loan.last_updated_at:
                try:
                    dt_str = loan.last_updated_at.split()[0]
                    upd_date = datetime.datetime.strptime(dt_str, "%Y-%m-%d").date()
                    if (now_date - upd_date).days > max_age:
                        loan_exceptions.append(ValidationException(
                            id=f"exc-{uuid.uuid4().hex[:12]}",
                            loan_id_ref=loan.id,
                            loan_id_code=lid,
                            rule_code="VAL-012",
                            category=r12.get("category", "FRESHNESS"),
                            severity=r12.get("severity", "LOW"),
                            field_name="last_updated_at",
                            error_message=f"Stale loan record: Last updated on {loan.last_updated_at} ({(now_date - upd_date).days} days ago > {max_age} day SLA).",
                            actual_value=loan.last_updated_at,
                            expected_condition=f"last_updated_at within prior {max_age} days",
                            status="OPEN"
                        ))
                except Exception:
                    pass

            # VAL-013: Invalid US state codes
            r13 = rules_cfg.get("VAL-013", {})
            st = (loan.borrower_state or "").strip().upper()
            if r13.get("enabled", True) and (not st or st not in VALID_US_STATES):
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-013",
                    category=r13.get("category", "FORMAT"),
                    severity=r13.get("severity", "MEDIUM"),
                    field_name="borrower_state",
                    error_message=f"Invalid borrower US state code '{loan.borrower_state}'. Must be valid 2-letter postal abbreviation.",
                    actual_value=str(loan.borrower_state),
                    expected_condition="Valid 2-letter US State/Territory code (e.g. CA, NY, TX)",
                    status="OPEN"
                ))

            # VAL-014: Loans marked closed/paid off but showing positive balance
            r14 = rules_cfg.get("VAL-014", {})
            if r14.get("enabled", True) and p_status in ["PAID_OFF", "CLOSED"] and curr_b > 0.0:
                loan_exceptions.append(ValidationException(
                    id=f"exc-{uuid.uuid4().hex[:12]}",
                    loan_id_ref=loan.id,
                    loan_id_code=lid,
                    rule_code="VAL-014",
                    category=r14.get("category", "STATUS"),
                    severity=r14.get("severity", "HIGH"),
                    field_name="current_balance",
                    error_message=f"Loan marked '{p_status}' but still carries a positive outstanding balance (${curr_b:,.2f}).",
                    actual_value=f"Status: {p_status}, Balance: ${curr_b:,.2f}",
                    expected_condition="current_balance == $0.00 when status is PAID_OFF or CLOSED",
                    status="OPEN"
                ))

            # VAL-015: Repeated borrower concentration risk
            r15 = rules_cfg.get("VAL-015", {})
            max_b_count = int(r15.get("max_loan_count", 3))
            if r15.get("enabled", True) and loan.borrower_id and str(loan.borrower_id).strip():
                bid = str(loan.borrower_id).strip()
                b_count = borrower_id_counts.get(bid, 0)
                if b_count >= max_b_count:
                    loan_exceptions.append(ValidationException(
                        id=f"exc-{uuid.uuid4().hex[:12]}",
                        loan_id_ref=loan.id,
                        loan_id_code=lid,
                        rule_code="VAL-015",
                        category=r15.get("category", "CONCENTRATION"),
                        severity=r15.get("severity", "MEDIUM"),
                        field_name="borrower_id",
                        error_message=f"Borrower '{bid}' appears across {b_count} distinct loan records — potential portfolio concentration risk (threshold: {max_b_count} loans).",
                        actual_value=f"{b_count} loans",
                        expected_condition=f"Each borrower should appear in < {max_b_count} distinct loan records",
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
            summary=f"Validation Engine executed 15 rules across {len(loans)} loans. Flagged {flagged_loan_count} loans with {total_exceptions} exceptions.",
            metadata_json={"total_loans": len(loans), "flagged_loans": flagged_loan_count, "exceptions_raised": total_exceptions}
        )

        return {
            "total_loans": len(loans),
            "flagged_loans": flagged_loan_count,
            "exceptions_raised": total_exceptions,
            "pass_rate_pct": round((1.0 - (flagged_loan_count / max(1, len(loans)))) * 100.0, 2)
        }
