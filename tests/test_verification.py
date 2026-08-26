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
