"""test_hackathon_core.py — Unit & Integration tests for hackathon_core engine."""

import pathlib
import sys
import pytest

# Ensure repo root is on sys.path
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from hackathon_core.recovery.integrity import calculate_buffer_hashes, ChainOfCustodyTracker
from hackathon_core.recovery.carver_v2 import AdvancedCarverEngine, SignatureRule
from hackathon_core.analysis.entropy_analyzer import calculate_shannon_entropy, SectorEntropyAnalyzer
from hackathon_core.analysis.evidence_classifier import EvidenceClassifier
from hackathon_core.analysis.timeline import ForensicTimelineSynthesizer
from hackathon_core.reports.pdf_exporter import generate_forensic_pdf_report


def test_integrity_hashing():
    data = b"FORENSIC_EVIDENCE_DATA_TEST_123"
    hashes = calculate_buffer_hashes(data)
    assert "md5" in hashes
    assert "sha1" in hashes
    assert "sha256" in hashes
    assert "sha512" in hashes
    assert len(hashes["sha256"]) == 64


def test_chain_of_custody(tmp_path):
    log_path = tmp_path / "chain_of_custody.json"
    tracker = ChainOfCustodyTracker(log_path)
    evt1 = tracker.record_event(
        action="EVIDENCE_INGEST",
        actor="Examiner_01",
        target="test-stick.img",
        hashes={"sha256": "abc1234567890def"},
        notes="Evidence disk image registered."
    )
    assert evt1["event_id"] == 1
    assert tracker.verify_integrity() is True


def test_entropy_calculator():
    zero_block = b"\x00" * 4096
    assert calculate_shannon_entropy(zero_block) == 0.0

    pattern_block = bytes(range(256)) * 16
    assert calculate_shannon_entropy(pattern_block) == 8.0


def test_carver_v2_synthetic_jpeg(tmp_path):
    img_path = tmp_path / "test_disk.img"
    out_dir = tmp_path / "carved_out"
    
    jpeg_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + (b"A" * 100) + b"\xFF\xD9"
    disk_bytes = (b"\x00" * 512) + jpeg_bytes + (b"\x00" * 512)
    img_path.write_bytes(disk_bytes)

    carver = AdvancedCarverEngine()
    results = carver.carve_image(img_path, out_dir)
    assert len(results) >= 1
    assert results[0].extension == "jpg"
    assert results[0].saved_path.exists()


def test_evidence_classifier(tmp_path):
    secret_file = tmp_path / "confidential_keys.txt"
    secret_file.write_text("aws_access_key_id = AKIAIOSFODNN7EXAMPLE\nsecret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")
    
    classifier = EvidenceClassifier()
    res = classifier.classify_file(secret_file, {})
    assert res["priority"] == "HIGH"
    assert "SENSITIVE_CREDENTIAL" in res["tags"]


def test_timeline_synthesizer():
    timeline = ForensicTimelineSynthesizer()
    timeline.add_event(
        timestamp="2026-01-15T12:00:00Z",
        event_type="FILE_DELETED",
        source="FILESYSTEM_ENUM",
        description="Deleted document found",
        file_id="top_secret.pdf"
    )
    chronological = timeline.get_chronological_timeline()
    assert len(chronological) == 1
    assert chronological[0]["file_id"] == "top_secret.pdf"


def test_pdf_report_exporter(tmp_path):
    pdf_out = tmp_path / "test_report.pdf"
    case_data = {
        "case_id": "TEST-CAS-001",
        "target_image": "test-stick.img",
        "image_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "recovered_files": [
            {
                "file_id": "carved_0x00000200.jpg",
                "extension": "jpg",
                "size": 1024,
                "hashes": {"sha256": "abcdef1234567890abcdef1234567890"},
                "priority": "HIGH"
            }
        ],
        "chain_of_custody": [
            {
                "event_id": 1,
                "action": "EVIDENCE_INGEST",
                "timestamp": "2026-01-15T12:00:00Z",
                "current_hash": "1234567890abcdef1234567890abcdef"
            }
        ]
    }
    generated = generate_forensic_pdf_report(case_data, pdf_out)
    assert generated.exists()
    assert generated.stat().st_size > 0
