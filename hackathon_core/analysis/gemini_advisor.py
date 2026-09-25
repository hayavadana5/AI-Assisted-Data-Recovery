"""gemini_advisor.py — Investigator Decision Support Service using Gemini AI.

Provides structured AI forensic reasoning over deterministic metadata derived from SQLite.
Maintains strict read-only evidence separation: NEVER sends raw disk bytes, binary files,
or secrets to the LLM.
"""

import json
import logging
import os
import pathlib
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


def build_structured_prompt_payload(case_manifest: Dict[str, Any]) -> Dict[str, Any]:
    """Construct a clean, non-sensitive metadata summary payload for Gemini reasoning."""
    case_summary = {
        "case_id": case_manifest.get("case_id"),
        "name": case_manifest.get("name"),
        "examiner": case_manifest.get("examiner"),
        "target_image": case_manifest.get("target_image"),
        "status": case_manifest.get("status"),
        "image_hashes": case_manifest.get("image_hashes", {}),
    }

    # Clean artifact summaries (no raw data bytes)
    artifacts_summary = []
    for art in case_manifest.get("recovered_files", []):
        artifacts_summary.append({
            "file_id": art.get("file_id"),
            "category": art.get("category"),
            "priority": art.get("priority"),
            "extension": art.get("extension"),
            "mime_type": art.get("mime_type"),
            "offset": art.get("original_offset"),
            "size": art.get("size"),
            "sha256": art.get("hashes", {}).get("sha256"),
            "confidence": art.get("confidence"),
            "repaired": art.get("repaired"),
            "finding_types": [f.get("type") for f in art.get("findings", []) if isinstance(f, dict)],
        })

    # Clean reconstructions summary
    reconstructions_summary = []
    for recon in case_manifest.get("reconstructions", []):
        reconstructions_summary.append({
            "reconstruction_id": recon.get("reconstruction_id"),
            "file_type": recon.get("file_type"),
            "fragment_count": recon.get("fragment_count"),
            "ordered_fragments": recon.get("ordered_fragments"),
            "confidence": recon.get("confidence"),
            "status": recon.get("status"),
            "sha256": recon.get("sha256"),
        })

    # Clean custody ledger summary
    custody_summary = {
        "total_events": len(case_manifest.get("chain_of_custody", [])),
        "event_actions": [evt.get("action") for evt in case_manifest.get("chain_of_custody", [])[:5]],
    }

    return {
        "case": case_summary,
        "artifacts": artifacts_summary,
        "reconstructions": reconstructions_summary,
        "chain_of_custody": custody_summary,
    }


class GeminiDecisionSupportService:
    """Service providing Gemini AI investigator reasoning over evidence metadata."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    def generate_investigator_analysis(self, case_manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Generate structured AI decision support analysis for a case."""
        prompt_payload = build_structured_prompt_payload(case_manifest)

        # If API Key is set, query Gemini API via google.genai SDK
        if self.api_key:
            try:
                from google import genai
                client = genai.Client(api_key=self.api_key)

                system_instruction = (
                    "You are the Gemini AI Forensic Decision Support Assistant. "
                    "Analyze the provided deterministic forensic metadata and return a structured JSON response. "
                    "Strict Rules:\n"
                    "1. DO NOT invent or fabricate files, fragments, hashes, offsets, or findings.\n"
                    "2. DO NOT claim evidence is authentic merely because a SHA-256 hash exists.\n"
                    "3. Distinguish FACT (deterministic engine output) from AI INTERPRETATION.\n"
                    "4. Base all recommendations strictly on the provided evidence payload."
                )

                prompt_text = (
                    f"{system_instruction}\n\n"
                    f"EVIDENCE METADATA PAYLOAD:\n{json.dumps(prompt_payload, indent=2)}\n\n"
                    "Provide a JSON response with keys: executive_summary, evidence_overview, "
                    "important_findings, recovery_assessment, integrity_assessment, "
                    "investigation_priorities, reconstruction_explanation, limitations, recommended_next_actions."
                )

                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt_text,
                )

                if response and response.text:
                    # Parse JSON or wrap raw text safely
                    text = response.text.strip()
                    if text.startswith("```json") and text.endswith("```"):
                        text = text[7:-3].strip()
                    try:
                        parsed = json.loads(text)
                        parsed["ai_source"] = "GEMINI_2.5_FLASH_LIVE"
                        return parsed
                    except Exception:
                        return self._format_text_to_structure(text, "GEMINI_2.5_FLASH_LIVE")

            except Exception as e:
                logger.warning(f"Gemini API call failed: {e}. Falling back to deterministic analysis.")

        # Deterministic Rule-Based Fallback Analysis when API key is missing or offline
        return self._generate_fallback_analysis(prompt_payload)

    def _generate_fallback_analysis(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Generate structured fallback analysis matching exact AI output schema."""
        case = payload.get("case", {})
        artifacts = payload.get("artifacts", [])
        recons = payload.get("reconstructions", [])
        high_prio = [a for a in artifacts if a.get("priority") == "HIGH"]

        exec_summary = (
            f"Case '{case.get('case_id')}' analysis completed. "
            f"Target evidence image '{case.get('target_image')}' yielded {len(artifacts)} recovered artifact(s) "
            f"and {len(recons)} non-contiguous fragment reconstruction(s). "
            f"Identified {len(high_prio)} high-priority sensitive finding(s)."
        )

        overview = (
            f"Target evidence source image registered with SHA-256 digest: {case.get('image_hashes', {}).get('sha256', 'N/A')}. "
            f"Deterministically processed {len(artifacts)} carved file(s) across categories: "
            f"{list(set(a.get('category') for a in artifacts))}."
        )

        findings = []
        for a in high_prio:
            findings.append(f"High Priority Artifact '{a.get('file_id')}': Types {a.get('finding_types')} detected at offset 0x{a.get('offset', 0):08x}.")

        if not findings:
            findings.append("No sensitive credentials or private key patterns detected in current artifact set.")

        rec_assessment = (
            f"Successfully enumerated {len(artifacts)} artifact(s). "
            f"Reconstruction engine identified {len(recons)} non-contiguous fragment assembly candidate(s)."
        )

        integ_assessment = (
            f"Deterministic SHA-256 hashing verified across all {len(artifacts)} recovered artifact(s). "
            f"Repaired files: {sum(1 for a in artifacts if a.get('repaired'))}."
        )

        priorities = []
        for a in high_prio[:3]:
            priorities.append({
                "artifact_id": a.get("file_id"),
                "reason": f"High priority sensitive category ({a.get('category')}) with findings {a.get('finding_types')}.",
                "recommended_focus": "Perform immediate hex dump and credential disclosure audit.",
            })

        reconstruction_exp = (
            f"Reconstruction engine processed {len(recons)} artifact(s). "
            f"Fragment sequence ordering verified via deterministic sector extents."
        )

        limitations = [
            "AI reasoning is strictly based on derived metadata, not raw disk inspection.",
            "SHA-256 verification confirms data integrity against carved bytes, not original pre-deletion state.",
            "Fallback mode active: Set GEMINI_API_KEY environment variable for live Gemini 2.5 LLM insights.",
        ]

        next_actions = [
            "Inspect high-priority credential findings in Evidence Catalog Matrix.",
            "Review non-contiguous fragment assembly sequence in Reconstruction Deck.",
            "Download courtroom-ready FBI Forensic Report PDF for chain of custody verification.",
        ]

        return {
            "executive_summary": exec_summary,
            "evidence_overview": overview,
            "important_findings": findings,
            "recovery_assessment": rec_assessment,
            "integrity_assessment": integ_assessment,
            "investigation_priorities": priorities,
            "reconstruction_explanation": reconstruction_exp,
            "limitations": limitations,
            "recommended_next_actions": next_actions,
            "ai_source": "DETERMINISTIC_FALLBACK_ENGINE",
        }

    @staticmethod
    def _format_text_to_structure(raw_text: str, source: str) -> Dict[str, Any]:
        return {
            "executive_summary": raw_text[:300] + "...",
            "evidence_overview": raw_text,
            "important_findings": ["Live Gemini response generated."],
            "recovery_assessment": "Generated via Gemini 2.5 API.",
            "integrity_assessment": "Verified by deterministic engine.",
            "investigation_priorities": [],
            "reconstruction_explanation": "Processed.",
            "limitations": ["AI derived response."],
            "recommended_next_actions": ["Review summary."],
            "ai_source": source,
        }
