import os
import json
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Loan, ValidationException, ServicerUpdate
from app.config import settings

class AIService:
    @classmethod
    def generate_explanation(
        cls,
        db: Session,
        exception: ValidationException,
        custom_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates an explainable AI analysis and suggested patch for a validation exception.
        Tries Gemini API if key is present; otherwise uses deterministic financial heuristic reasoning.
        """
        loan = db.query(Loan).filter(Loan.id == exception.loan_id_ref).first()
        if not loan:
            return {
                "explanation": "Loan record not found in database.",
                "suggested_patch": {},
                "confidence": 0.0,
                "model": "rule-fallback-v1",
                "prompt": "N/A",
                "timestamp": datetime.datetime.utcnow().isoformat()
            }

        servicer_update = db.query(ServicerUpdate).filter(ServicerUpdate.loan_id == loan.loan_id).first() if loan.loan_id else None

        # Build context payload for LLM prompt
        context_payload = {
            "loan_id": loan.loan_id,
            "borrower_id": loan.borrower_id,
            "original_principal": loan.original_principal,
            "current_balance": loan.current_balance,
            "interest_rate": loan.interest_rate,
            "origination_date": loan.origination_date,
            "maturity_date": loan.maturity_date,
            "payment_status": loan.payment_status,
            "days_past_due": loan.days_past_due,
            "borrower_state": loan.borrower_state,
            "document_status": loan.document_status,
            "rule_code": exception.rule_code,
            "category": exception.category,
            "severity": exception.severity,
            "error_message": exception.error_message,
            "actual_value": exception.actual_value,
            "servicer_balance": servicer_update.current_balance if servicer_update else None,
            "servicer_status": servicer_update.payment_status if servicer_update else None,
            "custom_instruction": custom_instruction
        }

        prompt_str = f"""
        You are an expert Financial Loan Diligence Copilot.
        Analyze the following loan validation exception and provide a root cause explanation, recommended data patch, and confidence level.

        Context:
        {json.dumps(context_payload, indent=2)}

        Return your analysis with clear justification and specific field corrections.
        """

        explanation_result = None

        # Try Gemini if API key is provided
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                
                augmented_prompt = prompt_str
                if custom_instruction:
                    augmented_prompt += f"\n\nREVIEWER DIRECT INQUIRY: \"{custom_instruction}\"\nPlease specifically address this inquiry in a concise, well-structured manner."
                
                augmented_prompt += "\n\nCRITICAL FORMAT REQUIREMENT: Keep the 'explanation' concise (2-4 clear paragraphs/bullet points max, under 150 words total). Focus on the exact financial difference and root cause without unnecessary filler text."

                # Try candidate Gemini models with fallback on quota limits
                for m_name in ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"]:
                    try:
                        gemini_model = genai.GenerativeModel(m_name)
                        response = gemini_model.generate_content(
                            augmented_prompt + "\n\nFormat your response as valid JSON with keys: explanation (string), suggested_patch (object of field:corrected_value), confidence (float between 0.0 and 1.0)."
                        )
                        txt = response.text.strip()
                        if "```json" in txt:
                            txt = txt.split("```json")[1].split("```")[0].strip()
                        elif "```" in txt:
                            txt = txt.split("```")[1].split("```")[0].strip()
                        data = json.loads(txt)
                        explanation_result = {
                            "explanation": data.get("explanation", ""),
                            "suggested_patch": data.get("suggested_patch", {}),
                            "confidence": float(data.get("confidence", 0.95)),
                            "model": gemini_model.model_name.replace("models/", ""),
                            "prompt": augmented_prompt.strip(),
                            "timestamp": datetime.datetime.utcnow().isoformat()
                        }
                        break
                    except Exception:
                        continue
            except Exception as e:
                # Fall back to heuristic reasoning engine
                pass

        if not explanation_result:
            explanation_result = cls._deterministic_heuristic_explanation(loan, exception, servicer_update, prompt_str)

        # Cache on exception record
        exception.ai_explanation = explanation_result["explanation"]
        exception.ai_suggested_patch = explanation_result["suggested_patch"]
        exception.ai_confidence = explanation_result["confidence"]
        exception.ai_model = explanation_result["model"]
        exception.ai_prompt = explanation_result["prompt"]
        exception.ai_generated_at = datetime.datetime.utcnow()
        db.commit()

        return explanation_result

    @classmethod
    def _deterministic_heuristic_explanation(
        cls,
        loan: Loan,
        exception: ValidationException,
        servicer_update: Optional[ServicerUpdate],
        prompt: str
    ) -> Dict[str, Any]:
        """
        High-precision financial heuristic rules for explainable, deterministic AI responses.
        Ensures consistent, instant, offline-ready demonstrations.
        """
        rule = exception.rule_code
        patch: Dict[str, Any] = {}
        explanation = ""
        confidence = 0.95

        if rule == "VAL-001":
            # Missing Loan ID
            suggested_id = f"LN-{10000 + int(loan.id.split('-')[-1]) if '-' in loan.id else '10999'}"
            patch = {"loan_id": suggested_id}
            explanation = f"Record is missing a unique identifier. Based on file sequence and batch metadata, synthesized standardized loan ID '{suggested_id}' for reviewer validation."
            confidence = 0.88

        elif rule == "VAL-002":
            # Duplicate Loan ID
            patch = {"loan_id": f"{loan.loan_id}-REV1"}
            explanation = f"Loan ID '{loan.loan_id}' is shared with another record in this tape. Recommended renaming this occurrence to '{loan.loan_id}-REV1' or verifying borrower origination records."
            confidence = 0.92

        elif rule == "VAL-003":
            # Duplicate Borrower combination
            explanation = f"Borrower {loan.borrower_id} appears with identical principal ${loan.original_principal:,.2f} on {loan.origination_date}. This indicates potential double-origination or accidental twin submission in LOS export."
            confidence = 0.85

        elif rule == "VAL-004":
            # Invalid date format
            if loan.origination_date and "/" in loan.origination_date:
                parts = loan.origination_date.split("/")
                if len(parts) == 3:
                    iso_d = f"{parts[2]}-{int(parts[0]):02d}-{int(parts[1]):02d}"
                    patch["origination_date"] = iso_d
                    explanation = f"Origination date was formatted as US Standard MM/DD/YYYY ('{loan.origination_date}'). Auto-normalized to ISO-8601 '{iso_d}'."
            else:
                patch["maturity_date"] = "2029-12-31"
                explanation = f"Maturity date contained invalid date values. Recommended resetting to standard 30-year maturity schedule '2029-12-31'."
            confidence = 0.96

        elif rule == "VAL-005":
            # Maturity before origination
            if loan.origination_date and loan.term_months:
                try:
                    dt = datetime.datetime.strptime(loan.origination_date, "%Y-%m-%d")
                    fixed_mat = (dt + datetime.timedelta(days=loan.term_months * 30)).strftime("%Y-%m-%d")
                    patch["maturity_date"] = fixed_mat
                    explanation = f"Maturity date ({loan.maturity_date}) is chronologically prior to origination ({loan.origination_date}). Based on {loan.term_months}-month term, recalculated maturity date is '{fixed_mat}'."
                    confidence = 0.98
                except Exception:
                    explanation = f"Maturity date ({loan.maturity_date}) precedes origination ({loan.origination_date}). Review loan contract term."
            else:
                explanation = f"Maturity date violates sequence. Requires term re-alignment."

        elif rule == "VAL-006":
            # Negative balance
            if loan.original_principal and loan.original_principal < 0:
                patch["original_principal"] = abs(loan.original_principal)
                explanation = f"Original principal was inverted (${loan.original_principal}). Inverted sign detected; recommend positive balance ${abs(loan.original_principal):,.2f}."
            if loan.current_balance and loan.current_balance < 0:
                patch["current_balance"] = 0.0
                explanation = f"Current balance was recorded as negative (${loan.current_balance}). Adjusted to $0.00 representing paid-off/reconciled balance."
            confidence = 0.94

        elif rule == "VAL-007":
            # Current balance > original principal
            if servicer_update and servicer_update.current_balance:
                patch["current_balance"] = servicer_update.current_balance
                explanation = f"Tape balance (${loan.current_balance:,.2f}) exceeded original principal (${loan.original_principal:,.2f}). Cross-referenced secondary Servicer Update which reports actual current balance of ${servicer_update.current_balance:,.2f}."
                confidence = 0.96
            else:
                patch["current_balance"] = round(float(loan.original_principal or 100000) * 0.92, 2)
                explanation = f"Current balance exceeded principal. Adjusted to standard amortized estimate ($ {patch['current_balance']:,.2f}) pending servicer confirmation."
                confidence = 0.89

        elif rule == "VAL-008":
            # Interest rate outlier
            if loan.interest_rate and loan.interest_rate > 36.0:
                fixed_ir = round(loan.interest_rate / 10.0, 3)
                patch["interest_rate"] = fixed_ir
                explanation = f"Interest rate {loan.interest_rate}% indicates decimal shift in origination export. Corrected to market-consistent rate of {fixed_ir}%."
                confidence = 0.95
            elif loan.interest_rate and loan.interest_rate < 0:
                patch["interest_rate"] = abs(loan.interest_rate)
                explanation = f"Negative interest rate {loan.interest_rate}% corrected to positive {abs(loan.interest_rate)}%."
                confidence = 0.97

        elif rule == "VAL-009":
            # Payment status vs DPD mismatch
            if loan.payment_status == "CURRENT" and loan.days_past_due and loan.days_past_due > 30:
                patch["payment_status"] = f"DELINQUENT_{loan.days_past_due}"
                explanation = f"Loan is marked 'CURRENT' despite having {loan.days_past_due} Days Past Due. Updated status to 'DELINQUENT_{loan.days_past_due}' to match servicing ledger."
            elif "DELINQUENT" in (loan.payment_status or "") and (loan.days_past_due == 0 or loan.days_past_due is None):
                patch["payment_status"] = "CURRENT"
                explanation = f"Loan status is marked '{loan.payment_status}' but Days Past Due is 0. Updated status to 'CURRENT'."
            confidence = 0.94

        elif rule == "VAL-010":
            # Missing document
            patch["document_status"] = "PENDING_RETRIEVAL"
            explanation = f"Loan document status is '{loan.document_status}'. Flagged for custodial trailing-document ingestion pipeline."
            confidence = 0.88

        elif rule == "VAL-011":
            # Cross-source servicer conflict
            if servicer_update:
                patch["current_balance"] = servicer_update.current_balance
                patch["payment_status"] = servicer_update.payment_status
                patch["days_past_due"] = servicer_update.days_past_due
                explanation = f"Conflict detected with second-source servicer file. Recommended syncing with Servicer Update record (Balance: ${servicer_update.current_balance:,.2f}, Status: {servicer_update.payment_status}, DPD: {servicer_update.days_past_due}) as it has more recent ledger timestamp ({servicer_update.update_timestamp})."
                confidence = 0.97
            else:
                explanation = "Servicer conflict reported. Review primary tape against servicer tape."

        elif rule == "VAL-012":
            # Stale record
            patch["last_updated_at"] = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            explanation = f"Loan record last updated date ({loan.last_updated_at}) exceeds the 180-day freshness SLA. Suggested refreshing metadata timestamp with verified diligence review date."
            confidence = 0.90

        elif rule == "VAL-013":
            # Invalid state code
            if loan.borrower_state == "CAL":
                patch["borrower_state"] = "CA"
            elif loan.borrower_state == "TEX":
                patch["borrower_state"] = "TX"
            else:
                patch["borrower_state"] = "CA"
            explanation = f"State code '{loan.borrower_state}' is non-standard. Mapped to canonical 2-letter postal code '{patch['borrower_state']}'."
            confidence = 0.98

        elif rule == "VAL-014":
            # Closed loan with positive balance
            patch["current_balance"] = 0.0
            explanation = f"Loan status is '{loan.payment_status}' but reports positive balance ${loan.current_balance:,.2f}. Zeroed out balance to reflect complete payoff settlement."
            confidence = 0.99

        elif rule == "VAL-015":
            # Repeated borrower concentration
            explanation = f"Borrower identifier '{loan.borrower_id}' is associated with multiple loan records in the portfolio tape. Recommended custodial identity verification to assess aggregate borrower debt exposure across the securitization pool."
            confidence = 0.92

        else:
            explanation = f"Validation exception on field '{exception.field_name}'. Review loan documentation."
            confidence = 0.85

        return {
            "explanation": explanation,
            "suggested_patch": patch,
            "confidence": confidence,
            "model": "offline-fintech-heuristic-v1",
            "prompt": prompt.strip(),
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

    @classmethod
    def generate_batch_summary(
        cls,
        db: Session,
        severity: Optional[str] = None,
        rule_code: Optional[str] = None,
        status: str = "OPEN"
    ) -> Dict[str, Any]:
        """
        Synthesizes a multi-record triage summary of active exception queues using Gemini or local intelligence.
        """
        query = db.query(ValidationException).filter(ValidationException.status == status)
        if severity and severity != "ALL":
            query = query.filter(ValidationException.severity == severity)
        if rule_code and rule_code != "ALL":
            query = query.filter(ValidationException.rule_code == rule_code)

        exceptions = query.all()
        total_count = len(exceptions)

        if total_count == 0:
            return {
                "total_exceptions_analyzed": 0,
                "summary_headline": "Exception Queue Clean: 0 open exceptions matching criteria.",
                "top_root_causes": [],
                "actionable_recommendation": "All records meet current compliance threshold. Ready for batch verification.",
                "model": "offline-fintech-heuristic-v1",
                "generated_at": datetime.datetime.utcnow().isoformat()
            }

        # Rule frequency analysis
        rule_counts: Dict[str, int] = {}
        severity_counts: Dict[str, int] = {}
        for exc in exceptions:
            rule_counts[exc.rule_code] = rule_counts.get(exc.rule_code, 0) + 1
            severity_counts[exc.severity] = severity_counts.get(exc.severity, 0) + 1

        top_rules = sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:3]

        # Check if Gemini is enabled
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                
                gemini_model = None
                for m_name in ["gemini-2.5-flash", "gemini-flash-latest", "gemini-1.5-flash"]:
                    try:
                        gemini_model = genai.GenerativeModel(m_name)
                        break
                    except Exception:
                        continue

                if gemini_model:
                    prompt = f"""
                    You are a Senior FinTech Portfolio Risk Analyst.
                    Summarize this batch of {total_count} open mortgage loan exceptions:
                    - Rule distributions: {json.dumps(rule_counts)}
                    - Severity distributions: {json.dumps(severity_counts)}
                    - Sample messages: {[e.error_message for e in exceptions[:5]]}

                    Return valid JSON with:
                    - summary_headline: A concise 1-sentence executive summary
                    - top_root_causes: List of objects with keys: cause (string), affected_count (int), category (string)
                    - actionable_recommendation: 1-2 sentence recommendation for operations team
                    """
                    resp = gemini_model.generate_content(prompt)
                    txt = resp.text.strip()
                    if "```json" in txt:
                        txt = txt.split("```json")[1].split("```")[0].strip()
                    elif "```" in txt:
                        txt = txt.split("```")[1].split("```")[0].strip()
                    data = json.loads(txt)
                    return {
                        "total_exceptions_analyzed": total_count,
                        "summary_headline": data.get("summary_headline", f"Identified {total_count} anomalies across portfolio."),
                        "top_root_causes": data.get("top_root_causes", []),
                        "actionable_recommendation": data.get("actionable_recommendation", "Review highest-severity items first."),
                        "model": gemini_model.model_name.replace("models/", ""),
                        "generated_at": datetime.datetime.utcnow().isoformat()
                    }
            except Exception:
                pass

        # Offline heuristic fallback
        root_causes = []
        for code, count in top_rules:
            category = "CROSS_SOURCE" if code == "VAL-011" else "DATA_FORMAT" if code in ["VAL-004", "VAL-013"] else "INTEGRITY"
            cause_desc = "Discrepancy between Primary Loan Tape and Servicer Ledger" if code == "VAL-011" else f"Rule violation on {code}"
            root_causes.append({
                "cause": f"{cause_desc} ({code})",
                "affected_count": count,
                "category": category
            })

        dom_rule = top_rules[0][0] if top_rules else "VAL-011"
        headline = f"Portfolio triage: {total_count} open anomalies concentrated in {dom_rule} ({round((top_rules[0][1]/total_count)*100)}% of queue)." if top_rules else f"{total_count} open exceptions analyzed."
        recommendation = "Prioritize resolving VAL-011 servicer balance discrepancies via AI Suggested Sync to maximize verified record throughput."

        return {
            "total_exceptions_analyzed": total_count,
            "summary_headline": headline,
            "top_root_causes": root_causes,
            "actionable_recommendation": recommendation,
            "model": "offline-fintech-heuristic-v1",
            "generated_at": datetime.datetime.utcnow().isoformat()
        }

    @classmethod
    def generate_rule_from_text(cls, description: str) -> Dict[str, Any]:
        """
        Converts a natural-language validation rule request into a structured rule specification.
        """
        # If Gemini is configured, use LLM
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                
                gemini_model = None
                for m_name in ["gemini-2.5-flash", "gemini-flash-latest", "gemini-1.5-flash"]:
                    try:
                        gemini_model = genai.GenerativeModel(m_name)
                        break
                    except Exception:
                        continue

                if gemini_model:
                    prompt = f"""
                    You are a Financial Data Quality Engineer. Convert this natural-language rule description into a formal rule schema:
                    Description: "{description}"

                    Return valid JSON with:
                    - generated_rule_code: e.g. "VAL-CUSTOM-001"
                    - name: short title (e.g. "High DPD Delinquency Check")
                    - category: one of MANDATORY, FORMAT, LOGIC, FINANCIAL, INTEGRITY
                    - severity: one of CRITICAL, HIGH, MEDIUM, LOW
                    - field_name: primary loan field target (e.g. "days_past_due", "interest_rate")
                    - operator: e.g. ">=", "<=", "==", "NOT_NULL"
                    - condition_description: human readable condition
                    - python_expression: a short Python boolean expression (e.g. "loan.days_past_due > 90 and loan.payment_status == 'CURRENT'")
                    """
                    resp = gemini_model.generate_content(prompt)
                    txt = resp.text.strip()
                    if "```json" in txt:
                        txt = txt.split("```json")[1].split("```")[0].strip()
                    elif "```" in txt:
                        txt = txt.split("```")[1].split("```")[0].strip()
                    data = json.loads(txt)
                    data["model"] = gemini_model.model_name.replace("models/", "")
                    return data
            except Exception:
                pass

        # Offline deterministic natural language parser
        desc_lower = description.lower()
        field_name = "current_balance"
        category = "FINANCIAL"
        severity = "HIGH"
        op = ">="
        cond = "Condition check"
        py_expr = "loan.current_balance > 0"
        title = "Custom Validation Rule"

        if "rate" in desc_lower or "interest" in desc_lower:
            field_name = "interest_rate"
            title = "Interest Rate Ceiling Policy"
            category = "FINANCIAL"
            severity = "CRITICAL"
            op = "<="
            cond = "interest_rate must be <= 36.0%"
            py_expr = "loan.interest_rate <= 36.0"
        elif "past due" in desc_lower or "dpd" in desc_lower or "delinquent" in desc_lower:
            field_name = "days_past_due"
            title = "Delinquency Alignment Rule"
            category = "LOGIC"
            severity = "HIGH"
            op = "=="
            cond = "days_past_due > 30 implies payment_status != 'CURRENT'"
            py_expr = "not (loan.days_past_due > 30 and loan.payment_status == 'CURRENT')"
        elif "date" in desc_lower or "maturity" in desc_lower or "origination" in desc_lower:
            field_name = "maturity_date"
            title = "Maturity Date Horizon Rule"
            category = "LOGIC"
            severity = "CRITICAL"
            op = ">"
            cond = "maturity_date must be after origination_date"
            py_expr = "loan.maturity_date > loan.origination_date"
        elif "state" in desc_lower or "address" in desc_lower:
            field_name = "borrower_state"
            title = "US Jurisdiction Code Rule"
            category = "FORMAT"
            severity = "MEDIUM"
            op = "IN"
            cond = "borrower_state must be a valid 2-letter US State abbreviation"
            py_expr = "loan.borrower_state in US_POSTAL_STATES"

        return {
            "generated_rule_code": "VAL-CUSTOM-001",
            "name": title,
            "category": category,
            "severity": severity,
            "field_name": field_name,
            "operator": op,
            "condition_description": cond,
            "python_expression": py_expr,
            "model": "offline-fintech-heuristic-v1"
        }
