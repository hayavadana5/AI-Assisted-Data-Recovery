"""test_persistence.py — Comprehensive Unit Tests for SQLite Persistence Layer (Stage 5).

Covers:
- Test 1: Database initialization.
- Test 2: Case creation.
- Test 3: Case retrieval.
- Test 4: Cross-session restart persistence.
- Test 5: Artifact metadata persistence.
- Test 6: Fragment metadata persistence.
- Test 7: Reconstruction & fragment sequence ordering persistence.
- Test 8: Integrity analysis persistence.
- Test 9: Classification findings & prioritization persistence.
- Test 10: Chain of custody event trail persistence.
- Test 11: Evidence immutability SHA-256 verification.
- Test 12: JSON export compatibility from persisted SQLite data.
"""

import hashlib
import pathlib
import sys
import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from hackathon_core.db.database import init_db, SessionLocal
from hackathon_core.db.repositories import ForensicRepository
from hackathon_core.db.models import CaseModel, ArtifactModel, ReconstructionModel
from hackathon_core.reports.json_exporter import export_case_json


# --- TEST 1: Database Initialization ---
def test_db_initialization(tmp_path):
    db_file = tmp_path / "test_init.db"
    engine = init_db(db_file)
    assert db_file.exists()
    assert db_file.stat().st_size > 0


# --- TEST 2: Case Creation ---
def test_case_creation(tmp_path):
    db_file = tmp_path / "test_case.db"
    engine = init_db(db_file)
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        case_data = {
            "case_id": "CAS-TEST-001",
            "name": "Homicide Investigation Unit",
            "examiner": "Agent Smith",
            "target_image": "/dev/sdb1",
            "status": "PROCESSING",
        }
        case_obj = repo.save_case_manifest(case_data)
        assert case_obj.id is not None
        assert case_obj.case_id == "CAS-TEST-001"


# --- TEST 3: Case Retrieval ---
def test_case_retrieval(tmp_path):
    db_file = tmp_path / "test_retrieve.db"
    engine = init_db(db_file)
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        repo.save_case_manifest({
            "case_id": "CAS-TEST-002",
            "name": "Financial Audit Case",
            "examiner": "Auditor Vance",
            "target_image": "test-stick.img",
        })

    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        manifest = repo.get_case_manifest("CAS-TEST-002")
        assert manifest is not None
        assert manifest["name"] == "Financial Audit Case"
        assert manifest["examiner"] == "Auditor Vance"


# --- TEST 4: Persistence Across Sessions (Simulated Restart) ---
def test_persistence_across_sessions(tmp_path):
    db_file = tmp_path / "restart_test.db"

    # Session 1: Create case and commit to disk
    engine1 = init_db(db_file)
    with SessionLocal(bind=engine1) as session1:
        repo1 = ForensicRepository(session1)
        repo1.save_case_manifest({
            "case_id": "CAS-RESTART-100",
            "name": "Cross-Session Recovery Test",
            "examiner": "Senior Agent",
            "target_image": "test-stick.img",
            "status": "COMPLETED",
        })
    engine1.dispose()

    # Session 2: Open completely new database connection session
    engine2 = init_db(db_file)
    with SessionLocal(bind=engine2) as session2:
        repo2 = ForensicRepository(session2)
        manifest2 = repo2.get_case_manifest("CAS-RESTART-100")
        assert manifest2 is not None
        assert manifest2["case_id"] == "CAS-RESTART-100"
        assert manifest2["status"] == "COMPLETED"


# --- TEST 5: Artifact Persistence ---
def test_artifact_persistence(tmp_path):
    db_file = tmp_path / "artifacts.db"
    engine = init_db(db_file)
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        case_data = {
            "case_id": "CAS-ART-500",
            "target_image": "test-stick.img",
            "recovered_files": [
                {
                    "file_id": "carved_0x00000400.png",
                    "original_offset": 1024,
                    "size": 2048,
                    "extension": "png",
                    "mime_type": "image/png",
                    "hashes": {"sha256": "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff"},
                    "saved_path": "/tmp/carved_0x00000400.png",
                    "confidence": 0.98,
                    "repaired": False,
                    "category": "IMAGE",
                    "priority": "HIGH",
                    "tags": ["media", "sensitive"],
                    "findings": [{"type": "aws_access_key", "count": 1}],
                }
            ]
        }
        repo.save_case_manifest(case_data)

    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        manifest = repo.get_case_manifest("CAS-ART-500")
        assert len(manifest["recovered_files"]) == 1
        art = manifest["recovered_files"][0]
        assert art["file_id"] == "carved_0x00000400.png"
        assert art["original_offset"] == 1024
        assert art["priority"] == "HIGH"
        assert art["hashes"]["sha256"] == "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff"


# --- TEST 6: Fragment Persistence ---
def test_fragment_persistence(tmp_path):
    db_file = tmp_path / "fragments.db"
    engine = init_db(db_file)
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        case_data = {
            "case_id": "CAS-FRAG-600",
            "target_image": "test-stick.img",
            "reconstructions": [
                {
                    "reconstruction_id": "recon_jpeg_0x00001000",
                    "file_type": "JPEG",
                    "fragment_count": 2,
                    "ordered_fragments": ["frag_JPEG_00001000", "frag_JPEG_00005000"],
                    "confidence": 0.95,
                    "confidence_factors": ["valid_header", "valid_footer"],
                    "output_path": "/tmp/recon.jpg",
                    "sha256": "abc123def4567890abc123def4567890abc123def4567890abc123def4567890",
                    "status": "RECONSTRUCTED",
                    "metadata": {"offsets": [4096, 20480]},
                }
            ]
        }
        repo.save_case_manifest(case_data)

    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        manifest = repo.get_case_manifest("CAS-FRAG-600")
        assert len(manifest["reconstructions"]) == 1
        recon = manifest["reconstructions"][0]
        assert recon["reconstruction_id"] == "recon_jpeg_0x00001000"
        assert recon["ordered_fragments"] == ["frag_JPEG_00001000", "frag_JPEG_00005000"]


# --- TEST 7: Reconstruction & Sequence Ordering Persistence ---
def test_reconstruction_ordering_persistence(tmp_path):
    db_file = tmp_path / "recon_order.db"
    engine = init_db(db_file)
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        repo.save_case_manifest({
            "case_id": "CAS-ORDER-700",
            "target_image": "test-stick.img",
            "reconstructions": [
                {
                    "reconstruction_id": "recon_jpeg_0x00001000",
                    "fragment_count": 3,
                    "ordered_fragments": ["frag_A_001", "frag_B_002", "frag_C_003"],
                    "output_path": "/tmp/order.jpg",
                    "sha256": "1234",
                    "confidence": 0.99,
                    "status": "RECONSTRUCTED",
                    "metadata": {"offsets": [0x1000, 0x6000, 0xB000]},
                }
            ]
        })

    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        manifest = repo.get_case_manifest("CAS-ORDER-700")
        recon = manifest["reconstructions"][0]
        # Ordering must match exact sequence
        assert recon["ordered_fragments"] == ["frag_A_001", "frag_B_002", "frag_C_003"]


# --- TEST 8: Integrity Results Persistence ---
def test_integrity_persistence(tmp_path):
    db_file = tmp_path / "integrity.db"
    engine = init_db(db_file)
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        repo.save_case_manifest({
            "case_id": "CAS-INT-800",
            "target_image": "test-stick.img",
            "recovered_files": [
                {
                    "file_id": "carved_repaired.jpg",
                    "saved_path": "/tmp/repaired.jpg",
                    "confidence": 0.85,
                    "repaired": True,
                    "hashes": {"sha256": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"},
                }
            ]
        })

    with SessionLocal(bind=engine) as session:
        case_obj = session.query(CaseModel).filter(CaseModel.case_id == "CAS-INT-800").first()
        art = case_obj.artifacts[0]
        assert len(art.integrity_results) >= 1
        assert art.integrity_results[0].corruption_status == "REPAIRED"


# --- TEST 9: Findings & Prioritization Persistence ---
def test_findings_persistence(tmp_path):
    db_file = tmp_path / "findings.db"
    engine = init_db(db_file)
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        repo.save_case_manifest({
            "case_id": "CAS-FIND-900",
            "target_image": "test-stick.img",
            "recovered_files": [
                {
                    "file_id": "vault_keys.txt",
                    "priority": "HIGH",
                    "category": "DOCUMENT",
                    "findings": [
                        {"type": "private_key", "count": 2, "sample": ["-----BEGIN RSA PRIVATE KEY-----"]}
                    ]
                }
            ]
        })

    with SessionLocal(bind=engine) as session:
        case_obj = session.query(CaseModel).filter(CaseModel.case_id == "CAS-FIND-900").first()
        art = case_obj.artifacts[0]
        assert art.priority == "HIGH"
        assert len(art.findings) >= 1
        assert art.findings[0].severity == "HIGH"
        assert "private_key" in art.findings[0].finding_type


# --- TEST 10: Chain of Custody Persistence ---
def test_chain_of_custody_persistence(tmp_path):
    db_file = tmp_path / "coc.db"
    engine = init_db(db_file)
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        repo.save_case_manifest({
            "case_id": "CAS-COC-1000",
            "target_image": "test-stick.img",
            "chain_of_custody": [
                {
                    "event_id": 1,
                    "action": "EVIDENCE_INGEST",
                    "timestamp": "2026-01-15T12:00:00Z",
                    "current_hash": "hash_111",
                    "prev_hash": "GENESIS_BLOCK",
                    "notes": "Registered evidence image."
                },
                {
                    "event_id": 2,
                    "action": "FILE_CARVED",
                    "timestamp": "2026-01-15T12:05:00Z",
                    "current_hash": "hash_222",
                    "prev_hash": "hash_111",
                    "notes": "Carved JPEG file at 0x1000."
                }
            ]
        })

    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        manifest = repo.get_case_manifest("CAS-COC-1000")
        coc = manifest["chain_of_custody"]
        assert len(coc) == 2
        assert coc[0]["event_id"] == 1
        assert coc[1]["event_id"] == 2
        assert coc[1]["prev_hash"] == "hash_111"


# --- TEST 11: Evidence Immutability ---
def test_evidence_immutability():
    test_stick = REPO_ROOT / "test-stick.img"
    if test_stick.exists():
        initial_hash = hashlib.sha256(test_stick.read_bytes()).hexdigest()
        assert initial_hash == "8565a714dca840f8652c5bae9249ab05f5fb5a4f9f13fbe23304b10f68252da2"


# --- TEST 12: JSON Export Compatibility ---
def test_json_compatibility(tmp_path):
    db_file = tmp_path / "json_compat.db"
    engine = init_db(db_file)
    case_data = {
        "case_id": "CAS-JSON-1200",
        "name": "JSON Export Compat Test",
        "examiner": "Lead Examiner",
        "target_image": "test-stick.img",
        "status": "COMPLETED",
        "recovered_files": [
            {
                "file_id": "doc.pdf",
                "original_offset": 512,
                "size": 1024,
                "extension": "pdf",
                "priority": "LOW",
            }
        ]
    }

    # Save to SQLite
    with SessionLocal(bind=engine) as session:
        repo = ForensicRepository(session)
        repo.save_case_manifest(case_data)
        persisted_manifest = repo.get_case_manifest("CAS-JSON-1200")

    # Export to JSON
    json_out = tmp_path / "exported.json"
    exported_path = export_case_json(persisted_manifest, json_out)
    assert exported_path.exists()
    assert exported_path.stat().st_size > 0
