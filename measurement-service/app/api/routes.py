"""FastAPI route handlers for Sui Dhaga measurement service."""

from __future__ import annotations

import asyncio
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("measurement-service")


from app.api.schemas import HealthResponse, MeasureResponse, ModelInfo, QualityResult
from app.core.config import settings
from app.core.errors import ErrorCode, MeasurementServiceException
from app.pipeline.calibrate import calibrate_measurements
from app.pipeline.preprocess import decode_image_bytes

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check(request: Request) -> HealthResponse:
    """Returns service health status, loaded models, and device info."""
    state = request.app.state
    models_ready = bool(
        getattr(state, "shapy_model", None) is not None
        and getattr(state, "canonical_model", None) is not None
        and getattr(state, "measurer", None) is not None
    )

    return HealthResponse(
        status="healthy" if models_ready else "initializing",
        models_loaded=models_ready,
        device=settings.DEVICE,
        details={
            "shapy_version": settings.SHAPY_VERSION,
            "body_model": settings.BODY_MODEL,
            "pipeline_version": settings.PIPELINE_VERSION,
        },
    )


@router.post(
    "/measure",
    response_model=MeasureResponse,
    status_code=status.HTTP_200_OK,
    tags=["Measurement"],
)
async def measure_from_photo(
    request: Request,
    image: UploadFile = File(..., description="Full-body customer photo in standing pose"),
    gender: str = Form(..., description="'male' or 'female'"),
    height_cm: float = Form(..., description="Customer stature in cm (required ground truth)"),
    weight_kg: Optional[float] = Form(None, description="Optional customer weight in kg"),
) -> MeasureResponse:
    """Inference endpoint: Photo -> SMPL-X (beta, theta) -> T-Pose -> Virtual Measurements -> Calibrated Output.

    Adheres strictly to the Wuhrer et al. / SHAPY CVPR 2022 method:
    - Height: vertical (Y) distance from top-of-head vertex to left-heel vertex
    - Weight: watertight mesh volume x 985 kg/m^3
    - Circumferences: horizontal plane section at landmark vertex -> 2D convex hull perimeter
    - Height calibration: uniform mesh rescaling by k = user_height / mesh_height
    """
    # Verify model readiness
    state = request.app.state
    if not (hasattr(state, "shapy_model") and hasattr(state, "canonical_model") and hasattr(state, "measurer")):
        raise MeasurementServiceException(
            code=ErrorCode.MODEL_NOT_READY,
            detail="Pipeline models are still initializing. Please retry in a few moments.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Validate gender input
    gender_norm = gender.lower().strip()
    if gender_norm not in ["male", "female", "neutral"]:
        raise MeasurementServiceException(
            code=ErrorCode.INVALID_IMAGE,
            detail="Gender must be 'male' or 'female'.",
        )

    # Validate file size
    image_bytes = await image.read()
    if len(image_bytes) > settings.MAX_REQUEST_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size exceeds limit of {settings.MAX_REQUEST_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    # Concurrency control & timeout
    semaphore: asyncio.Semaphore = state.concurrency_semaphore

    try:
        async with semaphore:
            result = await asyncio.wait_for(
                _run_inference_pipeline(
                    image_bytes=image_bytes,
                    gender=gender_norm,
                    height_cm=height_cm,
                    weight_kg=weight_kg,
                    state=state,
                ),
                timeout=settings.INFERENCE_TIMEOUT_SECONDS,
            )
            return result
    except asyncio.TimeoutError:
        raise MeasurementServiceException(
            code=ErrorCode.INFERENCE_TIMEOUT,
            detail="Inference request timed out on server.",
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    finally:
        # Guarantee memory cleanup of image bytes
        del image_bytes


async def _run_inference_pipeline(
    image_bytes: bytes,
    gender: str,
    height_cm: float,
    weight_kg: Optional[float],
    state: Any,
) -> MeasureResponse:
    """Executes the complete synchronous ML pipeline in a background thread."""
    loop = asyncio.get_running_loop()

    def sync_compute():
        # 1. Decode & EXIF transpose
        pil_image = decode_image_bytes(image_bytes)

        # 2. Preprocess & Quality Gate
        crop_tensor, bbox, warnings = state.quality_gate.process_and_validate(pil_image)

        # 3. SHAPY Regressor: Image crop -> SMPL-X (beta, theta)
        infer_out = state.shapy_model.infer(crop_tensor, gender=gender)
        betas = infer_out["betas"]

        # 4. Canonicalisation: Zero pose (T-pose) with gendered SMPL-X
        vertices, faces = state.canonical_model(betas=betas, gender=gender)

        # 5. Virtual Measurements on T-pose mesh
        raw_meas = state.measurer.measure(vertices, faces)

        # 6. Scale-to-Height Calibration
        calibrated = calibrate_measurements(
            raw_measurements=raw_meas,
            user_height_cm=height_cm,
            user_weight_kg=weight_kg,
        )

        all_warnings = warnings + calibrated["warnings"]

        return MeasureResponse(
            measurements_cm=calibrated["measurements_cm"],
            estimated_weight_kg=calibrated["estimated_weight_kg"],
            scale_factor=calibrated["scale_factor"],
            quality=QualityResult(
                passed=True,
                warnings=all_warnings,
            ),
            accuracy_note="Estimates from a single photo; expected error is several cm. Tailor must confirm before cutting.",
            model_info=ModelInfo(
                shapy=settings.SHAPY_VERSION,
                body_model=settings.BODY_MODEL,
                pipeline_version=settings.PIPELINE_VERSION,
            ),
        )

    return await loop.run_in_executor(None, sync_compute)
