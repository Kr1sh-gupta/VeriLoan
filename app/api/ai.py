from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ValidationException
from app.schemas import (
    AIExplainRequest, AIExplainResponse,
    AIBatchSummaryRequest, AIBatchSummaryResponse,
    AIRuleGenRequest, AIRuleGenResponse
)
from app.services.ai_service import AIService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/ai", tags=["AI Copilot"])

@router.post("/explain", response_model=AIExplainResponse)
def explain_exception(payload: AIExplainRequest, db: Session = Depends(get_db)):
    exc = db.query(ValidationException).filter(ValidationException.id == payload.exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found.")

    res = AIService.generate_explanation(
        db=db,
        exception=exc,
        custom_instruction=payload.custom_instruction
    )

    # Log AI suggestion audit event
    AuditService.log_event(
        db=db,
        event_type="AI_SUGGESTION_GENERATED",
        actor_id="ai_copilot",
        actor_role="AI_ASSISTANT",
        summary=f"AI Copilot ({res['model']}) generated analysis for exception {exc.rule_code} on Loan {exc.loan_id_code} with {int(res['confidence']*100)}% confidence.",
        loan_id=exc.loan_id_code,
        metadata_json={
            "exception_id": exc.id,
            "rule_code": exc.rule_code,
            "model": res["model"],
            "confidence": res["confidence"],
            "suggested_patch": res["suggested_patch"],
            "prompt": res["prompt"]
        }
    )

    return AIExplainResponse(
        exception_id=exc.id,
        explanation=res["explanation"],
        suggested_patch=res["suggested_patch"],
        confidence=res["confidence"],
        model=res["model"],
        prompt=res["prompt"],
        timestamp=res["timestamp"]
    )

@router.post("/batch-summary", response_model=AIBatchSummaryResponse)
def batch_summary_exceptions(payload: AIBatchSummaryRequest, db: Session = Depends(get_db)):
    res = AIService.generate_batch_summary(
        db=db,
        severity=payload.severity,
        rule_code=payload.rule_code,
        status=payload.status
    )
    return AIBatchSummaryResponse(**res)

@router.post("/generate-rule", response_model=AIRuleGenResponse)
def generate_rule_from_text(payload: AIRuleGenRequest, db: Session = Depends(get_db)):
    if not payload.natural_language_description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty.")
    res = AIService.generate_rule_from_text(payload.natural_language_description)

    # Log RULE_CREATED audit event
    AuditService.log_event(
        db=db,
        event_type="RULE_CREATED",
        actor_id="ai_rule_synthesizer",
        actor_role="SYSTEM",
        summary=f"Synthesized new validation rule {res.get('rule_code', 'CUSTOM_RULE')} from natural language prompt.",
        metadata_json={
            "rule_code": res.get("rule_code"),
            "category": res.get("category"),
            "severity": res.get("severity"),
            "description": payload.natural_language_description,
            "python_expression": res.get("python_expression")
        }
    )

    return AIRuleGenResponse(**res)
