#!/usr/bin/env python3
"""Asset verification script for Sui Dhaga Image-to-Measurements service.

Verifies that proprietary SMPL-X body models and SHAPY model checkpoints
exist at their required file paths. If any assets are missing, provides
exact manual download and registration instructions.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


def check_assets(base_dir: Path | None = None) -> bool:
    if base_dir is None:
        base_dir = Path(__file__).resolve().parent.parent

    data_dir = Path(os.environ.get("DATA_DIR", base_dir / "data"))
    body_models_dir = Path(os.environ.get("SMPLX_MODEL_PATH", data_dir / "body_models" / "smplx"))
    shapy_checkpoint_dir = Path(os.environ.get("SHAPY_CHECKPOINT_PATH", data_dir / "trained_models" / "shapy" / "SHAPY_A"))

    required_smplx_files = [
        body_models_dir / "SMPLX_NEUTRAL.npz",
        body_models_dir / "SMPLX_FEMALE.npz",
        body_models_dir / "SMPLX_MALE.npz",
    ]

    missing_smplx: list[Path] = [p for p in required_smplx_files if not p.exists()]
    missing_shapy = not shapy_checkpoint_dir.exists()

    all_ok = len(missing_smplx) == 0 and not missing_shapy

    print("=" * 70)
    print("Sui Dhaga: Model Asset Verification")
    print("=" * 70)
    print(f"Base data directory: {data_dir}")
    print(f"SMPL-X directory:   {body_models_dir}")
    print(f"SHAPY directory:    {shapy_checkpoint_dir}")
    print("-" * 70)

    for p in required_smplx_files:
        status = "FOUND" if p.exists() else "MISSING"
        print(f"  [{status}] {p.name}")

    status_shapy = "FOUND" if not missing_shapy else "MISSING"
    print(f"  [{status_shapy}] SHAPY_A Checkpoint directory ({shapy_checkpoint_dir})")
    print("-" * 70)

    if all_ok:
        print("[SUCCESS] All required model assets are present.")
        print("=" * 70)
        return True

    print("\n[ATTENTION REQUIRED] One or more required research assets are missing.\n")

    if missing_smplx:
        print("--- SMPL-X Body Models Missing ---")
        print("Due to licensing terms, SMPL-X models cannot be committed or redistributed.")
        print("To obtain them:")
        print("  1. Register at: https://smpl-x.is.tue.mpg.de/")
        print("  2. Go to the 'Downloads' section and download the SMPL-X v1.1 model package.")
        print("  3. Extract the files and place them as:")
        print(f"     - {body_models_dir / 'SMPLX_NEUTRAL.npz'}")
        print(f"     - {body_models_dir / 'SMPLX_FEMALE.npz'}")
        print(f"     - {body_models_dir / 'SMPLX_MALE.npz'}\n")

    if missing_shapy:
        print("--- SHAPY Model Checkpoint Missing ---")
        print("Due to licensing terms, SHAPY model weights cannot be committed or redistributed.")
        print("To obtain them:")
        print("  1. Register at: https://shapy.is.tue.mpg.de/")
        print("  2. Download 'shapy_data.zip' from the downloads page or run the upstream")
        print("     data/download_data.sh script with your registered credentials.")
        print("  3. Place the SHAPY_A model folder at:")
        print(f"     - {shapy_checkpoint_dir}")
        print("     (Must contain the pretrained checkpoint files or config)\n")

    print("For commercial licensing inquiries, contact ps-licensing@tue.mpg.de")
    print("=" * 70)
    return False


if __name__ == "__main__":
    success = check_assets()
    sys.exit(0 if success else 1)
