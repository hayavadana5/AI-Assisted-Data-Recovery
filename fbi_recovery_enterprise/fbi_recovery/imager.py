import hashlib, subprocess, logging
from pathlib import Path
from tqdm import tqdm

log = logging.getLogger(__name__)

def dd_image(src: str, dst: Path, block: str = "4M") -> str:
    """Bit-for-bit copy with progress (fallback to dd)."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["dd", f"if={src}", f"of={dst}", f"bs={block}", "conv=noerror,sync"]
    log.info("Imaging %s → %s", src, dst)
    subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL)

    # SHA-256
    log.info("Hashing image …")
    sha = hashlib.sha256()
    size = dst.stat().st_size
    with dst.open("rb") as f, tqdm(total=size, unit="B", unit_scale=True) as bar:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            sha.update(chunk)
            bar.update(len(chunk))
    digest = sha.hexdigest()
    Path(str(dst) + ".sha256").write_text(digest + "  " + dst.name + "\n")
    log.info("Image SHA-256: %s", digest)
    return digest