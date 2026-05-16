from pathlib import Path
import shutil

REPO_ROOT = Path(__file__).resolve().parents[1]
INCOMING_DIR = REPO_ROOT / "_incoming_raw"
ASSETS_DIR = REPO_ROOT / "assets"

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def main():
    if not INCOMING_DIR.exists():
        raise SystemExit(f"[ERROR] Missing folder: {INCOMING_DIR}")

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    files = sorted(
        [
            file for file in INCOMING_DIR.iterdir()
            if file.is_file() and file.suffix.lower() in VALID_EXTENSIONS
        ],
        key=lambda file: file.name.lower()
    )

    if not files:
        raise SystemExit("[ERROR] No image files found in _incoming_raw")

    existing_raw_logs = sorted(ASSETS_DIR.glob("raw-log-*.jpg"))
    next_number = len(existing_raw_logs) + 1

    print(f"[INFO] Found {len(files)} incoming images")
    print(f"[INFO] Existing RAW LOGS: {len(existing_raw_logs)}")
    print(f"[INFO] Starting at raw-log-{next_number:03d}.jpg")

    for index, source in enumerate(files, start=next_number):
        target = ASSETS_DIR / f"raw-log-{index:03d}.jpg"

        if target.exists():
            raise SystemExit(f"[ERROR] Target already exists: {target}")

        shutil.copy2(source, target)
        print(f"[OK] {source.name} -> assets/{target.name}")

    print("[DONE] RAW LOG import complete")

if __name__ == "__main__":
    main()
