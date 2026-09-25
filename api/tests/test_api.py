"""test_api.py — FastAPI endpoint tests using Starlette TestClient."""

import pathlib
import sys
import pytest
from fastapi.testclient import TestClient

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from api.server import app, active_cases


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "v2.0" in data["engine"]


def test_list_cases_empty():
    response = client.get("/api/cases")
    assert response.status_code == 200
    assert "cases" in response.json()


def test_scan_missing_image():
    response = client.post("/api/scan", json={"image_path": "non_existent_file.img"})
    assert response.status_code == 404
