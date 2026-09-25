
import hashlib
from pathlib import Path

def hash_file(path: Path, algo: str = "sha256") -> str:
    """Return lowercase hex digest of file."""
    h = hashlib.new(algo)
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()