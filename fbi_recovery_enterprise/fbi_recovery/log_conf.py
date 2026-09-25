import logging, sys
from pathlib import Path

def setup(level: str = "INFO", log_file: str = "fbi_recovery.log") -> None:
    """Initialise console + file logging."""
    handlers = [
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file, encoding="utf-8")
    ]
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers
    )