import pathlib, subprocess, logging

log = logging.getLogger(__name__)

def sign_and_stamp(csv_path: pathlib.Path) -> None:
    """GPG-sign and RFC-3161 time-stamp the CSV (if tools present)."""
    asc = csv_path.with_suffix(".csv.asc")
    tsr = csv_path.with_suffix(".csv.tsr")
    try:
        subprocess.check_call(["gpg", "--detach-sign", "--armor", str(csv_path)])
        log.info("GPG signature: %s", asc)
    except FileNotFoundError:
        log.warning("gpg not found – skipping signature")
    try:
        subprocess.check_call(["tsa-client", "--in", str(csv_path), "--out", str(tsr)])
        log.info("RFC-3161 token: %s", tsr)
    except FileNotFoundError:
        log.warning("tsa-client not found – skipping time-stamp")