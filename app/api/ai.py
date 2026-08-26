from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ValidationException
from app.schemas import AIExplainRequest, AIExplainResponse
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
