import uuid
import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import AuditEvent

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        event_type: str,
        actor_id: str,
        actor_role: str,
        summary: str,
        loan_id: Optional[str] = None,
        previous_state: Optional[Dict[str, Any]] = None,
        new_state: Optional[Dict[str, Any]] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        event = AuditEvent(
            id=f"aud-{uuid.uuid4().hex[:12]}",
            loan_id=loan_id,
            event_type=event_type,
            actor_id=actor_id,
            actor_role=actor_role,
            summary=summary,
            previous_state=previous_state,
            new_state=new_state,
            metadata_json=metadata_json,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_events_for_loan(db: Session, loan_id: str):
        return db.query(AuditEvent).filter(AuditEvent.loan_id == loan_id).order_by(AuditEvent.timestamp.asc()).all()

    @staticmethod
    def get_recent_events(db: Session, limit: int = 50):
        return db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit).all()
