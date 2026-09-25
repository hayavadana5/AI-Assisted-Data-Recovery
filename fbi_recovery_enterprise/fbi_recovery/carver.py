import logging, hashlib, pathlib
try:
    from tqdm import tqdm
except ImportError:
    def tqdm(iterable, *args, **kwargs):
        return iterable
from .signatures import SIGS

log = logging.getLogger(__name__)
CHUNK = 512 * 1024

def carve_raw(dev_path: pathlib.Path, out_dir: pathlib.Path, size_limit_mb: int = 50):
    out_dir.mkdir(exist_ok=True)
    seen_hash: set[str] = set()
    for sig in tqdm(SIGS, desc="Carving signatures", unit="sig"):
        _carve_single(dev_path, out_dir, sig, seen_hash, size_limit_mb)

def _carve_single(path, out_dir, sig, seen_hash, limit_mb):
    limit = limit_mb * 1024 * 1024
    with path.open("rb") as f:
        offset = 0
        while True:
            # BUG #2 FIX: Always seek to the chunk-aligned position before
            # reading.  After a match, f.read(max_size) can advance the
            # cursor far beyond the current chunk boundary; without this
            # seek, offset and the real cursor desynchronise and all
            # subsequent chunks are read from wrong positions.
            f.seek(offset)
            chunk = f.read(CHUNK)
            if not chunk:
                break
            start = 0
            while True:
                idx = chunk.find(sig.header, start)
                if idx == -1:
                    break
                abs_off = offset + idx
                f.seek(abs_off)
                data = f.read(min(sig.max_size, limit))
                if sig.footer:
                    end = data.find(sig.footer)
                    if end != -1:
                        data = data[: end + len(sig.footer)]
                h = hashlib.sha256(data).hexdigest()
                if h not in seen_hash:
                    seen_hash.add(h)
                    fname = out_dir / f"{sig.name}_{abs_off:010d}.{sig.ext}"
                    fname.write_bytes(data)
                start = idx + 1
            offset += CHUNK