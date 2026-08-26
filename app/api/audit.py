from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import AuditEvent
from app.schemas import AuditEventSchema

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=List[AuditEventSchema])
def list_global_audit_trail(
    event_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(AuditEvent)
    if event_type:
        query = query.filter(AuditEvent.event_type == event_type)
    events = query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()
    return [AuditEventSchema.from_orm(e) for e in events]

@router.get("/{loan_id}", response_model=List[AuditEventSchema])
def get_loan_audit_trail(loan_id: str, db: Session = Depends(get_db)):
    events = db.query(AuditEvent).filter(AuditEvent.loan_id == loan_id).order_by(AuditEvent.timestamp.asc()).all()
    return [AuditEventSchema.from_orm(e) for e in events]
