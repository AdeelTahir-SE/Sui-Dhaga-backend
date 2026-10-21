"""Scale-to-Height calibration module.

Applies uniform scaling to resolve monocular scale ambiguity based on
the user-entered stature (height in cm). Performs sanity checks on scale factor k.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.errors import ErrorCode, MeasurementServiceException


def calibrate_measurements(
    raw_measurements: Dict[str, Any],
    user_height_cm: float,
    user_weight_kg: Optional[float] = None,
) -> Dict[str, Any]:
    """Applies uniform scale factor k = user_height / raw_mesh_height.

    Args:
        raw_measurements: dict returned by VirtualMeasurements.measure (in meters and kg)
        user_height_cm: Ground truth height entered by customer (in cm)
        user_weight_kg: Optional ground truth weight entered by customer (in kg)

    Returns:
        dict with calibrated measurements in centimeters (rounded to 0.1 cm),
        calibrated weight in kg (rounded to 0.1 kg), scale factor, and warnings.
    """
    raw_height_m = raw_measurements["height"]
    if raw_height_m <= 0:
        raise MeasurementServiceException(
            code=ErrorCode.SCALE_IMPLAUSIBLE,
            detail="Raw mesh height is non-positive or corrupted.",
        )

    user_height_m = user_height_cm / 100.0
    scale_factor = user_height_m / raw_height_m

    # Plausible scale factor sanity gate
    if scale_factor < settings.SCALE_FACTOR_MIN or scale_factor > settings.SCALE_FACTOR_MAX:
        raise MeasurementServiceException(
            code=ErrorCode.SCALE_IMPLAUSIBLE,
            detail=(
                f"Computed scale factor {scale_factor:.3f} is outside plausible range "
                f"[{settings.SCALE_FACTOR_MIN}, {settings.SCALE_FACTOR_MAX}]. "
                f"User height ({user_height_cm} cm) is implausible for the detected body proportion."
            ),
        )

    # All linear lengths and circumferences scale linearly by k
    # Watertight volume scales by k^3
    linear_keys = [
        "height",
        "chest",
        "waist",
        "hips",
        "shoulder_width",
        "sleeve_length",
        "inseam",
        "neck",
        "thigh",
    ]

    calibrated_cm: Dict[str, float] = {}
    for key in linear_keys:
        val_m = raw_measurements[key] * scale_factor
        calibrated_cm[key] = round(val_m * 100.0, 1)

    # Force height to exactly match the user's provided ground truth height
    calibrated_cm["height"] = round(user_height_cm, 1)

    # Weight estimation: volume scales by k^3
    calibrated_volume = raw_measurements["volume_m3"] * (scale_factor ** 3)
    estimated_weight = calibrated_volume * 985.0
    calibrated_weight_kg = round(estimated_weight, 1)

    warnings: List[str] = []

    # Optional cross-check if user provided weight
    if user_weight_kg is not None and user_weight_kg > 0:
        diff_pct = abs(calibrated_weight_kg - user_weight_kg) / user_weight_kg * 100.0
        if diff_pct > 25.0:
            warnings.append(
                f"Estimated weight ({calibrated_weight_kg} kg) differs by {diff_pct:.0f}% "
                f"from reported weight ({user_weight_kg} kg). Silhouette or clothing fit may affect volume."
            )

    return {
        "measurements_cm": calibrated_cm,
        "estimated_weight_kg": calibrated_weight_kg,
        "scale_factor": round(scale_factor, 3),
        "warnings": warnings,
    }
