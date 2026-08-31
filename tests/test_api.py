import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_summary_metrics_endpoint(client):
    response = client.get("/api/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_loans" in data
    assert "total_exceptions" in data
    assert "data_quality_score" in data

def test_loans_list_endpoint(client):
    response = client.get("/api/loans?limit=10")
    assert response.status_code == 200
    loans = response.json()
    assert isinstance(loans, list)
    assert len(loans) > 0

def test_exceptions_list_endpoint(client):
    response = client.get("/api/exceptions?limit=10")
    assert response.status_code == 200
    exceptions = response.json()
    assert isinstance(exceptions, list)
    assert len(exceptions) > 0

def test_ai_explain_endpoint(client):
    exc_res = client.get("/api/exceptions?limit=1")
    exceptions = exc_res.json()
    assert len(exceptions) > 0
    exc_id = exceptions[0]["id"]
    res = client.post("/api/ai/explain", json={"exception_id": exc_id})
    assert res.status_code == 200
    ai_data = res.json()
    assert "explanation" in ai_data
    assert "suggested_patch" in ai_data
    assert "confidence" in ai_data

def test_audit_trail_endpoint(client):
    response = client.get("/api/audit?limit=10")
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)
    assert len(events) > 0

def test_ai_batch_summary_endpoint(client):
    response = client.post("/api/ai/batch-summary", json={"status": "OPEN"})
    assert response.status_code == 200
    data = response.json()
    assert "total_exceptions_analyzed" in data
    assert "summary_headline" in data
    assert "actionable_recommendation" in data
    assert data["total_exceptions_analyzed"] >= 0

def test_ai_generate_rule_endpoint(client):
    response = client.post("/api/ai/generate-rule", json={
        "natural_language_description": "flag any loan where interest rate is greater than 36%"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["field_name"] == "interest_rate"
    assert "python_expression" in data

def test_add_exception_comment_endpoint(client):
    exc_res = client.get("/api/exceptions?limit=1")
    exceptions = exc_res.json()
    assert len(exceptions) > 0
    exc_id = exceptions[0]["id"]
    
    res = client.post(
        f"/api/exceptions/{exc_id}/comment",
        headers={"Authorization": "Bearer jwt-mock-token-usr-002-reviewer"},
        json={"comment": "Reviewing custodial promissory note deed"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "message" in data
    assert "Comment by" in data["resolution_notes"]

def test_exceptions_search_by_borrower_id(client):
    # Search for an existing borrower (e.g. BOR-)
    response = client.get("/api/exceptions?search=BOR-&limit=5")
    assert response.status_code == 200
    exceptions = response.json()
    assert isinstance(exceptions, list)

def test_resolve_exception_request_correction(client):
    exc_res = client.get("/api/exceptions?status=OPEN&limit=1")
    exceptions = exc_res.json()
    if len(exceptions) > 0:
        exc_id = exceptions[0]["id"]
        res = client.post(
            f"/api/exceptions/{exc_id}/resolve",
            headers={"Authorization": "Bearer jwt-mock-token-usr-002-reviewer"},
            json={
                "action": "REQUEST_CORRECTION",
                "notes": "Requesting refreshed title policy and origination date from servicer.",
                "reviewer_name": "Marcus Vance"
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["exception_status"] == "OPEN"
        assert data["loan_status"] == "FLAGGED"

        # Check audit event
        audit_res = client.get("/api/audit?event_type=CORRECTION_REQUESTED&limit=1")
        assert audit_res.status_code == 200
        events = audit_res.json()
        assert len(events) > 0
        assert events[0]["event_type"] == "CORRECTION_REQUESTED"

def test_auth_login_credentials_flexibility(client):
    # Test login with trailing exclamation mark
    res1 = client.post("/api/auth/login", json={"username": "operator", "password": "operator123!"})
    assert res1.status_code == 200
    assert "token" in res1.json()

    # Test login without trailing exclamation mark
    res2 = client.post("/api/auth/login", json={"username": "operator", "password": "operator123"})
    assert res2.status_code == 200
    assert "token" in res2.json()

    # Test invalid password rejection
    res3 = client.post("/api/auth/login", json={"username": "operator", "password": "wrongpassword"})
    assert res3.status_code == 401
