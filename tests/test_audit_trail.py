import io
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import User, Loan, ValidationException, VerifiedLoan, AuditEvent
from app.database import SessionLocal
from app.services.verification_service import VerificationService

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()

def test_record_imported_audit_event():
    fake_csv = io.BytesIO(b"loan_id,borrower_id,original_principal,current_balance\nLN-AUD-001,BW-AUD-001,500000,480000\n")
    response = client.post(
        "/api/ingest/upload",
        headers={"Authorization": "Bearer jwt-mock-token-usr-001-operator"},
        files={"file": ("audit_test_tape.csv", fake_csv, "text/csv")},
        data={"file_type": "LOAN_TAPE"}
    )
    assert response.status_code == 200

    audit_res = client.get("/api/audit?event_type=RECORD_IMPORTED&limit=5")
    assert audit_res.status_code == 200
    events = audit_res.json()
    assert len(events) > 0
    assert events[0]["event_type"] == "RECORD_IMPORTED"
    assert "Imported" in events[0]["summary"]

def test_ai_suggestion_generated_audit_event(db_session):
    exc = db_session.query(ValidationException).filter(ValidationException.status == "OPEN").first()
    if exc:
        response = client.post("/api/ai/explain", json={"exception_id": exc.id})
        assert response.status_code == 200

        audit_res = client.get("/api/audit?event_type=AI_SUGGESTION_GENERATED&limit=5")
        assert audit_res.status_code == 200
        events = audit_res.json()
        assert len(events) > 0
        assert events[0]["event_type"] == "AI_SUGGESTION_GENERATED"
        assert events[0]["actor_role"] == "AI_ASSISTANT"

def test_rule_created_audit_event():
    response = client.post(
        "/api/ai/generate-rule",
        json={"natural_language_description": "Interest rate must not exceed 25 percent for prime conventional loans"}
    )
    assert response.status_code == 200

    audit_res = client.get("/api/audit?event_type=RULE_CREATED&limit=5")
    assert audit_res.status_code == 200
    events = audit_res.json()
    assert len(events) > 0
    assert events[0]["event_type"] == "RULE_CREATED"
    assert "Synthesized new validation rule" in events[0]["summary"]

def test_rule_updated_audit_event():
    response = client.put(
        "/api/summary/rules/VAL-008",
        headers={"Authorization": "Bearer jwt-mock-token-usr-002-reviewer"},
        json={"max_interest_rate": 30.0, "severity": "CRITICAL"}
    )
    assert response.status_code == 200

    audit_res = client.get("/api/audit?event_type=RULE_UPDATED&limit=5")
    assert audit_res.status_code == 200
    events = audit_res.json()
    assert len(events) > 0
    assert events[0]["event_type"] == "RULE_UPDATED"
    assert "VAL-008" in events[0]["summary"]

def test_verification_sealed_audit_event(db_session):
    loan = db_session.query(Loan).filter(Loan.loan_id != None).first()
    if loan:
        verified = VerificationService.verify_and_seal_loan(
            db=db_session,
            loan=loan,
            verified_by="Test Verifier",
            actor_id="usr-002",
            actor_role="REVIEWER"
        )
        assert verified.record_hash is not None

        audit_res = client.get("/api/audit?event_type=VERIFICATION_SEALED&limit=5")
        assert audit_res.status_code == 200
        events = audit_res.json()
        assert len(events) > 0
        assert events[0]["event_type"] == "VERIFICATION_SEALED"
        assert events[0]["loan_id"] == loan.loan_id

def test_batch_sealed_audit_event(db_session):
    # Ensure there is a clean pending loan
    u_id = uuid.uuid4().hex[:8]
    clean_loan = Loan(
        id=f"row-batch-test-{u_id}",
        loan_id=f"LN-BATCH-{u_id}",
        borrower_id=f"BW-BATCH-{u_id}",
        original_principal=300000.0,
        current_balance=290000.0,
        interest_rate=5.5,
        term_months=360,
        borrower_state="CA",
        payment_status="CURRENT",
        days_past_due=0,
        status="PENDING"
    )
    db_session.add(clean_loan)
    db_session.commit()

    response = client.post(
        "/api/verified-loans/verify-all-clean",
        headers={"Authorization": "Bearer jwt-mock-token-usr-002-reviewer"}
    )
    assert response.status_code == 200

    audit_res = client.get("/api/audit?event_type=BATCH_SEALED&limit=5")
    assert audit_res.status_code == 200
    events = audit_res.json()
    assert len(events) > 0
    assert events[0]["event_type"] == "BATCH_SEALED"
    assert "Batch verification sealed" in events[0]["summary"]

def test_tamper_detected_audit_event(db_session):
    verified = db_session.query(VerifiedLoan).first()
    if not verified:
        loan = db_session.query(Loan).filter(Loan.loan_id != None).first()
        verified = VerificationService.verify_and_seal_loan(db=db_session, loan=loan)

    # Intentionally tamper with canonical data in database
    tampered_data = dict(verified.canonical_data)
    tampered_data["current_balance"] = float(tampered_data.get("current_balance", 0)) + 999999.0
    verified.canonical_data = tampered_data
    db_session.commit()

    # Call get_verified_loan_detail which triggers verify_hash_integrity with db session
    response = client.get(f"/api/verified-loans/{verified.loan_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["hash_verification"]["is_valid"] is False
    assert data["hash_verification"]["tamper_detected"] is True

    audit_res = client.get("/api/audit?event_type=TAMPER_DETECTED&limit=5")
    assert audit_res.status_code == 200
    events = audit_res.json()
    assert len(events) > 0
    assert events[0]["event_type"] == "TAMPER_DETECTED"
    assert "tamper detected" in events[0]["summary"].lower()

def test_loan_specific_audit_timeline(db_session):
    loan = db_session.query(Loan).filter(Loan.loan_id != None).first()
    if loan:
        response = client.get(f"/api/audit/{loan.loan_id}")
        assert response.status_code == 200
        events = response.json()
        assert isinstance(events, list)
        for ev in events:
            assert ev["loan_id"] == loan.loan_id
