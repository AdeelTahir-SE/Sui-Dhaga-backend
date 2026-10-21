"""Unit tests for virtual measurement and calibration pipeline."""

import math
import numpy as np
import pytest
from PIL import Image

from app.core.errors import ErrorCode, MeasurementServiceException
from app.pipeline.calibrate import calibrate_measurements
from app.pipeline.measure import (
    compute_convex_hull_perimeter,
    compute_watertight_volume,
    intersect_mesh_horizontal_plane,
)
from app.pipeline.preprocess import QualityGateAndDetector
from app.pipeline.shapy_infer import ShapyRegressor


def test_shapy_infer_determinism(sample_pil_image: Image.Image):
    """Phase 2 Test: Passing the same image twice produces identical betas and parameters."""
    regressor = ShapyRegressor()
    crop_arr = np.transpose(np.array(sample_pil_image.resize((224, 224))) / 255.0, (2, 0, 1))

    out1 = regressor.infer(crop_arr, gender="female")
    out2 = regressor.infer(crop_arr, gender="female")

    np.testing.assert_allclose(out1["betas"], out2["betas"], rtol=1e-5, atol=1e-5)
    np.testing.assert_allclose(out1["body_pose"], out2["body_pose"], rtol=1e-5, atol=1e-5)
    np.testing.assert_allclose(out1["global_orient"], out2["global_orient"], rtol=1e-5, atol=1e-5)
    assert out1["camera_scale"] == pytest.approx(out2["camera_scale"])


def test_watertight_volume_analytic(synthetic_cylinder_mesh):
    """Phase 4 Test: Watertight volume on synthetic cylinder matches analytic volume V = pi * r^2 * h."""
    vertices, faces = synthetic_cylinder_mesh
    radius = 0.20
    height = 1.0
    analytic_volume = math.pi * (radius ** 2) * height  # ~0.12566 m^3

    computed_volume = compute_watertight_volume(vertices, faces)
    assert computed_volume == pytest.approx(analytic_volume, rel=0.02)


def test_cross_section_convex_hull_analytic(synthetic_cylinder_mesh):
    """Phase 4 Test: Circumference on horizontal slicing plane matches analytic perimeter 2 * pi * r."""
    vertices, faces = synthetic_cylinder_mesh
    radius = 0.20
    analytic_circumference = 2.0 * math.pi * radius  # ~1.2566 m

    plane_y = 0.50  # Mid-height of 1m cylinder
    pts_2d = intersect_mesh_horizontal_plane(vertices, faces, plane_y=plane_y)
    assert len(pts_2d) >= 10

    computed_circ, hull_pts = compute_convex_hull_perimeter(pts_2d)
    assert computed_circ == pytest.approx(analytic_circumference, rel=0.02)


def test_scaling_laws(synthetic_cylinder_mesh):
    """Phase 4 Test: Scaling mesh by k scales linear lengths by k, circumferences by k, and volume by k^3."""
    vertices, faces = synthetic_cylinder_mesh
    k = 1.25

    # Original measurements
    orig_vol = compute_watertight_volume(vertices, faces)
    orig_pts = intersect_mesh_horizontal_plane(vertices, faces, plane_y=0.50)
    orig_circ, _ = compute_convex_hull_perimeter(orig_pts)

    # Scaled mesh
    scaled_verts = vertices * k
    scaled_vol = compute_watertight_volume(scaled_verts, faces)
    scaled_pts = intersect_mesh_horizontal_plane(scaled_verts, faces, plane_y=0.50 * k)
    scaled_circ, _ = compute_convex_hull_perimeter(scaled_pts)

    # Verify scaling laws
    assert scaled_circ == pytest.approx(orig_circ * k, rel=0.01)
    assert scaled_vol == pytest.approx(orig_vol * (k ** 3), rel=0.01)


def test_calibration_success():
    """Phase 5 Test: Calibration applies uniform scale factor and matches user height."""
    mock_raw = {
        "height": 1.70,  # 1.70 m
        "chest": 0.95,   # 0.95 m
        "waist": 0.80,   # 0.80 m
        "hips": 0.98,    # 0.98 m
        "shoulder_width": 0.44,
        "sleeve_length": 0.60,
        "inseam": 0.76,
        "neck": 0.38,
        "thigh": 0.54,
        "volume_m3": 0.075,
    }

    user_height_cm = 178.5  # Desired stature
    result = calibrate_measurements(mock_raw, user_height_cm=user_height_cm)

    expected_k = 1.785 / 1.70  # ~1.05
    assert result["scale_factor"] == pytest.approx(expected_k, rel=1e-3)
    assert result["measurements_cm"]["height"] == 178.5
    assert result["measurements_cm"]["chest"] == round(0.95 * expected_k * 100.0, 1)
    # Check cubic weight scaling
    expected_weight = 0.075 * (expected_k ** 3) * 985.0
    assert result["estimated_weight_kg"] == round(expected_weight, 1)


def test_calibration_scale_implausible():
    """Phase 5 Test: Implausibly small or large scale factor raises SCALE_IMPLAUSIBLE."""
    mock_raw = {
        "height": 1.75,
        "chest": 0.95,
        "waist": 0.80,
        "hips": 0.98,
        "shoulder_width": 0.44,
        "sleeve_length": 0.60,
        "inseam": 0.76,
        "neck": 0.38,
        "thigh": 0.54,
        "volume_m3": 0.075,
    }

    # Height too small (k = 0.51 < 0.70)
    with pytest.raises(MeasurementServiceException) as exc_info:
        calibrate_measurements(mock_raw, user_height_cm=90.0)
    assert exc_info.value.code == ErrorCode.SCALE_IMPLAUSIBLE

    # Height too large (k = 1.6 > 1.40)
    with pytest.raises(MeasurementServiceException) as exc_info:
        calibrate_measurements(mock_raw, user_height_cm=280.0)
    assert exc_info.value.code == ErrorCode.SCALE_IMPLAUSIBLE


def test_quality_gate_image_too_small(small_pil_image: Image.Image):
    """Phase 5 Test: Image with resolution below threshold triggers IMAGE_TOO_SMALL."""
    qgate = QualityGateAndDetector()
    with pytest.raises(MeasurementServiceException) as exc_info:
        qgate.process_and_validate(small_pil_image)
    assert exc_info.value.code == ErrorCode.IMAGE_TOO_SMALL


def test_quality_gate_no_person():
    """Phase 5 Test: Solid blank image with no person triggers NO_PERSON."""
    blank_img = Image.new("RGB", (600, 800), color=(255, 255, 255))
    qgate = QualityGateAndDetector()
    with pytest.raises(MeasurementServiceException) as exc_info:
        qgate.process_and_validate(blank_img)
    assert exc_info.value.code in [ErrorCode.NO_PERSON, ErrorCode.BODY_NOT_FULLY_VISIBLE]
