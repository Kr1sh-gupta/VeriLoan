import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Loan, ValidationException, ServicerUpdate, DocumentManifest
from app.services.validation_service import ValidationService

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_val_001_missing_loan_id(db_session):
    loan = Loan(id="row-1", loan_id="", original_principal=100000, current_balance=90000)
    db_session.add(loan)
    db_session.commit()

    res = ValidationService.run_all_validations(db_session)
    assert res["exceptions_raised"] >= 1
    exc = db_session.query(ValidationException).filter(ValidationException.rule_code == "VAL-001").first()
    assert exc is not None
    assert exc.severity == "CRITICAL"

def test_val_005_maturity_before_origination(db_session):
    loan = Loan(
        id="row-2",
        loan_id="LN-TEST-005",
        origination_date="2024-05-01",
        maturity_date="2022-01-01",
        original_principal=200000,
        current_balance=180000
    )
    db_session.add(loan)
    db_session.commit()

    ValidationService.run_all_validations(db_session)
    exc = db_session.query(ValidationException).filter(ValidationException.rule_code == "VAL-005").first()
    assert exc is not None
    assert exc.severity == "CRITICAL"

def test_val_007_balance_exceeds_principal(db_session):
    loan = Loan(
        id="row-3",
        loan_id="LN-TEST-007",
        origination_date="2022-01-01",
        maturity_date="2052-01-01",
        original_principal=100000,
        current_balance=150000
    )
    db_session.add(loan)
    db_session.commit()

    ValidationService.run_all_validations(db_session)
    exc = db_session.query(ValidationException).filter(ValidationException.rule_code == "VAL-007").first()
    assert exc is not None
    assert exc.severity == "HIGH"

def test_val_014_paid_off_with_balance(db_session):
    loan = Loan(
        id="row-4",
        loan_id="LN-TEST-014",
        origination_date="2020-01-01",
        maturity_date="2050-01-01",
        original_principal=300000,
        current_balance=25000.0,
        payment_status="PAID_OFF"
    )
    db_session.add(loan)
    db_session.commit()

    ValidationService.run_all_validations(db_session)
    exc = db_session.query(ValidationException).filter(ValidationException.rule_code == "VAL-014").first()
    assert exc is not None
    assert exc.severity == "HIGH"
