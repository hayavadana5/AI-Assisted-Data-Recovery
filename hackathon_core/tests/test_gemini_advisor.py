"""test_gemini_advisor.py — Unit & Integration tests for Gemini Decision Support.

Verifies:
1. Structured prompt payload construction (strictly no raw bytes or secrets).
2. Deterministic fallback analysis output schema compliance.
3. Gemini API mocked response handling.
4. FastAPI endpoint /api/ai/analysis/{case_id}.
"""

import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from hackathon_core.analysis.gemini_advisor import (
    build_structured_prompt_payload,
    GeminiDecisionSupportService,
)
from api.server import app, active_cases


@pytest.fixture
def mock_case_manifest():
    return {
        "case_id": "CAS-TEST-999",
        "name": "Synthetic Test Investigation",
        "examiner": "Agent Smith",
        "target_image": "test-stick.img",
        "status": "COMPLETED",
        "image_hashes": {"sha256": "8565a7148565a7148565a7148565a7148565a7148565a7148565a7148565a714"},
        "recovered_files": [
            {
                "file_id": "FILE-0001",
                "category": "CREDENTIALS",
                "priority": "HIGH",
                "extension": ".txt",
                "mime_type": "text/plain",
                "original_offset": 5120,
                "size": 1024,
                "hashes": {"sha256": "a" * 64},
                "confidence": 0.95,
                "repaired": False,
                "findings": [{"type": "RSA_PRIVATE_KEY", "confidence": 0.98}],
                "raw_bytes_secret": "DO_NOT_SEND_THIS_SECRET_KEY_MATERIAL",
            },
            {
                "file_id": "FILE-0002",
                "category": "IMAGES",
                "priority": "LOW",
                "extension": ".jpg",
                "mime_type": "image/jpeg",
                "original_offset": 10240,
                "size": 2048,
                "hashes": {"sha256": "b" * 64},
                "confidence": 0.90,
                "repaired": True,
                "findings": [],
            }
        ],
        "reconstructions": [
            {
                "reconstruction_id": "RECON-0001",
                "file_type": "JPEG",
                "fragment_count": 2,
                "ordered_fragments": ["FRAG-001", "FRAG-002"],
                "confidence": 0.88,
                "status": "RECONSTRUCTED",
                "sha256": "c" * 64,
            }
        ],
        "chain_of_custody": [
            {"action": "EVIDENCE_INGEST", "actor": "Agent Smith"},
            {"action": "FILE_CARVED", "actor": "CARVER_V2"},
        ]
    }


def test_build_structured_prompt_payload_safety(mock_case_manifest):
    payload = build_structured_prompt_payload(mock_case_manifest)

    # Verify root keys
    assert "case" in payload
    assert "artifacts" in payload
    assert "reconstructions" in payload
    assert "chain_of_custody" in payload

    # Verify no raw sensitive keys passed
    art_0 = payload["artifacts"][0]
    assert "raw_bytes_secret" not in art_0
    assert art_0["file_id"] == "FILE-0001"
    assert art_0["category"] == "CREDENTIALS"
    assert art_0["priority"] == "HIGH"
    assert art_0["sha256"] == "a" * 64
    assert "RSA_PRIVATE_KEY" in art_0["finding_types"]


def test_fallback_analysis_structure(mock_case_manifest):
    service = GeminiDecisionSupportService(api_key=None)
    result = service.generate_investigator_analysis(mock_case_manifest)

    expected_keys = [
        "executive_summary",
        "evidence_overview",
        "important_findings",
        "recovery_assessment",
        "integrity_assessment",
        "investigation_priorities",
        "reconstruction_explanation",
        "limitations",
        "recommended_next_actions",
        "ai_source",
    ]

    for key in expected_keys:
        assert key in result, f"Missing required response key: {key}"

    assert result["ai_source"] == "DETERMINISTIC_FALLBACK_ENGINE"
    assert "CAS-TEST-999" in result["executive_summary"]
    assert len(result["investigation_priorities"]) > 0
    assert result["investigation_priorities"][0]["artifact_id"] == "FILE-0001"


def test_gemini_service_with_mocked_api(mock_case_manifest):
    mock_ai_json_response = {
        "executive_summary": "Gemini live analysis: High value recovery detected.",
        "evidence_overview": "Evidence contains credentials and JPEG fragments.",
        "important_findings": ["Discovered RSA Key at 0x00001400."],
        "recovery_assessment": "95% confidence recovery.",
        "integrity_assessment": "SHA-256 hashes matched.",
        "investigation_priorities": [{"artifact_id": "FILE-0001", "reason": "Private Key", "recommended_focus": "Audit"}],
        "reconstruction_explanation": "Fragment RECON-0001 ordered successfully.",
        "limitations": ["Metadata based."],
        "recommended_next_actions": ["Review key."],
    }

    mock_response = MagicMock()
    mock_response.text = f"```json\n{import_json_str(mock_ai_json_response)}\n```"

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch.dict(os.environ, {"GEMINI_API_KEY": "dummy_test_key"}):
        with patch("google.genai.Client", return_value=mock_client):
            service = GeminiDecisionSupportService(api_key="dummy_test_key")
            result = service.generate_investigator_analysis(mock_case_manifest)

            assert result["executive_summary"] == "Gemini live analysis: High value recovery detected."
            assert result["ai_source"] == "GEMINI_2.5_FLASH_LIVE"


def import_json_str(obj):
    import json
    return json.dumps(obj)


def test_api_ai_analysis_endpoint(mock_case_manifest):
    client = TestClient(app)
    case_id = mock_case_manifest["case_id"]

    # Inject mock case into active_cases
    active_cases[case_id] = mock_case_manifest

    try:
        response = client.get(f"/api/ai/analysis/{case_id}")
        assert response.status_code == 200
        data = response.json()
        assert "executive_summary" in data
        assert "investigation_priorities" in data
        assert data["ai_source"] in ["DETERMINISTIC_FALLBACK_ENGINE", "GEMINI_2.5_FLASH_LIVE"]
    finally:
        active_cases.pop(case_id, None)


def test_api_ai_analysis_endpoint_not_found():
    client = TestClient(app)
    response = client.get("/api/ai/analysis/CAS-NONEXISTENT")
    assert response.status_code == 404
