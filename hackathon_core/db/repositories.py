"""repositories.py — Data Access Repository for Evidence Persistence.

Provides CRUD methods for persisting and retrieving Case, EvidenceSource,
Artifact, Fragment, Reconstruction, IntegrityResult, Finding, and ChainOfCustody.
"""

import datetime
import logging
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session
from .models import (
    CaseModel, EvidenceSourceModel, ArtifactModel, FragmentModel,
    ReconstructionModel, ReconstructionFragmentModel, IntegrityResultModel,
    FindingModel, ChainOfCustodyEventModel
)

logger = logging.getLogger(__name__)


class ForensicRepository:
    """Repository handling database persistence and retrieval for digital evidence."""

    def __init__(self, session: Session):
        self.db = session

    def save_case_manifest(self, case_dict: Dict[str, Any]) -> CaseModel:
        """Persist or update complete case manifest dictionary into SQLite database."""
        case_id_str = case_dict.get("case_id")
        if not case_id_str:
            raise ValueError("case_dict missing 'case_id'")

        # Query existing case or create new
        case = self.db.query(CaseModel).filter(CaseModel.case_id == case_id_str).first()
        if not case:
            case = CaseModel(
                case_id=case_id_str,
                name=case_dict.get("name", f"Case {case_id_str}"),
                examiner=case_dict.get("examiner", "Forensic Examiner"),
                status=case_dict.get("status", "PROCESSING"),
                target_image=str(case_dict.get("target_image", "")),
                image_size=case_dict.get("image_size", 0),
                image_sha256=case_dict.get("image_hashes", {}).get("sha256"),
                image_md5=case_dict.get("image_hashes", {}).get("md5"),
                image_sha1=case_dict.get("image_hashes", {}).get("sha1"),
            )
            self.db.add(case)
            self.db.flush()
        else:
            case.status = case_dict.get("status", case.status)
            case.name = case_dict.get("name", case.name)
            case.examiner = case_dict.get("examiner", case.examiner)

        # 1. Evidence Source
        if "target_image" in case_dict and not case.evidence_sources:
            src = EvidenceSourceModel(
                case_id=case.id,
                path=str(case_dict["target_image"]),
                source_type="RAW_IMAGE",
                size=case_dict.get("image_size", 0),
                hashes_json=case_dict.get("image_hashes", {}),
            )
            self.db.add(src)

        # 2. Artifacts
        existing_artifacts = {a.filename: a for a in case.artifacts}
        for f_info in case_dict.get("recovered_files", []):
            fname = f_info.get("file_id") or f_info.get("path") or "unnamed"
            if fname not in existing_artifacts:
                art = ArtifactModel(
                    case_id=case.id,
                    filename=fname,
                    path=str(f_info.get("saved_path", "")),
                    offset=f_info.get("original_offset", 0),
                    size=f_info.get("size", 0),
                    extension=f_info.get("extension", "raw"),
                    mime_type=f_info.get("mime_type", "application/octet-stream"),
                    sha256=f_info.get("hashes", {}).get("sha256"),
                    md5=f_info.get("hashes", {}).get("md5"),
                    sha1=f_info.get("hashes", {}).get("sha1"),
                    sha512=f_info.get("hashes", {}).get("sha512"),
                    category=f_info.get("category", "UNCLASSIFIED"),
                    priority=f_info.get("priority", "LOW"),
                    confidence=f_info.get("confidence", 1.0),
                    repaired=f_info.get("repaired", False),
                    tags_json=f_info.get("tags", []),
                    findings_json=f_info.get("findings", []),
                    recovery_method=f_info.get("recovery_method", "CARVER_V2"),
                )
                self.db.add(art)
                self.db.flush()
                existing_artifacts[fname] = art

                # Integrity result per artifact
                integrity = IntegrityResultModel(
                    artifact_id=art.id,
                    validation_status="PASSED" if f_info.get("confidence", 1.0) >= 0.7 else "CHECK_FAILED",
                    corruption_status="REPAIRED" if f_info.get("repaired") else "INTACT",
                    hashes_json=f_info.get("hashes", {}),
                )
                self.db.add(integrity)

                # Findings per artifact
                for finding_data in f_info.get("findings", []):
                    f_obj = FindingModel(
                        artifact_id=art.id,
                        finding_type=finding_data.get("type", "PATTERN_MATCH"),
                        description=f"Detected {finding_data.get('count', 1)} match(es) for {finding_data.get('type')}",
                        severity=f_info.get("priority", "LOW"),
                        evidence_support_json=finding_data,
                    )
                    self.db.add(f_obj)

        # 3. Fragments & Reconstructions
        existing_frags = {fr.fragment_id: fr for fr in case.fragments}
        existing_recons = {r.reconstruction_id: r for r in case.reconstructions}

        for recon_data in case_dict.get("reconstructions", []):
            r_id = recon_data.get("reconstruction_id")
            if r_id not in existing_recons:
                recon = ReconstructionModel(
                    case_id=case.id,
                    reconstruction_id=r_id,
                    fragment_count=recon_data.get("fragment_count", 0),
                    output_path=str(recon_data.get("output_path", "")),
                    output_size=recon_data.get("total_size", 0),
                    sha256=recon_data.get("sha256", ""),
                    confidence=recon_data.get("confidence", 0.0),
                    confidence_factors_json=recon_data.get("confidence_factors", []),
                    status=recon_data.get("status", "RECONSTRUCTED"),
                )
                self.db.add(recon)
                self.db.flush()
                existing_recons[r_id] = recon

                # Link ordered fragments
                for seq_idx, frag_id_str in enumerate(recon_data.get("ordered_fragments", [])):
                    if frag_id_str not in existing_frags:
                        frag = FragmentModel(
                            fragment_id=frag_id_str,
                            case_id=case.id,
                            source_image=case.target_image,
                            offset=recon_data.get("metadata", {}).get("offsets", [0])[min(seq_idx, len(recon_data.get("metadata", {}).get("offsets", [0]))-1)],
                            size=512,
                            file_type=recon_data.get("file_type", "RAW"),
                            signature=recon_data.get("file_type", "RAW"),
                            sha256=recon_data.get("sha256", ""),
                            entropy=4.0,
                            sequence=seq_idx,
                            confidence=recon_data.get("confidence", 1.0),
                            reconstruction_status="RECONSTRUCTED",
                        )
                        self.db.add(frag)
                        self.db.flush()
                        existing_frags[frag_id_str] = frag
                    else:
                        frag = existing_frags[frag_id_str]

                    link = ReconstructionFragmentModel(
                        reconstruction_id=recon.id,
                        fragment_id=frag.id,
                        sequence_order=seq_idx,
                    )
                    self.db.add(link)

        # 4. Chain of Custody Events
        existing_coc = {evt.event_id_num: evt for evt in case.custody_events}
        for evt_data in case_dict.get("chain_of_custody", []):
            e_num = evt_data.get("event_id", 1)
            if e_num not in existing_coc:
                c_evt = ChainOfCustodyEventModel(
                    case_id=case.id,
                    event_id_num=e_num,
                    timestamp=evt_data.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()),
                    action=evt_data.get("action", "ACTION"),
                    actor=evt_data.get("actor", case.examiner),
                    target=evt_data.get("target", case.target_image),
                    description=evt_data.get("notes", ""),
                    current_hash=evt_data.get("current_hash", ""),
                    prev_hash=evt_data.get("prev_hash", "GENESIS_BLOCK"),
                    notes=evt_data.get("notes", ""),
                )
                self.db.add(c_evt)
                existing_coc[e_num] = c_evt

        self.db.commit()
        self.db.refresh(case)
        return case

    def get_case_manifest(self, case_id_str: str) -> Optional[Dict[str, Any]]:
        """Retrieve complete case manifest dictionary from database."""
        case = self.db.query(CaseModel).filter(CaseModel.case_id == case_id_str).first()
        if not case:
            return None

        # Build recovered files array
        recovered_files = []
        for art in case.artifacts:
            recovered_files.append({
                "file_id": art.filename,
                "original_offset": art.offset,
                "size": art.size,
                "extension": art.extension,
                "mime_type": art.mime_type,
                "hashes": {
                    "sha256": art.sha256,
                    "md5": art.md5,
                    "sha1": art.sha1,
                    "sha512": art.sha512,
                },
                "saved_path": art.path,
                "confidence": art.confidence,
                "repaired": art.repaired,
                "category": art.category,
                "priority": art.priority,
                "tags": art.tags_json or [],
                "findings": art.findings_json or [],
            })

        # Build reconstructions array
        reconstructions = []
        for recon in case.reconstructions:
            ordered_frag_ids = [
                rf.fragment.fragment_id for rf in recon.reconstruction_fragments if rf.fragment
            ]
            reconstructions.append({
                "reconstruction_id": recon.reconstruction_id,
                "file_type": recon.reconstruction_id.split("_")[1].upper() if "_" in recon.reconstruction_id else "RAW",
                "total_size": recon.output_size,
                "fragment_count": recon.fragment_count,
                "ordered_fragments": ordered_frag_ids,
                "confidence": recon.confidence,
                "confidence_factors": recon.confidence_factors_json or [],
                "output_path": recon.output_path,
                "sha256": recon.sha256,
                "status": recon.status,
            })

        # Build chain of custody array
        coc_events = []
        for evt in sorted(case.custody_events, key=lambda x: x.event_id_num):
            coc_events.append({
                "event_id": evt.event_id_num,
                "timestamp": evt.timestamp,
                "action": evt.action,
                "actor": evt.actor,
                "target": evt.target,
                "notes": evt.notes,
                "current_hash": evt.current_hash,
                "prev_hash": evt.prev_hash,
            })

        return {
            "case_id": case.case_id,
            "name": case.name,
            "examiner": case.examiner,
            "target_image": case.target_image,
            "status": case.status,
            "created_at": case.created_at.isoformat() if case.created_at else "",
            "image_hashes": {
                "sha256": case.image_sha256,
                "md5": case.image_md5,
                "sha1": case.image_sha1,
            },
            "recovered_files": recovered_files,
            "reconstructions": reconstructions,
            "chain_of_custody": coc_events,
        }

    def list_all_cases(self) -> List[Dict[str, Any]]:
        """List summary of all persisted cases."""
        cases = self.db.query(CaseModel).order_by(CaseModel.created_at.desc()).all()
        results = []
        for c in cases:
            results.append({
                "case_id": c.case_id,
                "name": c.name,
                "examiner": c.examiner,
                "status": c.status,
                "target_image": c.target_image,
                "files_recovered_count": len(c.artifacts),
                "created_at": c.created_at.isoformat() if c.created_at else "",
            })
        return results
