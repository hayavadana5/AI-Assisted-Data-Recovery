import logging, sys
from pathlib import Path

def setup(level: str = "INFO", log_file: str = "fbi_recovery.log",
          output_dir: Path | None = None) -> None:
    """Initialise console + file logging.

    If *output_dir* is given the log file is placed inside that directory
    rather than in the current working directory (fixes Bug #8).
    """
    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        log_path = output_dir / log_file
    else:
        log_path = Path(log_file)
    handlers = [
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(str(log_path), encoding="utf-8")
    ]
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers
    )