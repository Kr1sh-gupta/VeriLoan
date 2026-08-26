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
