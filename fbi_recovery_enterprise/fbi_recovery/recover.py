#!/usr/bin/env python3
import argparse, os, pathlib, subprocess, logging
from datetime import datetime
from .log_conf import setup as log_setup
from .win_admin import ensure_admin
from .imager import dd_image
from .tsk_wrapper import sleuthkit_extract
from .carver import carve_raw
from .reporter import sign_and_stamp

log = logging.getLogger(__name__)

def _device_or_file(path: str) -> str:
    if os.path.exists(path) or path.startswith("/dev/"):
        return path
    raise argparse.ArgumentTypeError(f"{path} is not a valid file or /dev node")

def _default_output_dir() -> pathlib.Path:
    """Generate a timestamped output directory name.

    Uses Python's datetime instead of shelling out to ``date`` so that it
    works on both Linux and Windows without depending on external commands.
    """
    return pathlib.Path("recovery_" + datetime.now().strftime("%Y%m%d_%H%M%S"))

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="FBI-level forensic imaging & carving")
    p.add_argument("device", type=_device_or_file, help="Block device or forensic image")
    p.add_argument("-o", "--output", default=None, type=pathlib.Path, help="Output folder")
    p.add_argument("--carve", action="store_true", help="Run raw file carving")
    p.add_argument("--image", action="store_true", help="Create forensic image first")
    p.add_argument("-v", "--verbose", action="store_true", help="Debug logging")
    return p.parse_args()

def main() -> None:
    ensure_admin()
    args = parse_args()
    out: pathlib.Path = args.output if args.output else _default_output_dir()
    out.mkdir(exist_ok=True)
    log_setup(level="DEBUG" if args.verbose else "INFO", output_dir=out)

    src = pathlib.Path(args.device)
    if args.image or not src.is_file():
        img = out / "forensic.img"
        dd_image(str(src), img)
        src = img

    log.info("Starting SleuthKit deleted-file recovery")
    try:
        sleuthkit_extract(src, out / "sleuthkit")
    except Exception as e:
        log.warning("SleuthKit extraction failed: %s – continuing to carving", e)

    if args.carve:
        log.info("Starting raw carving")
        carve_raw(src, out / "carved")

    csv_path = out / "sleuthkit" / "sleuthkit.csv"
    if csv_path.exists():
        sign_and_stamp(csv_path)
    log.info("Finished – report in %s", out.resolve())

if __name__ == "__main__":
    main()