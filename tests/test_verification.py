import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Loan, VerifiedLoan
from app.services.verification_service import VerificationService

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_canonical_json_and_sha256(db_session):
    data_a = {"b": 2, "a": 1, "c": [1, 2, 3]}
    data_b = {"a": 1, "c": [1, 2, 3], "b": 2}
    
    # Check deterministic serialization
    assert VerificationService.canonical_json(data_a) == VerificationService.canonical_json(data_b)
    assert VerificationService.compute_hash(data_a) == VerificationService.compute_hash(data_b)

def test_verify_and_seal_loan(db_session):
    loan = Loan(
        id="row-v1",
        loan_id="LN-SEAL-001",
        borrower_id="BOR-101",
        original_principal=250000.0,
        current_balance=210000.0,
        interest_rate=4.5,
        payment_status="CURRENT",
        days_past_due=0,
        borrower_state="CA",
        document_status="VERIFIED"
    )
    db_session.add(loan)
    db_session.commit()

    verified = VerificationService.verify_and_seal_loan(
        db=db_session,
        loan=loan,
        verified_by="Marcus Vance (Reviewer)",
        resolution_notes="Validated cleanly"
    )

    assert verified is not None
    assert len(verified.record_hash) == 64
    assert loan.status == "VERIFIED"

    # Integrity verification
    valid, recalc = VerificationService.verify_hash_integrity(verified)
    assert valid is True
    assert recalc == verified.record_hash

    # Simulate tampering
    verified.canonical_data["current_balance"] = 999999.0
    tampered_valid, tampered_recalc = VerificationService.verify_hash_integrity(verified)
    assert tampered_valid is False

def test_verify_and_seal_loan_with_validation_snapshot(db_session):
    from app.models import ValidationException
    loan = Loan(
        id="row-v2",
        loan_id="LN-SEAL-002",
        borrower_id="BOR-102",
        original_principal=300000.0,
        current_balance=290000.0,
        interest_rate=5.0,
        payment_status="CURRENT",
        days_past_due=0,
        borrower_state="TX"
    )
    db_session.add(loan)
    db_session.commit()

    exc = ValidationException(
        id="exc-test-1",
        loan_id_ref=loan.id,
        loan_id_code=loan.loan_id,
        rule_code="VAL-004",
        category="FORMAT",
        severity="HIGH",
        field_name="origination_date",
        error_message="Invalid date format",
        status="RESOLVED",
        resolution_action="ACCEPTED_AI",
        ai_suggested_patch={"origination_date": "2023-01-15"},
        resolved_by="Marcus Vance"
    )
    db_session.add(exc)
    db_session.commit()

    verified = VerificationService.verify_and_seal_loan(
        db=db_session,
        loan=loan,
        verified_by="Marcus Vance (Reviewer)",
        ai_assisted=True
    )

    assert verified is not None
    assert verified.ai_assisted is True
    assert verified.validation_snapshot is not None
    assert len(verified.validation_snapshot) == 1
    assert verified.validation_snapshot[0]["rule_code"] == "VAL-004"
    assert verified.validation_snapshot[0]["status"] == "RESOLVED"
    assert verified.ai_recommendation == {"origination_date": "2023-01-15"}

def test_verify_clean_loans_batch(db_session):
    from app.models import ValidationException
    # 2 clean loans, 1 flagged loan with OPEN exception
    loan1 = Loan(id="row-b1", loan_id="LN-BATCH-001", original_principal=100000.0, current_balance=90000.0, status="PENDING")
    loan2 = Loan(id="row-b2", loan_id="LN-BATCH-002", original_principal=200000.0, current_balance=180000.0, status="PENDING")
    loan3 = Loan(id="row-b3", loan_id="LN-BATCH-003", original_principal=300000.0, current_balance=270000.0, status="FLAGGED")
    db_session.add_all([loan1, loan2, loan3])
    db_session.commit()

    exc = ValidationException(
        id="exc-batch-1",
        loan_id_ref=loan3.id,
        loan_id_code=loan3.loan_id,
        rule_code="VAL-008",
        category="FINANCIAL",
        severity="CRITICAL",
        status="OPEN",
        error_message="Interest rate exceeds maximum"
    )
    db_session.add(exc)
    db_session.commit()

    count = VerificationService.verify_clean_loans_batch(db=db_session)
    assert count == 2

    # Verify only clean loans are sealed
    sealed_loans = db_session.query(VerifiedLoan).all()
    assert len(sealed_loans) == 2
    sealed_ids = {v.loan_id for v in sealed_loans}
    assert "LN-BATCH-001" in sealed_ids
    assert "LN-BATCH-002" in sealed_ids
    assert "LN-BATCH-003" not in sealed_ids
