import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import User, ValidationException, Loan
from app.database import SessionLocal

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()

def test_auth_me_unauthorized():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "token required" in response.json()["detail"].lower()

def test_auth_me_invalid_token():
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid-garbage-token"})
    assert response.status_code == 401
    assert "invalid or expired" in response.json()["detail"].lower()

def test_auth_me_success_with_bearer():
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer jwt-mock-token-usr-002-reviewer"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "usr-002"
    assert data["role"] == "REVIEWER"
    assert data["username"] == "reviewer"

def test_auth_me_success_with_raw_token():
    response = client.get("/api/auth/me", headers={"Authorization": "jwt-mock-token-usr-001-operator"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "usr-001"
    assert data["role"] == "OPERATOR"

def test_resolve_exception_unauthorized():
    response = client.post("/api/exceptions/some-id/resolve", json={
        "action": "DISMISS",
        "notes": "Testing unauthorized resolution"
    })
    assert response.status_code == 401

def test_resolve_exception_consumer_forbidden(db_session):
    exc = db_session.query(ValidationException).filter(ValidationException.status == "OPEN").first()
    if exc:
        response = client.post(
            f"/api/exceptions/{exc.id}/resolve",
            headers={"Authorization": "Bearer jwt-mock-token-usr-003-consumer"},
            json={"action": "DISMISS", "notes": "Consumer attempt"}
        )
        assert response.status_code == 403
        assert "Forbidden" in response.json()["detail"]

def test_update_loan_consumer_forbidden(db_session):
    loan = db_session.query(Loan).first()
    if loan:
        response = client.put(
            f"/api/loans/{loan.id}",
            headers={"Authorization": "Bearer jwt-mock-token-usr-003-consumer"},
            json={"current_balance": 100000.0}
        )
        assert response.status_code == 403

def test_verify_clean_loans_consumer_forbidden():
    response = client.post(
        "/api/verified-loans/verify-all-clean",
        headers={"Authorization": "Bearer jwt-mock-token-usr-003-consumer"}
    )
    assert response.status_code == 403

def test_upload_csv_consumer_forbidden():
    fake_csv = io.BytesIO(b"loan_id,borrower_id\nLN-99999,BW-99999\n")
    response = client.post(
        "/api/ingest/upload",
        headers={"Authorization": "Bearer jwt-mock-token-usr-003-consumer"},
        files={"file": ("test.csv", fake_csv, "text/csv")},
        data={"file_type": "LOAN_TAPE"}
    )
    assert response.status_code == 403

def test_resolve_exception_reviewer_allowed(db_session):
    exc = db_session.query(ValidationException).filter(ValidationException.status == "OPEN").first()
    if exc:
        response = client.post(
            f"/api/exceptions/{exc.id}/resolve",
            headers={"Authorization": "Bearer jwt-mock-token-usr-002-reviewer"},
            json={"action": "DISMISS", "notes": "Reviewer dismiss test"}
        )
        assert response.status_code == 200
        assert "resolved" in response.json()["message"].lower()
