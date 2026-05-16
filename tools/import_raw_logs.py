from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image, ImageOps

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INCOMING_DIR = REPO_ROOT / "_incoming_raw"
ASSETS_DIR = REPO_ROOT / "assets"
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Eddie RAW LOG images as compressed web assets.")
    parser.add_argument("--source", default=str(DEFAULT_INCOMING_DIR), help="Folder with original RAW LOG images.")
    parser.add_argument("--limit", type=int, default=0, help="Maximum number of images to import. 0 means all.")
    parser.add_argument("--max-edge", type=int, default=1600, help="Maximum width/height in pixels.")
    parser.add_argument("--quality", type=int, default=82, help="JPEG quality, recommended 78-85.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be imported without writing files.")
    return parser.parse_args()


def next_raw_log_number() -> int:
    existing_numbers = []
    for file in ASSETS_DIR.glob("raw-log-*.jpg"):
        stem = file.stem.replace("raw-log-", "")
        if stem.isdigit():
            existing_numbers.append(int(stem))
    return max(existing_numbers, default=0) + 1


def iter_images(source_dir: Path) -> list[Path]:
    return sorted(
        [file for file in source_dir.iterdir() if file.is_file() and file.suffix.lower() in VALID_EXTENSIONS],
        key=lambda file: file.name.lower(),
    )


def save_web_jpg(source: Path, target: Path, *, max_edge: int, quality: int) -> None:
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")
        img.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        img.save(target, "JPEG", quality=quality, optimize=True, progressive=True)


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source).expanduser().resolve()

    if not source_dir.exists():
        raise SystemExit(f"[ERROR] Missing source folder: {source_dir}")

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    files = iter_images(source_dir)

    if args.limit > 0:
        files = files[: args.limit]

    if not files:
        raise SystemExit(f"[ERROR] No image files found in {source_dir}")

    start_number = next_raw_log_number()

    print(f"[INFO] Source: {source_dir}")
    print(f"[INFO] Images found: {len(files)}")
    print(f"[INFO] Starting at raw-log-{start_number:03d}.jpg")
    print(f"[INFO] Max edge: {args.max_edge}px | Quality: {args.quality}")

    for offset, source in enumerate(files):
        number = start_number + offset
        target = ASSETS_DIR / f"raw-log-{number:03d}.jpg"

        if target.exists():
            raise SystemExit(f"[ERROR] Target already exists: {target}")

        if args.dry_run:
            print(f"[DRY] {source.name} -> assets/{target.name}")
            continue

        save_web_jpg(source, target, max_edge=args.max_edge, quality=args.quality)
        source_mb = source.stat().st_size / 1024 / 1024
        target_kb = target.stat().st_size / 1024
        print(f"[OK] {source.name} ({source_mb:.1f} MB) -> assets/{target.name} ({target_kb:.0f} KB)")

    print("[DONE] RAW LOG web import complete")


if __name__ == "__main__":
    main()
