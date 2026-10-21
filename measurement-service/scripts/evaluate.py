#!/usr/bin/env python3
"""Evaluation script for Sui Dhaga Image-to-Measurements service.

Takes a folder of subject photos and a CSV of ground truth tape measurements,
computes Mean Absolute Error (MAE) in millimeters (mm), and benchmarks against
the SHAPY paper's published Human Bodies in the Wild (HBW) validation results.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

# Ensure measurement-service directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from typing import Dict, List, Optional
import numpy as np
from PIL import Image

# Published HBW validation MAE results from SHAPY paper (Choutas et al., CVPR 2022) in mm
SHAPY_HBW_BENCHMARKS_MM = {
    "height": 51.0,
    "chest": 65.0,
    "waist": 69.0,
    "hips": 57.0,
}


def evaluate_dataset(
    images_dir: Path,
    ground_truth_csv: Path,
    output_report: Optional[Path] = None,
) -> Dict[str, Any]:
    """Runs evaluation across all images and calculates MAE against tape measurements."""
    from app.pipeline.canonical import GenderedSMPLXCanonical
    from app.pipeline.measure import VirtualMeasurements
    from app.pipeline.preprocess import QualityGateAndDetector, decode_image_bytes
    from app.pipeline.shapy_infer import ShapyRegressor
    from app.pipeline.calibrate import calibrate_measurements

    print(f"Loading evaluation dataset from: {ground_truth_csv}")
    print(f"Images directory: {images_dir}")

    # Initialize pipeline
    quality_gate = QualityGateAndDetector()
    shapy = ShapyRegressor()
    canonical = GenderedSMPLXCanonical()
    measurer = VirtualMeasurements()

    rows: List[dict] = []
    with open(ground_truth_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)

    print(f"Found {len(rows)} subject ground truth entries.\n")

    errors_mm: Dict[str, List[float]] = {
        "height": [],
        "chest": [],
        "waist": [],
        "hips": [],
    }

    processed = 0
    skipped = 0

    for idx, row in enumerate(rows):
        img_name = row.get("image_name", row.get("filename", "")).strip()
        img_path = images_dir / img_name
        if not img_path.exists():
            print(f"[{idx+1}/{len(rows)}] Skipping missing image: {img_name}")
            skipped += 1
            continue

        gender = row.get("gender", "neutral").lower().strip()
        gt_height_cm = float(row["height_cm"])
        gt_chest_cm = float(row["chest_cm"])
        gt_waist_cm = float(row["waist_cm"])
        gt_hips_cm = float(row["hips_cm"])

        try:
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            pil_img = decode_image_bytes(img_bytes)
            crop, bbox, warnings = quality_gate.process_and_validate(pil_img)
            infer_out = shapy.infer(crop, gender=gender)
            verts, faces = canonical(infer_out["betas"], gender=gender)
            raw_meas = measurer.measure(verts, faces)
            calibrated = calibrate_measurements(raw_meas, user_height_cm=gt_height_cm)

            pred_cm = calibrated["measurements_cm"]

            # Compute absolute errors in millimeters (1 cm = 10 mm)
            err_height = abs(pred_cm["height"] - gt_height_cm) * 10.0
            err_chest = abs(pred_cm["chest"] - gt_chest_cm) * 10.0
            err_waist = abs(pred_cm["waist"] - gt_waist_cm) * 10.0
            err_hips = abs(pred_cm["hips"] - gt_hips_cm) * 10.0

            errors_mm["height"].append(err_height)
            errors_mm["chest"].append(err_chest)
            errors_mm["waist"].append(err_waist)
            errors_mm["hips"].append(err_hips)

            processed += 1
            print(f"[{idx+1}/{len(rows)}] {img_name}: Chest err={err_chest:.1f}mm, Waist err={err_waist:.1f}mm, Hips err={err_hips:.1f}mm")

        except Exception as e:
            print(f"[{idx+1}/{len(rows)}] Error evaluating {img_name}: {e}")
            skipped += 1

    # Compute MAE
    mae_mm: Dict[str, float] = {}
    for metric, err_list in errors_mm.items():
        mae_mm[metric] = float(np.mean(err_list)) if len(err_list) > 0 else 0.0

    # Print benchmark comparison table
    print("\n" + "=" * 80)
    print("SUI DHAGA EVALUATION vs. SHAPY CVPR 2022 HBW BENCHMARK RESULTS")
    print("=" * 80)
    print(f"{'Measurement':<18} | {'Sui Dhaga MAE':<15} | {'SHAPY HBW MAE':<15} | {'Delta vs. Paper':<16} | {'Status'}")
    print("-" * 80)

    for metric in ["height", "chest", "waist", "hips"]:
        sui_mae = mae_mm.get(metric, 0.0)
        paper_mae = SHAPY_HBW_BENCHMARKS_MM[metric]
        delta = sui_mae - paper_mae
        delta_str = f"{delta:+.1f} mm"

        if delta <= 0:
            status_str = "MATCHES/BETTER"
        elif delta <= 15.0:
            status_str = "SLIGHTLY WORSE"
        else:
            status_str = "WORSE (NEEDS CALIBRATION)"

        print(f"{metric.capitalize():<18} | {sui_mae:>10.1f} mm   | {paper_mae:>10.1f} mm   | {delta_str:>16} | {status_str}")

    print("=" * 80)
    print(f"Processed: {processed} images | Skipped/Failed: {skipped} images\n")

    report = {
        "processed_count": processed,
        "skipped_count": skipped,
        "mae_mm": mae_mm,
        "benchmark_hbw_mm": SHAPY_HBW_BENCHMARKS_MM,
    }

    if output_report:
        import json
        with open(output_report, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"Saved evaluation report to: {output_report}")

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Image-to-Measurements on volunteer dataset.")
    parser.add_argument("--images-dir", required=True, type=Path, help="Folder with customer photos")
    parser.add_argument("--gt-csv", required=True, type=Path, help="CSV with tape ground truth values")
    parser.add_argument("--output", type=Path, default=None, help="Optional output JSON report path")
    args = parser.parse_args()

    evaluate_dataset(args.images_dir, args.gt_csv, args.output)
