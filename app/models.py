import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # OPERATOR, REVIEWER, CONSUMER
    email = Column(String, nullable=True)
    avatar_badge = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UploadBatch(Base):
    __tablename__ = "upload_batches"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # LOAN_TAPE, SERVICER_UPDATE, DOC_MANIFEST
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    exception_count = Column(Integer, default=0)
    uploaded_by = Column(String, nullable=False)
    status = Column(String, default="PROCESSED")  # UPLOADED, PROCESSING, PROCESSED, FAILED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Loan(Base):
    __tablename__ = "loans"

    id = Column(String, primary_key=True, index=True)  # Internal UUID or row identifier
    loan_id = Column(String, index=True, nullable=True)  # e.g. LN-10001
    borrower_id = Column(String, index=True, nullable=True)
    loan_type = Column(String, nullable=True)
    origination_date = Column(String, nullable=True)
    maturity_date = Column(String, nullable=True)
    original_principal = Column(Float, nullable=True)
    current_balance = Column(Float, nullable=True)
    interest_rate = Column(Float, nullable=True)
    term_months = Column(Integer, nullable=True)
    borrower_state = Column(String, nullable=True)
    loan_purpose = Column(String, nullable=True)
    credit_grade = Column(String, nullable=True)
    employment_length = Column(String, nullable=True)
    income_band = Column(String, nullable=True)
    payment_status = Column(String, nullable=True)
    days_past_due = Column(Integer, default=0)
    servicer_name = Column(String, nullable=True)
    last_payment_date = Column(String, nullable=True)
    last_updated_at = Column(String, nullable=True)
    document_status = Column(String, nullable=True)
    source_system = Column(String, nullable=True)
    batch_id = Column(String, ForeignKey("upload_batches.id"), nullable=True)
    status = Column(String, default="PENDING")  # PENDING, FLAGGED, RESOLVED, VERIFIED, REJECTED
    raw_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    exceptions = relationship("ValidationException", back_populates="loan", cascade="all, delete-orphan")
    verified_record = relationship("VerifiedLoan", back_populates="loan", uselist=False)

class ServicerUpdate(Base):
    __tablename__ = "servicer_updates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    loan_id = Column(String, index=True, nullable=False)
    current_balance = Column(Float, nullable=True)
    payment_status = Column(String, nullable=True)
    days_past_due = Column(Integer, default=0)
    last_payment_date = Column(String, nullable=True)
    servicer_name = Column(String, nullable=True)
    update_timestamp = Column(String, nullable=True)
    batch_id = Column(String, ForeignKey("upload_batches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DocumentManifest(Base):
    __tablename__ = "document_manifests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    loan_id = Column(String, index=True, nullable=False)
    doc_type = Column(String, nullable=False)
    doc_status = Column(String, nullable=False)  # AVAILABLE, MISSING, EXPIRED
    file_hash_md5 = Column(String, nullable=True)
    last_verified_at = Column(String, nullable=True)
    batch_id = Column(String, ForeignKey("upload_batches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ValidationException(Base):
    __tablename__ = "validation_exceptions"

    id = Column(String, primary_key=True, index=True)
    loan_id_ref = Column(String, ForeignKey("loans.id"), nullable=False, index=True)
    loan_id_code = Column(String, nullable=True, index=True)  # Human loan_id e.g. LN-10020
    rule_code = Column(String, nullable=False, index=True)    # VAL-001 ... VAL-014
    category = Column(String, nullable=False)                 # MANDATORY, FINANCIAL, etc.
    severity = Column(String, nullable=False)                 # CRITICAL, HIGH, MEDIUM, LOW
    field_name = Column(String, nullable=True)
    error_message = Column(Text, nullable=False)
    actual_value = Column(Text, nullable=True)
    expected_condition = Column(Text, nullable=True)
    status = Column(String, default="OPEN")                   # OPEN, RESOLVED, DISMISSED
    
    # AI Review Assistant metadata
    ai_explanation = Column(Text, nullable=True)
    ai_suggested_patch = Column(JSON, nullable=True)          # e.g. {"current_balance": 42000.0}
    ai_confidence = Column(Float, nullable=True)
    ai_model = Column(String, nullable=True)
    ai_prompt = Column(Text, nullable=True)
    ai_generated_at = Column(DateTime, nullable=True)
    
    # Human Reviewer Action
    resolution_action = Column(String, nullable=True)         # ACCEPTED_AI, MANUAL_EDIT, REJECTED, DISMISSED
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    loan = relationship("Loan", back_populates="exceptions")

class VerifiedLoan(Base):
    __tablename__ = "verified_loans"

    id = Column(String, primary_key=True, index=True)
    loan_id_ref = Column(String, ForeignKey("loans.id"), unique=True, nullable=False)
    loan_id = Column(String, unique=True, index=True, nullable=False)
    canonical_data = Column(JSON, nullable=False)
    record_hash = Column(String(64), index=True, nullable=False)  # SHA-256
    raw_hash = Column(String(64), nullable=False)                # SHA-256 of initial ingestion
    source_file = Column(String, nullable=False)
    verified_by = Column(String, nullable=False)
    verified_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolution_notes = Column(Text, nullable=True)
    ai_assisted = Column(Boolean, default=False)

    loan = relationship("Loan", back_populates="verified_record")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    loan_id = Column(String, index=True, nullable=True)
    event_type = Column(String, nullable=False, index=True)
    # FILE_UPLOADED, RECORD_IMPORTED, VALIDATION_RUN, EXCEPTION_RAISED,
    # AI_SUGGESTION_GENERATED, REVIEWER_COMMENT, FIELD_EDITED,
    # RECORD_APPROVED, RECORD_REJECTED, VERIFIED_RECORD_CREATED, EXPORT_GENERATED
    actor_id = Column(String, nullable=False)
    actor_role = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
