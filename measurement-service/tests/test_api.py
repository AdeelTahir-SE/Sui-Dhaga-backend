"""Integration tests for FastAPI endpoints."""

import io
from fastapi.testclient import TestClient
from PIL import Image
import pytest

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client: TestClient):
    """Tests GET /health reports models loaded and device."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["models_loaded"] is True
    assert "device" in data
    assert data["details"]["body_model"] == "smplx"


def test_measure_endpoint_image_too_small(client: TestClient, small_pil_image: Image.Image):
    """Tests POST /v1/measure with undersized image returns 422 IMAGE_TOO_SMALL."""
    buf = io.BytesIO()
    small_pil_image.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/v1/measure",
        files={"image": ("test.jpg", buf.getvalue(), "image/jpeg")},
        data={"gender": "female", "height_cm": 168.0},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "IMAGE_TOO_SMALL"


def test_measure_endpoint_invalid_gender(client: TestClient, sample_pil_image: Image.Image):
    """Tests POST /v1/measure with invalid gender returns 422."""
    buf = io.BytesIO()
    sample_pil_image.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/v1/measure",
        files={"image": ("test.jpg", buf.getvalue(), "image/jpeg")},
        data={"gender": "unknown_gender", "height_cm": 175.0},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "INVALID_IMAGE"


def test_measure_endpoint_success(client: TestClient, sample_pil_image: Image.Image):
    """Tests POST /v1/measure full successful pipeline execution."""
    buf = io.BytesIO()
    sample_pil_image.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/v1/measure",
        files={"image": ("test.jpg", buf.getvalue(), "image/jpeg")},
        data={"gender": "male", "height_cm": 178.0, "weight_kg": 75.0},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response schema fields
    assert "measurements_cm" in data
    meas = data["measurements_cm"]
    assert meas["height"] == 178.0
    for key in ["chest", "waist", "hips", "shoulder_width", "sleeve_length", "inseam", "neck", "thigh"]:
        assert key in meas
        assert isinstance(meas[key], (int, float))
        assert meas[key] > 0

    assert isinstance(data["estimated_weight_kg"], (int, float))
    assert data["estimated_weight_kg"] > 0
    assert isinstance(data["scale_factor"], (int, float))
    assert data["quality"]["passed"] is True
    assert "accuracy_note" in data
    assert data["model_info"]["body_model"] == "smplx"
