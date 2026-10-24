#!/usr/bin/env python3
"""Test script to evaluate infer_direct pipeline against the Body Measurements Dataset.

Iterates through dataset folders, loads front_img.jpg and meta.json / measurements.json,
runs infer_direct from scripts/infer_image.py, and computes accuracy against ground truth.

Usage:
    # Test all images in the dataset
    python measurement-service/scripts/test_dataset.py

    # Test only the first N images (e.g. 3)
    python measurement-service/scripts/test_dataset.py --limit 3

    # Test a specific folder/id
    python measurement-service/scripts/test_dataset.py --id 0
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure measurement-service directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Import infer_direct from the original inference script
from scripts.infer_image import infer_direct


# Mapping from dataset json keys to pipeline output keys
METRIC_MAPPING = {
    "chest": "chest_circumference_cm",
    "waist": "waist_circumference_cm",
    "hips": "hips_circumference_cm",
    "shoulder_width": "shoulder_width_cm",
    "sleeve_length": "arm_length_cm",
    "inseam": "leg_length_cm",
    "neck": "neck_circumference_cm",
    "thigh": "thigh_circumference_cm",
}


def parse_number(val: Any) -> Optional[float]:
    """Safely extracts a float from values like '70.0_tbr', '159.0', 159, etc."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    match = re.search(r"[-+]?\d*\.?\d+", str(val))
    return float(match.group(0)) if match else None


def load_sample_meta(folder: Path) -> Optional[Dict[str, Any]]:
    """Loads metadata from meta.json or measurements.json in the folder."""
    for filename in ["meta.json", "measurements.json"]:
        json_file = folder / filename
        if json_file.exists():
            with open(json_file, "r", encoding="utf-8") as f:
                return json.load(f)
    # Check for any .json file in folder as fallback
    json_files = list(folder.glob("*.json"))
    if json_files:
        with open(json_files[0], "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def find_front_image(folder: Path) -> Optional[Path]:
    """Finds front facing photo in folder."""
    for name in ["front_img.jpg", "front_img.png", "front.jpg", "front.png"]:
        p = folder / name
        if p.exists():
            return p
    # Fallback: search for any image with 'front' in its filename
    for ext in ["*.jpg", "*.jpeg", "*.png", "*.webp"]:
        for p in folder.glob(ext):
            if "front" in p.name.lower():
                return p
    return None


def run_evaluation(
    dataset_dir: Path,
    limit: Optional[int] = None,
    target_id: Optional[str] = None,
    output_json: Optional[Path] = None,
):
    files_dir = dataset_dir / "files" if (dataset_dir / "files").exists() else dataset_dir

    if not files_dir.exists():
        print(f"Error: Dataset directory not found at: {files_dir}")
        sys.exit(1)

    # Collect subject folders
    folders = [f for f in files_dir.iterdir() if f.is_dir()]
    # Sort folders numerically if digits, else alphabetically
    folders.sort(key=lambda p: int(p.name) if p.name.isdigit() else p.name)

    if target_id is not None:
        folders = [f for f in folders if f.name == str(target_id)]
        if not folders:
            print(f"Error: Sample ID '{target_id}' not found in {files_dir}")
            sys.exit(1)

    if limit is not None and limit > 0:
        folders = folders[:limit]

    print("=" * 80)
    print(f" TESTING INFERENCE PIPELINE ON DATASET ({len(folders)} samples)")
    print(f" Dataset Path: {files_dir}")
    print("=" * 80)

    all_errors_cm: Dict[str, List[float]] = {k: [] for k in METRIC_MAPPING}
    all_accuracies: Dict[str, List[float]] = {k: [] for k in METRIC_MAPPING}
    results_summary: List[Dict[str, Any]] = []

    processed = 0
    failed = 0

    for idx, folder in enumerate(folders, start=1):
        sample_id = folder.name
        front_img = find_front_image(folder)
        meta = load_sample_meta(folder)

        if not front_img or not meta:
            print(f"\n[{idx}/{len(folders)}] Skipping {sample_id}: Missing image or metadata JSON.")
            failed += 1
            continue

        height_cm = parse_number(meta.get("height"))
        gender = str(meta.get("gender", "neutral")).strip().lower()

        if not height_cm:
            print(f"\n[{idx}/{len(folders)}] Skipping {sample_id}: Height missing in metadata.")
            failed += 1
            continue

        print(f"\n[{idx}/{len(folders)}] Processing Subject: {sample_id}")
        print(f"  Image: {front_img.name} | Stature: {height_cm} cm | Gender: {gender}")

        try:
            # Call original infer_direct script
            result = infer_direct(
                image_path=front_img,
                height_cm=height_cm,
                gender=gender,
            )

            pred_cm = result.get("measurements_cm", {})
            sample_report: Dict[str, Any] = {
                "id": sample_id,
                "gender": gender,
                "height_cm": height_cm,
                "metrics": {},
            }

            print("-" * 75)
            print(f"{'Metric':<18} | {'GT (cm)':<10} | {'Pred (cm)':<10} | {'Error (cm)':<12} | {'Accuracy (%)':<12}")
            print("-" * 75)

            for pred_key, gt_key in METRIC_MAPPING.items():
                gt_val = parse_number(meta.get(gt_key))
                pred_val = pred_cm.get(pred_key)

                if gt_val is not None and pred_val is not None and gt_val > 0:
                    err_cm = abs(pred_val - gt_val)
                    # Accuracy % = max(0, 100 - (abs(pred - gt) / gt * 100))
                    pct_err = (err_cm / gt_val) * 100.0
                    acc_pct = max(0.0, 100.0 - pct_err)

                    all_errors_cm[pred_key].append(err_cm)
                    all_accuracies[pred_key].append(acc_pct)

                    sample_report["metrics"][pred_key] = {
                        "gt_cm": round(gt_val, 1),
                        "pred_cm": round(pred_val, 1),
                        "error_cm": round(err_cm, 1),
                        "accuracy_pct": round(acc_pct, 1),
                    }

                    label = pred_key.replace("_", " ").title()
                    print(f"{label:<18} | {gt_val:>8.1f}   | {pred_val:>8.1f}   | {err_cm:>8.1f} cm  | {acc_pct:>8.1f}%")

            print("-" * 75)
            processed += 1
            results_summary.append(sample_report)

        except Exception as e:
            print(f"  [ERROR] Failed to run inference on {sample_id}: {e}")
            failed += 1

    # Print Aggregate Summary Table
    print("\n" + "=" * 80)
    print(" OVERALL ACCURACY AND ERROR SUMMARY ACROSS DATASET")
    print("=" * 80)
    print(f"{'Metric':<20} | {'Samples':<8} | {'MAE (cm)':<12} | {'MAE (mm)':<12} | {'Avg Accuracy':<14}")
    print("-" * 80)

    overall_mae_cm: Dict[str, float] = {}
    overall_acc: Dict[str, float] = {}

    for metric_key in METRIC_MAPPING:
        errs = all_errors_cm[metric_key]
        accs = all_accuracies[metric_key]
        if errs:
            mean_err_cm = sum(errs) / len(errs)
            mean_err_mm = mean_err_cm * 10.0
            mean_acc = sum(accs) / len(accs)
            overall_mae_cm[metric_key] = round(mean_err_cm, 2)
            overall_acc[metric_key] = round(mean_acc, 2)

            label = metric_key.replace("_", " ").title()
            print(f"{label:<20} | {len(errs):<8} | {mean_err_cm:>8.2f} cm  | {mean_err_mm:>8.1f} mm  | {mean_acc:>10.2f}%")

    print("=" * 80)
    print(f"Completed: {processed} samples | Skipped/Failed: {failed} samples")

    if output_json:
        output_json.parent.mkdir(parents=True, exist_ok=True)
        final_data = {
            "processed": processed,
            "failed": failed,
            "overall_mae_cm": overall_mae_cm,
            "overall_accuracy_pct": overall_acc,
            "samples": results_summary,
        }
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2)
        print(f"\nDetailed evaluation report saved to: {output_json}")


def main():
    parser = argparse.ArgumentParser(
        description="Test the original infer.py pipeline against the Body Measurements Dataset."
    )
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=BASE_DIR / "body-measurements-dataset",
        help="Path to body measurements dataset root (contains files/ folder)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of samples to evaluate (e.g. --limit 3 for quick test)",
    )
    parser.add_argument(
        "--id",
        type=str,
        default=None,
        help="Evaluate only a specific subject ID folder (e.g. --id 0)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional path to save JSON evaluation report",
    )

    args = parser.parse_args()
    run_evaluation(
        dataset_dir=args.dataset_dir,
        limit=args.limit,
        target_id=args.id,
        output_json=args.output,
    )


if __name__ == "__main__":
    main()
