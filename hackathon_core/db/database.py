"""database.py — SQLite + SQLAlchemy Database Setup & Session Management.

Manages SQLite connection initialization, session creation, table creation,
and database path handling for persistent digital evidence storage.
"""

import os
import pathlib
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Base directory setup
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB_PATH = DATA_DIR / "forensics.db"
DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db(db_path: pathlib.Path = DEFAULT_DB_PATH):
    """Initialize database and create all tables if missing."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    custom_url = f"sqlite:///{db_path}"
    custom_engine = create_engine(custom_url, connect_args={"check_same_thread": False}, echo=False)
    Base.metadata.create_all(bind=custom_engine)
    return custom_engine


def get_db_session() -> Generator[Session, None, None]:
    """FastAPI dependency / Context manager yielding DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
