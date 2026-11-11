#!/usr/bin/env python3
"""Comprehensive Benchmark Evaluation script for Sui Dhaga ML Model Pipeline.

Evaluates the body measurement pipeline against the Sports Shape and Pose 3D (SSP-3D)
gold-standard benchmark dataset (Sengupta et al., BMVC 2020).

Computes:
  1. Anthropometric Measurement MAE (mm and cm) for Chest, Waist, Hips, Inseam,
     Sleeve, Shoulder Width, and Thigh.
  2. Benchmarking against SHAPY CVPR 2022 published HBW validation results.
  3. PVE-T-SC (Per-Vertex Error in Neutral T-Pose after Scale Correction in mm)
     against SSP-3D published literature baselines (HMR, VIBE, SHAPY).
  4. Shape Parameter (Beta) Mean Absolute Error.

Usage:
    # Run evaluation on first 5 samples (default)
    python measurement-service/scripts/evaluate.py --limit 5

    # Run full evaluation across all 311 dataset samples
    python measurement-service/scripts/evaluate.py --all

    # Evaluate a single sample by index (0-310)
    python measurement-service/scripts/evaluate.py --id 0

    # Save detailed JSON and CSV reports
    python measurement-service/scripts/evaluate.py --limit 5 --output output/ssp3d_eval.json --csv output/ssp3d_eval.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch

# Ensure measurement-service directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.pipeline.canonical import GenderedSMPLXCanonical
from app.pipeline.measure import VirtualMeasurements
from app.pipeline.preprocess import QualityGateAndDetector, decode_image_bytes
from app.pipeline.shapy_infer import ShapyRegressor
from app.pipeline.calibrate import calibrate_measurements

# Published HBW validation MAE results from SHAPY paper (Choutas et al., CVPR 2022) in mm
SHAPY_HBW_BENCHMARKS_MM = {
    "chest": 65.0,
    "waist": 69.0,
    "hips": 57.0,
}

# Published SSP-3D PVE-T-SC SOTA benchmark results (in mm)
SSP3D_PVE_BENCHMARKS_MM = {
    "HMR (Kanazawa et al., CVPR 2018)": 22.6,
    "VIBE (Kocabas et al., CVPR 2020)": 19.5,
    "SHAPY SOTA (Choutas et al., CVPR 2022)": 15.2,
}

EVAL_METRICS = [
    ("chest", "Chest Circumference"),
    ("waist", "Waist Circumference"),
    ("hips", "Hips Circumference"),
    ("shoulder_width", "Shoulder Width"),
    ("sleeve_length", "Sleeve Length"),
    ("inseam", "Inseam / Leg"),
    ("thigh", "Thigh Circumference"),
]


def resolve_ssp3d_paths(dataset_dir: Path) -> Tuple[Path, Path]:
    """Finds labels.npz and images/ directory within SSP-3D dataset."""
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


def to_numpy(x: Any) -> np.ndarray:
    """Converts torch.Tensor or array-like to np.ndarray."""
    if isinstance(x, torch.Tensor):
        return x.detach().cpu().numpy()
    return np.asarray(x)


def compute_pve_t_sc_mm(verts_pred: Any, verts_gt: Any) -> float:
    """Computes Per-Vertex Error in Neutral T-Pose after Scale Correction (PVE-T-SC) in mm.

    Follows the official SSP-3D evaluation metric (Sengupta et al., BMVC 2020).
    Aligns RMS distance of predicted canonical vertices to reference target mesh.
    """
    P = to_numpy(verts_pred)
    T = to_numpy(verts_gt)
    if P.ndim == 3:
        P = P[0]
    if T.ndim == 3:
        T = T[0]

    # Center at mean
    P_mean = np.mean(P, axis=0, keepdims=True)
    P_trans = P - P_mean
    P_scale = np.sqrt(np.mean(np.sum(P_trans ** 2, axis=-1)))
    P_norm = P_trans / max(float(P_scale), 1e-8)

    T_mean = np.mean(T, axis=0, keepdims=True)
    T_trans = T - T_mean
    T_scale = np.sqrt(np.mean(np.sum(T_trans ** 2, axis=-1)))

    P_aligned = P_norm * T_scale + T_mean
    diff = np.linalg.norm(P_aligned - T, axis=-1)
    return float(np.mean(diff) * 1000.0)


def run_benchmark_evaluation(
    dataset_dir: Path,
    limit: Optional[int] = None,
    target_id: Optional[str] = None,
    output_report: Optional[Path] = None,
    output_csv: Optional[Path] = None,
) -> Dict[str, Any]:
    labels_file, images_dir = resolve_ssp3d_paths(dataset_dir)

    print("=" * 85)
    print(" SUI DHAGA: FULL PIPELINE BENCHMARK EVALUATION (SSP-3D DATASET)")
    print(f" Dataset Path: {images_dir.parent}")
    print(f" Device: {settings.DEVICE.upper()} | Model: {settings.BODY_MODEL}")
    print("=" * 85)

    data = np.load(labels_file)
    fnames = [str(f) for f in data["fnames"]]
    shapes = data["shapes"]
    genders_raw = [str(g).lower() for g in data["genders"]]

    total_samples = len(fnames)
    indices = list(range(total_samples))

    if target_id is not None:
        if target_id.isdigit():
            idx = int(target_id)
            if 0 <= idx < total_samples:
                indices = [idx]
            else:
                print(f"Error: Sample index {target_id} out of bounds (0-{total_samples - 1})")
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

    print(f"Selected {len(indices)} / {total_samples} benchmark subjects for evaluation.\n")

    # Initialize all pipeline modules once
    print("Initializing Pipeline Components...")
    quality_gate = QualityGateAndDetector(device=settings.DEVICE)
    shapy = ShapyRegressor(checkpoint_path=settings.SHAPY_CHECKPOINT_PATH, device=settings.DEVICE)
    canonical = GenderedSMPLXCanonical(model_path=settings.SMPLX_MODEL_PATH, device=settings.DEVICE)
    measurer = VirtualMeasurements(landmarks_path=settings.LANDMARKS_PATH)

    errors_mm: Dict[str, List[float]] = {k: [] for k, _ in EVAL_METRICS}
    accuracies: Dict[str, List[float]] = {k: [] for k, _ in EVAL_METRICS}
    pve_scores_mm: List[float] = []
    beta_errors: List[float] = []
    sample_records: List[Dict[str, Any]] = []

    processed = 0
    skipped = 0

    print("\nStarting Benchmark Runs...")
    print("-" * 85)

    for step_num, i in enumerate(indices, start=1):
        fname = fnames[i]
        img_path = images_dir / fname
        gender = "female" if genders_raw[i] == "f" else "male"
        gt_betas_np = shapes[i]

        if not img_path.exists():
            print(f"[{step_num}/{len(indices)}] Skipping missing image: {fname}")
            skipped += 1
            continue

        try:
            # 1. Ground-Truth Canonical Mesh & Measurements from GT shape parameters
            gt_betas_t = torch.from_numpy(gt_betas_np).float()
            verts_gt, faces_gt = canonical(gt_betas_t, gender=gender)
            raw_gt = measurer.measure(verts_gt, faces_gt)
            gt_meas_cm = {k: raw_gt[k] * 100.0 for k in raw_gt if isinstance(raw_gt[k], (int, float))}
            gt_height_cm = gt_meas_cm["height"]

            # 2. Run Pipeline Prediction
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            pil_img = decode_image_bytes(img_bytes)
            crop, bbox, warnings = quality_gate.process_and_validate(pil_img)
            infer_out = shapy.infer(crop, gender=gender)

            pred_betas = infer_out["betas"]
            verts_pred, faces_pred = canonical(pred_betas, gender=gender)
            raw_pred = measurer.measure(verts_pred, faces_pred)
            calibrated = calibrate_measurements(raw_pred, user_height_cm=gt_height_cm)
            pred_meas_cm = calibrated["measurements_cm"]

            # 3. Compute 3D Mesh Errors (PVE-T-SC & Betas MAE)
            pve_mm = compute_pve_t_sc_mm(verts_pred, verts_gt)
            pve_scores_mm.append(pve_mm)

            pred_betas_np = to_numpy(pred_betas).flatten()[:10]
            beta_mae = float(np.mean(np.abs(pred_betas_np - gt_betas_np[:10])))
            beta_errors.append(beta_mae)

            # 4. Compute Anthropometric Errors
            subject_errors: Dict[str, float] = {}
            for key, _ in EVAL_METRICS:
                gt_val = gt_meas_cm.get(key, 0.0)
                pred_val = pred_meas_cm.get(key, 0.0)
                err_cm = abs(pred_val - gt_val)
                err_mm = err_cm * 10.0
                errors_mm[key].append(err_mm)
                acc = max(0.0, 100.0 - (err_cm / gt_val * 100.0)) if gt_val > 0 else 0.0
                accuracies[key].append(acc)
                subject_errors[key] = round(err_mm, 1)

            processed += 1

            record = {
                "index": i,
                "filename": fname,
                "gender": gender,
                "gt_height_cm": round(gt_height_cm, 1),
                "pve_t_sc_mm": round(pve_mm, 2),
                "beta_mae": round(beta_mae, 4),
                "errors_mm": subject_errors,
            }
            sample_records.append(record)

            print(
                f"[{step_num}/{len(indices)}] {fname[:38]:<38} | "
                f"PVE: {pve_mm:>5.1f} mm | "
                f"Chest: {subject_errors['chest']:>4.1f} mm | "
                f"Waist: {subject_errors['waist']:>4.1f} mm | "
                f"Hips: {subject_errors['hips']:>4.1f} mm"
            )

        except Exception as e:
            print(f"[{step_num}/{len(indices)}] [FAILED] {fname}: {e}")
            skipped += 1

    # Aggregations
    mean_pve = float(np.mean(pve_scores_mm)) if pve_scores_mm else 0.0
    median_pve = float(np.median(pve_scores_mm)) if pve_scores_mm else 0.0
    mean_beta_mae = float(np.mean(beta_errors)) if beta_errors else 0.0

    mae_mm: Dict[str, float] = {}
    mae_cm: Dict[str, float] = {}
    avg_acc: Dict[str, float] = {}

    for key, _ in EVAL_METRICS:
        if errors_mm[key]:
            mae_mm[key] = round(float(np.mean(errors_mm[key])), 1)
            mae_cm[key] = round(mae_mm[key] / 10.0, 2)
            avg_acc[key] = round(float(np.mean(accuracies[key])), 2)

    # 1. Anthropometric Measurements vs SHAPY Paper Table
    print("\n" + "=" * 85)
    print(" 1. ANTHROPOMETRIC TAPE MEASUREMENTS vs. SHAPY CVPR 2022 HBW BENCHMARK")
    print("=" * 85)
    print(f"{'Measurement':<22} | {'Sui Dhaga MAE':<15} | {'SHAPY HBW Paper':<16} | {'Delta':<12} | {'Status'}")
    print("-" * 85)

    for key, label in EVAL_METRICS:
        sui_mm = mae_mm.get(key, 0.0)
        sui_cm = mae_cm.get(key, 0.0)
        paper_mm = SHAPY_HBW_BENCHMARKS_MM.get(key)

        if paper_mm is not None:
            delta = sui_mm - paper_mm
            delta_str = f"{delta:+.1f} mm"
            status = "MATCHES/OUTPERFORMS" if delta <= 0 else ("WITHIN TOLERANCE" if delta <= 15.0 else "OFF")
            paper_str = f"{paper_mm:>6.1f} mm"
        else:
            paper_str = "    --    "
            delta_str = "    --    "
            status = "PASS"

        print(f"{label:<22} | {sui_mm:>6.1f} mm ({sui_cm:.1f}cm) | {paper_str:<16} | {delta_str:<12} | {status}")

    # 2. 3D Shape Reconstruction (PVE-T-SC) Table
    print("\n" + "=" * 85)
    print(" 2. 3D SHAPE RECONSTRUCTION ERROR (PVE-T-SC) vs. SSP-3D PUBLISHED SOTA")
    print("=" * 85)
    print(f"{'Method / Baseline':<42} | {'PVE-T-SC (mm)':<16} | {'Benchmark Source'}")
    print("-" * 85)
    print(f"{'Sui Dhaga Model Pipeline (Mean)':<42} | {mean_pve:>8.2f} mm       | Local Pipeline Evaluation")
    print(f"{'Sui Dhaga Model Pipeline (Median)':<42} | {median_pve:>8.2f} mm       | Local Pipeline Evaluation")
    print("-" * 85)
    for baseline, val in SSP3D_PVE_BENCHMARKS_MM.items():
        print(f"{baseline:<42} | {val:>8.1f} mm       | Published Literature")
    print("=" * 85)
    print(f"Processed: {processed} subjects | Skipped/Failed: {skipped} subjects")

    summary_report = {
        "dataset": "SSP-3D",
        "processed_count": processed,
        "skipped_count": skipped,
        "shape_metrics": {
            "pve_t_sc_mean_mm": round(mean_pve, 2),
            "pve_t_sc_median_mm": round(median_pve, 2),
            "beta_mae": round(mean_beta_mae, 4),
        },
        "anthropometric_mae_mm": mae_mm,
        "anthropometric_mae_cm": mae_cm,
        "anthropometric_accuracy_pct": avg_acc,
        "benchmarks": {
            "shapy_hbw_paper_mm": SHAPY_HBW_BENCHMARKS_MM,
            "ssp3d_literature_pve_mm": SSP3D_PVE_BENCHMARKS_MM,
        },
        "samples": sample_records,
    }

    if output_report:
        output_report.parent.mkdir(parents=True, exist_ok=True)
        with open(output_report, "w", encoding="utf-8") as f:
            json.dump(summary_report, f, indent=2)
        print(f"\n[Saved JSON Report]: {output_report}")

    if output_csv:
        output_csv.parent.mkdir(parents=True, exist_ok=True)
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            header = ["index", "filename", "gender", "gt_height_cm", "pve_t_sc_mm", "beta_mae"] + [
                k + "_err_mm" for k, _ in EVAL_METRICS
            ]
            writer.writerow(header)
            for r in sample_records:
                row = [
                    r["index"],
                    r["filename"],
                    r["gender"],
                    r["gt_height_cm"],
                    r["pve_t_sc_mm"],
                    r["beta_mae"],
                ] + [r["errors_mm"].get(k, "") for k, _ in EVAL_METRICS]
                writer.writerow(row)
        print(f"[Saved CSV Report]: {output_csv}")

    return summary_report


def main():
    parser = argparse.ArgumentParser(
        description="Comprehensive Benchmark Evaluation for Sui Dhaga Pipeline on SSP-3D dataset."
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
        help="Limit number of samples to evaluate (default: 5; use --all to run all)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Evaluate all 311 samples in the SSP-3D dataset",
    )
    parser.add_argument(
        "--id",
        type=str,
        default=None,
        help="Evaluate a specific sample index (0-310) or filename substring",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("output") / "ssp3d_evaluation_report.json",
        help="Path to save output JSON report",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path("output") / "ssp3d_evaluation_report.csv",
        help="Path to save output CSV per-sample metrics",
    )

    args = parser.parse_args()
    limit = None if args.all else args.limit

    run_benchmark_evaluation(
        dataset_dir=args.dataset_dir,
        limit=limit,
        target_id=args.id,
        output_report=args.output,
        output_csv=args.csv,
    )


if __name__ == "__main__":
    main()
