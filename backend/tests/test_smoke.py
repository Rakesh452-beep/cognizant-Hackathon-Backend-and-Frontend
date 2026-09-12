from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_openapi_has_routes():
    spec = client.get("/openapi.json").json()
    paths = spec["paths"]
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/auth/me" in paths
    assert "/api/v1/applications" in paths
    assert "/api/v1/applications/{application_id}/process" in paths
    assert "/api/v1/applications/{application_id}/claim" in paths
    assert "/api/v1/applications/{application_id}/assign" in paths


def test_protected_route_requires_token():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"