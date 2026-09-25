"""server.py — FastAPI Forensic REST & WebSocket API Server.

Serves real-time recovery streams, sector entropy maps, hex viewer chunks,
evidence intelligence filtering, and PDF/JSON forensic report downloads.
"""

import asyncio
import datetime
import json
import logging
import os
import pathlib
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from hackathon_core.recovery.carver_v2 import AdvancedCarverEngine
from hackathon_core.recovery.tsk_analyzer import SleuthKitAnalyzer
from hackathon_core.recovery.integrity import calculate_file_hashes, ChainOfCustodyTracker
from hackathon_core.analysis.entropy_analyzer import SectorEntropyAnalyzer
from hackathon_core.analysis.evidence_classifier import EvidenceClassifier
from hackathon_core.analysis.timeline import ForensicTimelineSynthesizer
from hackathon_core.reports.pdf_exporter import generate_forensic_pdf_report
from hackathon_core.reports.json_exporter import export_case_json
from hackathon_core.analysis.gemini_advisor import GeminiDecisionSupportService

from hackathon_core.db.database import init_db, SessionLocal, Base
from hackathon_core.db.repositories import ForensicRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ForensicAPI")

# Initialize SQLite database schema
db_engine = init_db()

from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="AI-Assisted Digital Evidence Recovery API",
    version="2.0.0",
    description="Enterprise Cyber-Forensic Data Recovery & Evidence Reconstruction API",
)

# Enable CORS for Web UI development & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
CASES_DIR = BASE_DIR / "cases_output"
CASES_DIR.mkdir(parents=True, exist_ok=True)

WEB_DIST = BASE_DIR / "web" / "dist"
if WEB_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(WEB_DIST / "assets")), name="static_assets")

    @app.get("/")
    def serve_spa():
        return FileResponse(str(WEB_DIST / "index.html"))

# Active WebSocket Connection Registry
active_connections: Dict[str, List[WebSocket]] = {}


class ScanRequest(BaseModel):
    image_path: str = "test-stick.img"
    case_name: str = "Investigation Case #001"
    examiner: str = "Lead Forensic Examiner"
    case_id: Optional[str] = None


class ConnectionManager:
    def __init__(self):
        self.active_sockets: Dict[str, List[WebSocket]] = {}

    async def connect(self, case_id: str, websocket: WebSocket):
        await websocket.accept()
        if case_id not in self.active_sockets:
            self.active_sockets[case_id] = []
        self.active_sockets[case_id].append(websocket)

    def disconnect(self, case_id: str, websocket: WebSocket):
        if case_id in self.active_sockets:
            if websocket in self.active_sockets[case_id]:
                self.active_sockets[case_id].remove(websocket)

    async def broadcast(self, case_id: str, message: dict):
        if case_id in self.active_sockets:
            for socket in list(self.active_sockets[case_id]):
                try:
                    await socket.send_json(message)
                except Exception:
                    self.disconnect(case_id, socket)


ws_manager = ConnectionManager()


@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "engine": "AI-Assisted Digital Evidence Recovery Engine v2.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


# In-memory case cache backed by SQLite
active_cases: Dict[str, Dict[str, Any]] = {}


@app.get("/api/cases")
def list_cases():
    """List all active and completed forensic recovery cases from SQLite persistence."""
    with SessionLocal() as session:
        repo = ForensicRepository(session)
        cases = repo.list_all_cases()
        # Merge any processing in-memory cases
        db_case_ids = {c["case_id"] for c in cases}
        for c_id, c_data in active_cases.items():
            if c_id not in db_case_ids:
                cases.append({
                    "case_id": c_id,
                    "name": c_data.get("name"),
                    "status": c_data.get("status"),
                    "target_image": c_data.get("target_image"),
                    "files_recovered_count": len(c_data.get("recovered_files", [])),
                    "created_at": c_data.get("created_at"),
                })
        return {"cases": cases}


def get_case_or_404(case_id: str) -> Dict[str, Any]:
    """Retrieve case from in-memory cache or persistent SQLite database."""
    if case_id in active_cases:
        return active_cases[case_id]
    with SessionLocal() as session:
        repo = ForensicRepository(session)
        case_manifest = repo.get_case_manifest(case_id)
        if not case_manifest:
            raise HTTPException(status_code=404, detail="Case not found")
        return case_manifest


@app.get("/api/cases/{case_id}")
def get_case_detail(case_id: str):
    return get_case_or_404(case_id)


@app.post("/api/scan")
async def start_recovery_scan(req: ScanRequest, background_tasks: BackgroundTasks):
    """Trigger complete AI-assisted forensic recovery scan on target image."""
    img_path = pathlib.Path(req.image_path)
    if not img_path.is_absolute():
        img_path = BASE_DIR / req.image_path

    if not img_path.exists():
        raise HTTPException(status_code=404, detail=f"Target disk image '{req.image_path}' not found.")

    case_id = req.case_id or f"CAS-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    case_dir = CASES_DIR / case_id
    case_dir.mkdir(parents=True, exist_ok=True)

    case_data = {
        "case_id": case_id,
        "name": req.case_name,
        "examiner": req.examiner,
        "target_image": str(img_path),
        "status": "PROCESSING",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "case_dir": str(case_dir),
        "recovered_files": [],
        "reconstructions": [],
        "chain_of_custody": [],
        "entropy_map": {},
        "timeline": [],
        "summary": {},
    }
    active_cases[case_id] = case_data

    # Persist initial case state to SQLite
    with SessionLocal() as session:
        repo = ForensicRepository(session)
        repo.save_case_manifest(case_data)

    # Launch background recovery task
    background_tasks.add_task(run_full_recovery_pipeline, case_id, img_path, case_dir)

    return {
        "status": "ACCEPTED",
        "case_id": case_id,
        "message": "Forensic recovery pipeline initiated.",
    }


async def run_full_recovery_pipeline(case_id: str, img_path: pathlib.Path, case_dir: pathlib.Path):
    """Executes multi-stage recovery pipeline in background."""
    case = active_cases[case_id]
    out_files_dir = case_dir / "recovered_evidence"
    out_files_dir.mkdir(parents=True, exist_ok=True)

    coc_tracker = ChainOfCustodyTracker(case_dir / "chain_of_custody.json")

    # Step 1: Evidence Registration & Hashing
    await ws_manager.broadcast(case_id, {"type": "log", "message": "Step 1/5: Registering evidence and computing SHA-256 digest..."})
    image_hashes = calculate_file_hashes(img_path)
    case["image_hashes"] = image_hashes

    coc_tracker.record_event(
        action="EVIDENCE_INGEST",
        actor=case["examiner"],
        target=img_path.name,
        hashes=image_hashes,
        notes="Evidence disk image registered and hashed.",
    )

    # Step 2: Entropy Mapping & Sector Analysis
    await ws_manager.broadcast(case_id, {"type": "log", "message": "Step 2/5: Performing sector entropy heatmap mapping..."})
    entropy_analyzer = SectorEntropyAnalyzer()
    entropy_res = entropy_analyzer.analyze_image(img_path)
    case["entropy_map"] = entropy_res
    await ws_manager.broadcast(case_id, {"type": "entropy_update", "data": entropy_res})

    # Step 3: SleuthKit / Raw FAT Enumeration
    await ws_manager.broadcast(case_id, {"type": "log", "message": "Step 3/5: Enumerating filesystem entries & deleted inodes..."})
    tsk_analyzer = SleuthKitAnalyzer(img_path)
    fs_entries = tsk_analyzer.analyze_filesystem(out_files_dir)

    # Step 4: Carver 2.0 Deep Signature Carving
    await ws_manager.broadcast(case_id, {"type": "log", "message": "Step 4/5: Running multithreaded Carver 2.0 signature scan & structure repair..."})
    carver = AdvancedCarverEngine()

    def progress_cb(info):
        asyncio.run(ws_manager.broadcast(case_id, info))

    carved_files = carver.carve_image(img_path, out_files_dir, progress_callback=None)

    # Step 4b: Non-Contiguous Fragment Detection & Reconstruction Engine
    await ws_manager.broadcast(case_id, {"type": "log", "message": "Step 4b: Running Non-Contiguous Fragment Reconstruction Engine..."})
    try:
        from hackathon_core.recovery.fragment_reconstructor import NonContiguousReconstructorEngine
        recon_engine = NonContiguousReconstructorEngine()
        img_bytes = img_path.read_bytes()
        detected_frags = recon_engine.detect_fragments_in_buffer(img_bytes, img_path.name)
        reconstructions = recon_engine.reconstruct_from_fragments(detected_frags, case_dir / "reconstructed_evidence")
        case["reconstructions"] = [r.to_dict() for r in reconstructions]
    except Exception as e:
        logger.error(f"Fragment reconstruction error: {e}")
        case["reconstructions"] = []

    # Combine & Classify Evidence
    classifier = EvidenceClassifier()
    recovered_catalog = []

    for c_file in carved_files:
        classified = classifier.classify_file(c_file.saved_path, {})
        file_meta = {
            "file_id": c_file.file_id,
            "original_offset": c_file.original_offset,
            "size": c_file.size,
            "extension": c_file.extension,
            "mime_type": c_file.mime_type,
            "hashes": c_file.hashes,
            "saved_path": str(c_file.saved_path),
            "confidence": c_file.confidence,
            "repaired": c_file.repaired,
            "category": classified["category"],
            "priority": classified["priority"],
            "tags": classified["tags"],
            "findings": classified["findings"],
        }
        recovered_catalog.append(file_meta)

        coc_tracker.record_event(
            action="FILE_CARVED",
            actor="CARVER_V2",
            target=c_file.file_id,
            hashes=c_file.hashes,
            notes=f"Carved at offset 0x{c_file.original_offset:08x} (Priority: {classified['priority']})",
        )

    case["recovered_files"] = recovered_catalog
    case["chain_of_custody"] = coc_tracker.events

    # Step 5: Timeline Synthesis & Report Export
    await ws_manager.broadcast(case_id, {"type": "log", "message": "Step 5/5: Synthesizing MACB timeline & generating FBI PDF report..."})
    timeline_synth = ForensicTimelineSynthesizer()
    timeline_synth.ingest_recovered_files(recovered_catalog)
    case["timeline"] = timeline_synth.get_chronological_timeline()

    # Export Reports
    pdf_path = case_dir / f"Forensic_Report_{case_id}.pdf"
    generate_forensic_pdf_report(case, pdf_path)
    case["pdf_report_path"] = str(pdf_path)

    json_path = case_dir / f"Case_Export_{case_id}.json"
    export_case_json(case, json_path)
    case["json_report_path"] = str(json_path)

    case["status"] = "COMPLETED"

    # Persist completed case to SQLite Database
    try:
        with SessionLocal() as session:
            repo = ForensicRepository(session)
            repo.save_case_manifest(case)
    except Exception as e:
        logger.error(f"Failed to persist case to SQLite: {e}")

    await ws_manager.broadcast(case_id, {"type": "complete", "case_id": case_id, "total_recovered": len(recovered_catalog)})


@app.websocket("/ws/scan/{case_id}")
async def websocket_endpoint(websocket: WebSocket, case_id: str):
    await ws_manager.connect(case_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(case_id, websocket)


@app.get("/api/files/{case_id}")
def get_recovered_files(
    case_id: str,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    case = get_case_or_404(case_id)
    files = case.get("recovered_files", [])

    if priority:
        files = [f for f in files if f.get("priority") == priority.upper()]
    if category:
        files = [f for f in files if f.get("category") == category.upper()]
    if search:
        s_lower = search.lower()
        files = [f for f in files if s_lower in f.get("file_id", "").lower() or s_lower in str(f.get("tags", [])).lower()]

    return {"count": len(files), "files": files}


@app.get("/api/hex/{case_id}/{file_id}")
def get_hex_preview(case_id: str, file_id: str, offset: int = 0, length: int = 512):
    """Retrieve raw bytes formatted for UI Hex Viewer component."""
    case = get_case_or_404(case_id)
    files = case.get("recovered_files", [])
    target = next((f for f in files if f["file_id"] == file_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="File not found")

    path = pathlib.Path(target["saved_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Physical file payload missing")

    with path.open("rb") as f:
        f.seek(offset)
        raw_bytes = f.read(length)

    hex_lines = []
    for i in range(0, len(raw_bytes), 16):
        chunk = raw_bytes[i : i + 16]
        hex_str = " ".join(f"{b:02X}" for b in chunk)
        ascii_str = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
        hex_lines.append({
            "offset": f"{offset + i:08X}",
            "hex": hex_str,
            "ascii": ascii_str,
        })

    return {
        "file_id": file_id,
        "total_size": path.stat().st_size,
        "offset": offset,
        "lines": hex_lines,
    }


@app.get("/api/report/{case_id}/pdf")
def download_pdf_report(case_id: str):
    case = get_case_or_404(case_id)
    path_str = case.get("pdf_report_path")
    pdf_path = pathlib.Path(path_str) if path_str else (CASES_DIR / case_id / f"Forensic_Report_{case_id}.pdf")
    if not pdf_path.exists():
        pdf_path.parent.mkdir(parents=True, exist_ok=True)
        generate_forensic_pdf_report(case, pdf_path)

    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        filename=f"Forensic_Report_{case_id}.pdf"
    )


@app.get("/api/ai/analysis/{case_id}")
def get_ai_decision_support(case_id: str):
    """Generate structured Gemini AI investigator decision support analysis for a case."""
    case_manifest = None
    if case_id in active_cases:
        case_manifest = active_cases[case_id]
    else:
        with SessionLocal() as session:
            repo = ForensicRepository(session)
            case_manifest = repo.get_case_manifest(case_id)

    if not case_manifest:
        raise HTTPException(status_code=404, detail="Case not found")

    advisor = GeminiDecisionSupportService()
    analysis = advisor.generate_investigator_analysis(case_manifest)
    return analysis

