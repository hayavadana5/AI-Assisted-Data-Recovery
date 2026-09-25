"""models.py — SQLAlchemy ORM Data Models for Persistent Evidence Storage.

Defines tables and relationships for Case, EvidenceSource, Artifact, Fragment,
Reconstruction, ReconstructionFragment, IntegrityResult, Finding, and ChainOfCustodyEvent.
"""

import datetime
from typing import List, Optional

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Table
)
from sqlalchemy.orm import relationship, Mapped

from .database import Base


class CaseModel(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    examiner = Column(String(255), nullable=False)
    status = Column(String(32), default="PROCESSING", nullable=False)
    target_image = Column(String(512), nullable=False)
    image_size = Column(Integer, default=0)
    image_sha256 = Column(String(64), nullable=True)
    image_md5 = Column(String(32), nullable=True)
    image_sha1 = Column(String(40), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))

    # Relationships
    evidence_sources = relationship("EvidenceSourceModel", back_populates="case", cascade="all, delete-orphan")
    artifacts = relationship("ArtifactModel", back_populates="case", cascade="all, delete-orphan")
    fragments = relationship("FragmentModel", back_populates="case", cascade="all, delete-orphan")
    reconstructions = relationship("ReconstructionModel", back_populates="case", cascade="all, delete-orphan")
    custody_events = relationship("ChainOfCustodyEventModel", back_populates="case", cascade="all, delete-orphan")


class EvidenceSourceModel(Base):
    __tablename__ = "evidence_sources"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    path = Column(String(512), nullable=False)
    source_type = Column(String(64), default="RAW_IMAGE", nullable=False)
    size = Column(Integer, default=0)
    hashes_json = Column(JSON, nullable=True)
    acquisition_metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    case = relationship("CaseModel", back_populates="evidence_sources")


class ArtifactModel(Base):
    __tablename__ = "artifacts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    path = Column(String(512), nullable=False)
    offset = Column(Integer, default=0)
    size = Column(Integer, default=0)
    extension = Column(String(32), default="raw")
    mime_type = Column(String(128), default="application/octet-stream")
    sha256 = Column(String(64), index=True, nullable=True)
    md5 = Column(String(32), nullable=True)
    sha1 = Column(String(40), nullable=True)
    sha512 = Column(String(128), nullable=True)
    category = Column(String(64), default="UNCLASSIFIED")
    priority = Column(String(32), default="LOW")
    confidence = Column(Float, default=1.0)
    repaired = Column(Boolean, default=False)
    tags_json = Column(JSON, nullable=True)
    findings_json = Column(JSON, nullable=True)
    recovery_method = Column(String(64), default="CARVER_V2")
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    case = relationship("CaseModel", back_populates="artifacts")
    integrity_results = relationship("IntegrityResultModel", back_populates="artifact", cascade="all, delete-orphan")
    findings = relationship("FindingModel", back_populates="artifact", cascade="all, delete-orphan")


class FragmentModel(Base):
    __tablename__ = "fragments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    fragment_id = Column(String(64), index=True, nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    artifact_id = Column(Integer, ForeignKey("artifacts.id", ondelete="SET NULL"), nullable=True)
    source_image = Column(String(255), nullable=False)
    offset = Column(Integer, default=0)
    size = Column(Integer, default=0)
    file_type = Column(String(32), nullable=False)
    signature = Column(String(32), nullable=False)
    sha256 = Column(String(64), nullable=False)
    entropy = Column(Float, default=0.0)
    sequence = Column(Integer, default=-1)
    confidence = Column(Float, default=0.0)
    reconstruction_status = Column(String(32), default="UNASSIGNED")
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    case = relationship("CaseModel", back_populates="fragments")
    artifact = relationship("ArtifactModel")


class ReconstructionModel(Base):
    __tablename__ = "reconstructions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    reconstruction_id = Column(String(64), index=True, nullable=False)
    artifact_id = Column(Integer, ForeignKey("artifacts.id", ondelete="SET NULL"), nullable=True)
    fragment_count = Column(Integer, default=0)
    output_path = Column(String(512), nullable=False)
    output_size = Column(Integer, default=0)
    sha256 = Column(String(64), nullable=False)
    confidence = Column(Float, default=0.0)
    confidence_factors_json = Column(JSON, nullable=True)
    status = Column(String(32), default="RECONSTRUCTED")
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    case = relationship("CaseModel", back_populates="reconstructions")
    reconstruction_fragments = relationship("ReconstructionFragmentModel", back_populates="reconstruction", cascade="all, delete-orphan", order_by="ReconstructionFragmentModel.sequence_order")


class ReconstructionFragmentModel(Base):
    __tablename__ = "reconstruction_fragments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reconstruction_id = Column(Integer, ForeignKey("reconstructions.id", ondelete="CASCADE"), nullable=False)
    fragment_id = Column(Integer, ForeignKey("fragments.id", ondelete="CASCADE"), nullable=False)
    sequence_order = Column(Integer, nullable=False, default=0)

    reconstruction = relationship("ReconstructionModel", back_populates="reconstruction_fragments")
    fragment = relationship("FragmentModel")


class IntegrityResultModel(Base):
    __tablename__ = "integrity_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    artifact_id = Column(Integer, ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False)
    validation_status = Column(String(32), default="PASSED")
    corruption_status = Column(String(32), default="INTACT")
    corruption_details_json = Column(JSON, nullable=True)
    entropy_info_json = Column(JSON, nullable=True)
    repair_status = Column(String(32), default="NONE")
    hashes_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    artifact = relationship("ArtifactModel", back_populates="integrity_results")


class FindingModel(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    artifact_id = Column(Integer, ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False)
    finding_type = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), default="LOW")
    evidence_support_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    artifact = relationship("ArtifactModel", back_populates="findings")


class ChainOfCustodyEventModel(Base):
    __tablename__ = "chain_of_custody_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    event_id_num = Column(Integer, nullable=False)
    timestamp = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)
    actor = Column(String(255), nullable=False)
    target = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    current_hash = Column(String(64), nullable=False)
    prev_hash = Column(String(64), nullable=False)
    notes = Column(Text, nullable=True)

    case = relationship("CaseModel", back_populates="custody_events")
