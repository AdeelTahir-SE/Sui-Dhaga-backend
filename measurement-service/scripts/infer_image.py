#!/usr/bin/env python3
"""CLI tool to upload/infer body measurements from a customer photo.

Usage:
    # Option 1: Infer against the running FastAPI microservice (Default)
    python measurement-service/scripts/infer_image.py --image path/to/photo.jpg --height 175.5 --gender female

    # Option 2: Infer in-process directly without starting the server
    python measurement-service/scripts/infer_image.py --image path/to/photo.jpg --height 175.5 --gender male --direct

    # Option 3: Save debug mesh visualizer PNG
    python measurement-service/scripts/infer_image.py --image path/to/photo.jpg --height 175.5 --save-vis
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict

# Ensure measurement-service directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def print_results_table(data: Dict[str, Any]) -> None:
    """Prints a clean, formatted table of inferred body measurements."""
    meas = data.get("measurements_cm", {})
    weight = data.get("estimated_weight_kg", "N/A")
    scale = data.get("scale_factor", "N/A")
    quality = data.get("quality", {})
    note = data.get("accuracy_note", "")

    print("\n" + "=" * 65)
    print("           SUI DHAGA: BODY MEASUREMENT INFERENCE RESULTS         ")
    print("=" * 65)
    print(f"{'Measurement':<28} | {'Value (cm)':<15} | {'Category'}")
    print("-" * 65)
    print(f"{'Height (Stature)':<28} | {meas.get('height', 0):>8.1f} cm     | Primary")
    print(f"{'Chest Circumference':<28} | {meas.get('chest', 0):>8.1f} cm     | Primary")
    print(f"{'Waist Circumference':<28} | {meas.get('waist', 0):>8.1f} cm     | Primary")
    print(f"{'Hips Circumference':<28} | {meas.get('hips', 0):>8.1f} cm     | Primary")
    print(f"{'Shoulder Width (Bi-acromial)':<28} | {meas.get('shoulder_width', 0):>8.1f} cm     | Tailoring [Exp]")
    print(f"{'Sleeve Length':<28} | {meas.get('sleeve_length', 0):>8.1f} cm     | Tailoring [Exp]")
    print(f"{'Inseam (Inside Leg)':<28} | {meas.get('inseam', 0):>8.1f} cm     | Tailoring [Exp]")
    print(f"{'Neck Circumference':<28} | {meas.get('neck', 0):>8.1f} cm     | Tailoring [Exp]")
    print(f"{'Thigh Circumference':<28} | {meas.get('thigh', 0):>8.1f} cm     | Tailoring [Exp]")
    print("-" * 65)
    print(f"{'Estimated Body Weight':<28} | {weight:>8} kg     | Volume x 985 kg/m³")
    print(f"{'Uniform Scale Factor (k)':<28} | {scale:>8}        | Height Calibration")
    print(f"{'Quality Gate Passed':<28} | {str(quality.get('passed', False)):>8}        | Quality Gate")
    print("=" * 65)

    warnings = quality.get("warnings", [])
    if warnings:
        print("\n[Quality Warnings]:")
        for w in warnings:
            print(f"  • {w}")

    if note:
        print(f"\n[Accuracy Disclaimer]:\n  {note}")
    print("=" * 65 + "\n")


def infer_via_api(
    service_url: str,
    image_path: Path,
    height_cm: float,
    gender: str,
    weight_kg: float | None = None,
) -> Dict[str, Any]:
    """Sends multipart POST request to running measurement-service /v1/measure."""
    url = f"{service_url.rstrip('/')}/v1/measure"
    boundary = "----SuiDhagaBoundaryXYZ12345"

    with open(image_path, "rb") as f:
        img_bytes = f.read()

    # Build multipart body manually without third-party requests dependency
    body = bytearray()
    
    # image field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="image"; filename="{image_path.name}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: image/jpeg\r\n\r\n")
    body.extend(img_bytes)
    body.extend(b"\r\n")

    # gender field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="gender"\r\n\r\n')
    body.extend(gender.encode("utf-8"))
    body.extend(b"\r\n")

    # height_cm field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="height_cm"\r\n\r\n')
    body.extend(str(height_cm).encode("utf-8"))
    body.extend(b"\r\n")

    # weight_kg field (optional)
    if weight_kg:
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(b'Content-Disposition: form-data; name="weight_kg"\r\n\r\n')
        body.extend(str(weight_kg).encode("utf-8"))
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_msg)
            print(f"\n[Error {e.code}]: {err_json.get('message', err_msg)}")
        except Exception:
            print(f"\n[Error {e.code}]: {err_msg}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"\n[Connection Error]: Could not reach measurement-service at {url}.")
        print(f"Details: {e.reason}")
        print("\nTip: Make sure the FastAPI service is running (`uvicorn app.main:app --port 8000`)")
        print("     or pass `--direct` to run the ML pipeline in-process directly.\n")
        sys.exit(1)


def infer_direct(
    image_path: Path,
    height_cm: float,
    gender: str,
    weight_kg: float | None = None,
    save_vis: bool = False,
) -> Dict[str, Any]:
    """Runs inference directly in-process through app.pipeline modules."""
    from app.pipeline.canonical import GenderedSMPLXCanonical
    from app.pipeline.measure import VirtualMeasurements
    from app.pipeline.preprocess import QualityGateAndDetector, decode_image_bytes
    from app.pipeline.shapy_infer import ShapyRegressor
    from app.pipeline.calibrate import calibrate_measurements
    from app.core.config import settings

    print("\nRunning in-process direct pipeline inference...")
    with open(image_path, "rb") as f:
        img_bytes = f.read()

    pil_img = decode_image_bytes(img_bytes)
    qgate = QualityGateAndDetector(device=settings.DEVICE)
    crop, bbox, warnings = qgate.process_and_validate(pil_img)

    shapy = ShapyRegressor(checkpoint_path=settings.SHAPY_CHECKPOINT_PATH, device=settings.DEVICE)
    infer_out = shapy.infer(crop, gender=gender)

    canonical = GenderedSMPLXCanonical(model_path=settings.SMPLX_MODEL_PATH, device=settings.DEVICE)
    verts, faces = canonical(infer_out["betas"], gender=gender)

    measurer = VirtualMeasurements(landmarks_path=settings.LANDMARKS_PATH)
    raw_meas = measurer.measure(verts, faces)

    calibrated = calibrate_measurements(raw_meas, user_height_cm=height_cm, user_weight_kg=weight_kg)

    if save_vis:
        from scripts.render_debug import render_debug_visualization
        out_vis = Path("output") / f"{image_path.stem}_debug_mesh.png"
        render_debug_visualization(out_vis, gender=gender)

    return {
        "measurements_cm": calibrated["measurements_cm"],
        "estimated_weight_kg": calibrated["estimated_weight_kg"],
        "scale_factor": calibrated["scale_factor"],
        "quality": {
            "passed": True,
            "warnings": warnings + calibrated["warnings"],
        },
        "accuracy_note": "Estimates from a single photo; expected error is several cm. Tailor must confirm before cutting.",
        "model_info": {
            "shapy": settings.SHAPY_VERSION,
            "body_model": settings.BODY_MODEL,
            "pipeline_version": settings.PIPELINE_VERSION,
        },
    }


def main():
    parser = argparse.ArgumentParser(
        description="Sui Dhaga: Infer tailor measurements from a full-body photo.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--image", required=True, type=Path, help="Path to customer photo (JPEG/PNG/WebP)")
    parser.add_argument("--height", required=True, type=float, help="Customer height in cm (e.g. 175.0)")
    parser.add_argument("--gender", default="female", choices=["male", "female", "neutral"], help="Customer gender")
    parser.add_argument("--weight", type=float, default=None, help="Optional customer weight in kg")
    parser.add_argument("--service-url", default="http://localhost:8000", help="Measurement service URL")
    parser.add_argument("--direct", action="store_true", help="Run ML pipeline in-process directly without HTTP server")
    parser.add_argument("--save-vis", action="store_true", help="Save debug mesh visualizer PNG to output/")

    args = parser.parse_args()

    if not args.image.exists():
        print(f"Error: Image file not found: {args.image}")
        sys.exit(1)

    if args.height < 60 or args.height > 250:
        print(f"Error: Implausible height: {args.height} cm. Please enter height between 60 and 250 cm.")
        sys.exit(1)

    print(f"Processing photo: {args.image.name} (Height: {args.height} cm, Gender: {args.gender})")

    if args.direct or args.save_vis:
        result = infer_direct(
            image_path=args.image,
            height_cm=args.height,
            gender=args.gender,
            weight_kg=args.weight,
            save_vis=args.save_vis,
        )
    else:
        result = infer_via_api(
            service_url=args.service_url,
            image_path=args.image,
            height_cm=args.height,
            gender=args.gender,
            weight_kg=args.weight,
        )

    print_results_table(result)


if __name__ == "__main__":
    main()
