import csv, logging, subprocess, pathlib
from .hasher import hash_file

log = logging.getLogger(__name__)

def _parse_fls_line(line: str):
    """Parse a single fls output line into (inode, ftype, relpath) or None.

    fls output format:  'TYPE_FLAGS INODE:\\tFILENAME'
    Example:            'r/r 34:\\tsecret.txt'
    parts[0] = 'r/r 34:'   → contains type flags and inode
    parts[1] = 'secret.txt' → filename/path
    """
    parts = line.split("\t")
    if len(parts) < 2:
        return None
    # BUG #1 FIX: inode is in parts[0] (after the type prefix), NOT parts[1].
    # parts[0] example: 'r/r 34:' → split on whitespace → last element '34:' → split on ':' → '34'
    inode_field = parts[0].split()
    if len(inode_field) < 2:
        return None
    inode = inode_field[-1].split(":")[0]
    ftype = parts[0].strip()[0]
    relpath = parts[-1].strip("/")
    if ftype not in {"r", "d"}:
        return None
    return inode, ftype, relpath


def sleuthkit_extract(image: pathlib.Path, out_dir: pathlib.Path) -> None:
    """Run fls -d + icat for deleted entries.

    Gracefully handles the case where the image has no recognisable
    filesystem (fls returns a non-zero exit code).  This prevents a
    TSK failure from aborting the entire recovery pipeline before
    carving gets a chance to run.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "sleuthkit.csv"
    log.info("Running SleuthKit on %s", image)

    with csv_path.open("w", newline="", encoding="utf-8") as logf:
        writer = csv.writer(logf)
        writer.writerow(["inode", "type", "path", "exported_file",
                         "SHA-256", "MD5", "SHA-1"])
        try:
            fls_output = subprocess.check_output(
                ["fls", "-r", "-d", str(image)],
                text=True, stderr=subprocess.PIPE,
            )
        except FileNotFoundError:
            log.warning("fls binary not found – skipping SleuthKit extraction")
            return
        except subprocess.CalledProcessError as e:
            log.warning("fls failed (exit %d) – image may lack a filesystem: %s",
                        e.returncode, (e.stderr or "").strip())
            return

        for line in fls_output.splitlines():
            parsed = _parse_fls_line(line)
            if parsed is None:
                continue
            inode, ftype, relpath = parsed
            try:
                dst = out_dir / relpath
                dst.parent.mkdir(parents=True, exist_ok=True)
                with dst.open("wb") as out_f:
                    subprocess.check_call(["icat", str(image), inode], stdout=out_f)
                writer.writerow([
                    inode, ftype, relpath, str(dst),
                    hash_file(dst, "sha256"),
                    hash_file(dst, "md5"),
                    hash_file(dst, "sha1")
                ])
            except Exception as e:
                log.warning("icat inode %s failed: %s", inode, e)
                writer.writerow([inode, ftype, relpath, "FAILED", "", "", ""])