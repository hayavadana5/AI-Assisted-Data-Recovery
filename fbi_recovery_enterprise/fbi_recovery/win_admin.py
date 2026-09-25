import os, sys, ctypes

def ensure_admin() -> None:
    """Exit if Windows and not elevated."""
    if os.name == "nt" and not ctypes.windll.shell32.IsUserAnAdmin():
        print("Administrator rights required on Windows.")
        sys.exit(2)