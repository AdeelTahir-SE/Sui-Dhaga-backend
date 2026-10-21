"""Pydantic schemas for measurement-service API contract."""

from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class MeasurementsCm(BaseModel):
    height: float = Field(..., description="Stature from top of head to left heel in cm")
    chest: float = Field(..., description="Chest circumference at nipple line in cm")
    waist: float = Field(..., description="Waist circumference at belly button in cm")
    hips: float = Field(..., description="Hip circumference at crotch level in cm")
    shoulder_width: float = Field(..., description="[Experimental] Shoulder acromion to acromion in cm")
    sleeve_length: float = Field(..., description="[Experimental] Arm length shoulder to wrist in cm")
    inseam: float = Field(..., description="[Experimental] Inside leg length crotch to ankle in cm")
    neck: float = Field(..., description="[Experimental] Neck base circumference in cm")
    thigh: float = Field(..., description="[Experimental] Upper thigh circumference in cm")


class QualityResult(BaseModel):
    passed: bool = Field(..., description="Whether the image passed quality gates")
    warnings: List[str] = Field(default_factory=list, description="Quality warnings e.g. loose clothing, high BMI")


class ModelInfo(BaseModel):
    shapy: str = Field(..., description="SHAPY checkpoint or commit version")
    body_model: str = Field("smplx", description="Underlying parametric 3D body model")
    pipeline_version: str = Field("1.0.0", description="Virtual measurement pipeline version")


class MeasureResponse(BaseModel):
    measurements_cm: MeasurementsCm
    estimated_weight_kg: float = Field(..., description="Estimated mass from watertight 3D volume x 985 kg/m^3")
    scale_factor: float = Field(..., description="Uniform scale factor applied = user_height / mesh_height")
    quality: QualityResult
    accuracy_note: str = Field(
        default="Estimates from a single photo; expected error is several cm. Tailor must confirm before cutting."
    )
    model_info: ModelInfo


class HealthResponse(BaseModel):
    status: str = "healthy"
    models_loaded: bool
    device: str
    details: Optional[dict[str, Any]] = None


class ErrorResponse(BaseModel):
    code: str
    message: str
