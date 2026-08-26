from typing import Optional, Any, Dict, List
from pydantic import BaseModel
import datetime

class UserBase(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    email: Optional[str] = None
    avatar_badge: Optional[str] = None

    class Config:
        orm_mode = True

class UserAuthRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    user: UserBase
    token: str

class LoanRecordSchema(BaseModel):
    id: str
    loan_id: Optional[str] = None
    borrower_id: Optional[str] = None
    loan_type: Optional[str] = None
    origination_date: Optional[str] = None
    maturity_date: Optional[str] = None
    original_principal: Optional[float] = None
    current_balance: Optional[float] = None
    interest_rate: Optional[float] = None
    term_months: Optional[int] = None
    borrower_state: Optional[str] = None
    loan_purpose: Optional[str] = None
    credit_grade: Optional[str] = None
    employment_length: Optional[str] = None
    income_band: Optional[str] = None
    payment_status: Optional[str] = None
    days_past_due: Optional[int] = 0
    servicer_name: Optional[str] = None
    last_payment_date: Optional[str] = None
    last_updated_at: Optional[str] = None
    document_status: Optional[str] = None
    source_system: Optional[str] = None
    status: str
    batch_id: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    class Config:
        orm_mode = True

class ValidationExceptionSchema(BaseModel):
    id: str
    loan_id_ref: str
    loan_id_code: Optional[str] = None
    rule_code: str
    category: str
    severity: str
    field_name: Optional[str] = None
    error_message: str
    actual_value: Optional[str] = None
    expected_condition: Optional[str] = None
    status: str
    ai_explanation: Optional[str] = None
    ai_suggested_patch: Optional[Dict[str, Any]] = None
    ai_confidence: Optional[float] = None
    ai_model: Optional[str] = None
    ai_prompt: Optional[str] = None
    ai_generated_at: Optional[datetime.datetime] = None
    resolution_action: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        orm_mode = True

class VerifiedLoanSchema(BaseModel):
    id: str
    loan_id_ref: str
    loan_id: str
    canonical_data: Dict[str, Any]
    record_hash: str
    raw_hash: str
    source_file: str
    verified_by: str
    verified_at: datetime.datetime
    resolution_notes: Optional[str] = None
    ai_assisted: bool = False

    class Config:
        orm_mode = True

class AuditEventSchema(BaseModel):
    id: str
    loan_id: Optional[str] = None
    event_type: str
    actor_id: str
    actor_role: str
    summary: str
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    metadata_json: Optional[Dict[str, Any]] = None
    timestamp: datetime.datetime

    class Config:
        orm_mode = True

class AIExplainRequest(BaseModel):
    exception_id: str
    custom_instruction: Optional[str] = None

class AIExplainResponse(BaseModel):
    exception_id: str
    explanation: str
    suggested_patch: Dict[str, Any]
    confidence: float
    model: str
    prompt: str
    timestamp: str

class ResolveExceptionRequest(BaseModel):
    action: str
    corrected_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    reviewer_name: str = "Marcus Vance (Reviewer)"

class IngestionSummaryResponse(BaseModel):
    batch_id: str
    filename: str
    file_type: str
    total_rows: int
    valid_rows: int
    exception_count: int
    status: str
    created_at: datetime.datetime

    class Config:
        orm_mode = True

class SystemSummaryMetrics(BaseModel):
    total_loans: int
    total_exceptions: int
    open_exceptions: int
    resolved_exceptions: int
    verified_loans: int
    critical_exceptions: int
    high_exceptions: int
    medium_exceptions: int
    low_exceptions: int
    data_quality_score: float
    recent_batches: List[IngestionSummaryResponse]
