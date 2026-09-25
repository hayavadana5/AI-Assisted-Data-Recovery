import csv, logging, subprocess, pathlib
from .hasher import hash_file

log = logging.getLogger(__name__)

def sleuthkit_extract(image: pathlib.Path, out_dir: pathlib.Path) -> None:
    """Run fls -d + icat for deleted entries."""
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "sleuthkit.csv"
    log.info("Running SleuthKit on %s", image)

    with csv_path.open("w", newline="", encoding="utf-8") as logf:
        writer = csv.writer(logf)
        writer.writerow(["inode", "type", "path", "exported_file",
                         "SHA-256", "MD5", "SHA-1"])
        fls_output = subprocess.check_output(["fls", "-r", "-d", str(image)], text=True)
        for line in fls_output.splitlines():
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            inode = parts[1].split(":")[0]
            ftype = parts[0][0]
            relpath = parts[-1].strip("/")
            if ftype not in {"r", "d"}:
                continue
            try:
                dst = out_dir / relpath
                dst.parent.mkdir(parents=True, exist_ok=True)
                subprocess.check_call(["icat", str(image), inode], stdout=dst.open("wb"))
                writer.writerow([
                    inode, ftype, relpath, str(dst),
                    hash_file(dst, "sha256"),
                    hash_file(dst, "md5"),
                    hash_file(dst, "sha1")
                ])
            except Exception as e:
                log.warning("icat inode %s failed: %s", inode, e)
                writer.writerow([inode, ftype, relpath, "FAILED", "", "", ""])