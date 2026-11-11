#!/usr/bin/env python3
"""Test script to evaluate infer_direct pipeline against the SSP-3D benchmarking dataset.

Loads images and ground truth SMPL shape labels from SSP-3D (ssp_3d/labels.npz),
computes ground-truth dimensions via canonical SMPL-X model, runs infer_direct
from scripts/infer_image.py, and calculates accuracy and error.

Usage:
    # Test first 5 samples in SSP-3D (default)
    python measurement-service/scripts/test_dataset.py --limit 5

    # Test all 311 samples
    python measurement-service/scripts/test_dataset.py --all

    # Test a specific sample by index or filename
    python measurement-service/scripts/test_dataset.py --id 0

    # Save output report to JSON
    python measurement-service/scripts/test_dataset.py --limit 5 --output output/ssp3d_test_report.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch

# Ensure measurement-service directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from scripts.infer_image import infer_direct
from app.core.config import settings
from app.pipeline.canonical import GenderedSMPLXCanonical
from app.pipeline.measure import VirtualMeasurements
from app.pipeline.preprocess import QualityGateAndDetector
from app.pipeline.shapy_infer import ShapyRegressor


def _make_singleton(cls):
    """Caches pipeline module instances so batch evaluation reuses loaded models in memory."""
    orig_init = cls.__init__
    instance = None

    def init_fn(self, *args, **kwargs):
        if hasattr(self, "_already_initialized"):
            return
        orig_init(self, *args, **kwargs)
        self._already_initialized = True

    def new_fn(c, *args, **kwargs):
        nonlocal instance
        if instance is None:
            instance = super(cls, c).__new__(c)
        return instance

    cls.__new__ = new_fn
    cls.__init__ = init_fn


# Enable singleton caching across batch inference
_make_singleton(ShapyRegressor)
_make_singleton(GenderedSMPLXCanonical)
_make_singleton(VirtualMeasurements)
_make_singleton(QualityGateAndDetector)


# Tailoring measurement keys to compare
METRICS = [
    ("chest", "Chest Circumference"),
    ("waist", "Waist Circumference"),
    ("hips", "Hips Circumference"),
    ("shoulder_width", "Shoulder Width"),
    ("sleeve_length", "Sleeve Length"),
    ("inseam", "Inseam / Leg"),
    ("thigh", "Thigh Circumference"),
]


def resolve_ssp3d_paths(dataset_dir: Path) -> Tuple[Path, Path]:
    """Finds labels.npz and images/ directory within SSP-3D directory."""
    candidates = [
        dataset_dir / "ssp_3d",
        dataset_dir,
        BASE_DIR / "SSP-3D" / "ssp_3d",
        BASE_DIR / "SSP-3D",
    ]
    for c in candidates:
        labels_file = c / "labels.npz"
        images_dir = c / "images"
        if labels_file.exists() and images_dir.exists():
            return labels_file, images_dir

    raise FileNotFoundError(
        f"Could not find labels.npz and images/ under {dataset_dir} or {BASE_DIR / 'SSP-3D'}"
    )


def compute_ground_truth_measurements(
    canonical: GenderedSMPLXCanonical,
    measurer: VirtualMeasurements,
    gt_betas: np.ndarray,
    gender: str,
) -> Dict[str, float]:
    """Generates ground truth anthropometric measurements from GT shape betas."""
    betas_tensor = torch.from_numpy(gt_betas).float()
    verts, faces = canonical(betas_tensor, gender=gender)
    raw = measurer.measure(verts, faces)
    # Convert meters to cm
    return {
        "height": round(raw["height"] * 100.0, 1),
        "chest": round(raw["chest"] * 100.0, 1),
        "waist": round(raw["waist"] * 100.0, 1),
        "hips": round(raw["hips"] * 100.0, 1),
        "shoulder_width": round(raw["shoulder_width"] * 100.0, 1),
        "sleeve_length": round(raw["sleeve_length"] * 100.0, 1),
        "inseam": round(raw["inseam"] * 100.0, 1),
        "neck": round(raw["neck"] * 100.0, 1),
        "thigh": round(raw["thigh"] * 100.0, 1),
    }


def run_evaluation(
    dataset_dir: Path,
    limit: Optional[int] = None,
    target_id: Optional[str] = None,
    output_json: Optional[Path] = None,
):
    # Locate SSP-3D files
    labels_file, images_dir = resolve_ssp3d_paths(dataset_dir)
    print("=" * 80)
    print(" SUI DHAGA: TESTING INFERENCE PIPELINE ON SSP-3D BENCHMARK")
    print(f" Dataset Path: {images_dir.parent}")
    print("=" * 80)

    data = np.load(labels_file)
    fnames = [str(f) for f in data["fnames"]]
    shapes = data["shapes"]
    genders_raw = [str(g).lower() for g in data["genders"]]

    total_available = len(fnames)
    print(f"Loaded SSP-3D dataset: {total_available} labeled subjects.\n")

    # Filter by target ID if requested
    indices = list(range(total_available))
    if target_id is not None:
        if target_id.isdigit():
            idx = int(target_id)
            if 0 <= idx < total_available:
                indices = [idx]
            else:
                print(f"Error: Sample index {target_id} out of range (0-{total_available - 1})")
                sys.exit(1)
        else:
            matches = [i for i, f in enumerate(fnames) if target_id in f]
            if matches:
                indices = [matches[0]]
            else:
                print(f"Error: Filename matching '{target_id}' not found.")
                sys.exit(1)
    elif limit is not None and limit > 0:
        indices = indices[:limit]

    # Initialize canonical and measurement components for ground truth extraction
    print("Initializing Ground-Truth Reference Mesh Generators...")
    canonical = GenderedSMPLXCanonical(model_path=settings.SMPLX_MODEL_PATH, device=settings.DEVICE)
    measurer = VirtualMeasurements(landmarks_path=settings.LANDMARKS_PATH)

    all_errors_cm: Dict[str, List[float]] = {k: [] for k, _ in METRICS}
    all_accuracies: Dict[str, List[float]] = {k: [] for k, _ in METRICS}
    results_summary: List[Dict[str, Any]] = []

    processed = 0
    failed = 0

    for step_num, i in enumerate(indices, start=1):
        fname = fnames[i]
        img_path = images_dir / fname
        gender = "female" if genders_raw[i] == "f" else "male"
        gt_betas = shapes[i]

        if not img_path.exists():
            print(f"[{step_num}/{len(indices)}] Skipping {fname}: Image file not found.")
            failed += 1
            continue

        try:
            # 1. Compute ground truth dimensions from SMPL shape parameter labels
            gt_meas = compute_ground_truth_measurements(canonical, measurer, gt_betas, gender)
            gt_height_cm = gt_meas["height"]

            print(f"\n[{step_num}/{len(indices)}] Subject #{i}: {fname}")
            print(f"  Gender: {gender.upper()} | Ground-Truth Stature: {gt_height_cm:.1f} cm")

            # 2. Run inference via the pipeline's infer_direct
            result = infer_direct(
                image_path=img_path,
                height_cm=gt_height_cm,
                gender=gender,
            )

            pred_cm = result.get("measurements_cm", {})

            sample_report: Dict[str, Any] = {
                "index": i,
                "filename": fname,
                "gender": gender,
                "gt_height_cm": gt_height_cm,
                "measurements": {},
            }

            print("-" * 75)
            print(f"{'Metric':<20} | {'GT (cm)':<10} | {'Pred (cm)':<10} | {'Error (cm)':<12} | {'Accuracy (%)':<12}")
            print("-" * 75)

            for key, label in METRICS:
                gt_val = gt_meas.get(key)
                pred_val = pred_cm.get(key)

                if gt_val is not None and pred_val is not None and gt_val > 0:
                    err_cm = abs(pred_val - gt_val)
                    pct_err = (err_cm / gt_val) * 100.0
                    acc_pct = max(0.0, 100.0 - pct_err)

                    all_errors_cm[key].append(err_cm)
                    all_accuracies[key].append(acc_pct)

                    sample_report["measurements"][key] = {
                        "gt_cm": gt_val,
                        "pred_cm": pred_val,
                        "error_cm": round(err_cm, 1),
                        "accuracy_pct": round(acc_pct, 1),
                    }

                    print(f"{label:<20} | {gt_val:>8.1f}   | {pred_val:>8.1f}   | {err_cm:>8.1f} cm  | {acc_pct:>8.1f}%")

            print("-" * 75)
            processed += 1
            results_summary.append(sample_report)

            # Flush intermediate progress to JSON every 5 samples
            if output_json and processed % 5 == 0:
                output_json.parent.mkdir(parents=True, exist_ok=True)
                with open(output_json, "w", encoding="utf-8") as f:
                    json.dump({"processed": processed, "total": len(indices), "samples": results_summary}, f, indent=2)

        except Exception as e:
            print(f"  [ERROR] Pipeline inference failed on {fname}: {e}")
            failed += 1

    # Print Aggregate Summary Table
    print("\n" + "=" * 80)
    print(" OVERALL ACCURACY AND ERROR SUMMARY ON SSP-3D BENCHMARK")
    print("=" * 80)
    print(f"{'Metric':<22} | {'Samples':<8} | {'MAE (cm)':<12} | {'MAE (mm)':<12} | {'Avg Accuracy':<14}")
    print("-" * 80)

    overall_mae_cm: Dict[str, float] = {}
    overall_acc: Dict[str, float] = {}

    for key, label in METRICS:
        errs = all_errors_cm[key]
        accs = all_accuracies[key]
        if errs:
            mean_err_cm = sum(errs) / len(errs)
            mean_err_mm = mean_err_cm * 10.0
            mean_acc = sum(accs) / len(accs)
            overall_mae_cm[key] = round(mean_err_cm, 2)
            overall_acc[key] = round(mean_acc, 2)

            print(f"{label:<22} | {len(errs):<8} | {mean_err_cm:>8.2f} cm  | {mean_err_mm:>8.1f} mm  | {mean_acc:>10.2f}%")

    print("=" * 80)
    print(f"Completed: {processed} samples | Skipped/Failed: {failed} samples")

    if output_json:
        output_json.parent.mkdir(parents=True, exist_ok=True)
        final_data = {
            "dataset": "SSP-3D",
            "total_samples": len(indices),
            "processed": processed,
            "failed": failed,
            "overall_mae_cm": overall_mae_cm,
            "overall_accuracy_pct": overall_acc,
            "samples": results_summary,
        }
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2)
        print(f"\nEvaluation report saved to: {output_json}")


def main():
    parser = argparse.ArgumentParser(
        description="Test the model pipeline (infer_image.py) on the SSP-3D Benchmark Dataset."
    )
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=BASE_DIR / "SSP-3D",
        help="Path to SSP-3D root directory (containing ssp_3d/labels.npz and images/)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=5,
        help="Limit number of samples to evaluate (default: 5 for quick check; use --all to run all)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Evaluate all 311 samples in the dataset",
    )
    parser.add_argument(
        "--id",
        type=str,
        default=None,
        help="Evaluate a specific sample by index (0-310) or substring filename",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("output") / "ssp3d_test_report.json",
        help="Optional path to save JSON evaluation report",
    )

    args = parser.parse_args()
    limit = None if args.all else args.limit

    run_evaluation(
        dataset_dir=args.dataset_dir,
        limit=limit,
        target_id=args.id,
        output_json=args.output,
    )


if __name__ == "__main__":
    main()
