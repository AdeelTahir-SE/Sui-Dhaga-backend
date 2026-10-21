"""Configuration settings for Sui Dhaga measurement-service."""

from __future__ import annotations

import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=".env",
        case_sensitive=True,
    )

    APP_NAME: str = "Sui Dhaga Measurement Service"
    API_PREFIX: str = "/v1"
    DEBUG: bool = False
    
    # Device configuration: 'cpu', 'cuda', or 'auto'
    DEVICE: str = Field(default_factory=lambda: os.getenv("DEVICE", "cpu"))
    
    # Asset paths
    DATA_DIR: Path = Field(default_factory=lambda: Path(os.getenv("DATA_DIR", BASE_DIR / "data")))
    SMPLX_MODEL_PATH: Path = Field(
        default_factory=lambda: Path(os.getenv("SMPLX_MODEL_PATH", BASE_DIR / "data" / "body_models" / "smplx"))
    )
    SHAPY_CHECKPOINT_PATH: Path = Field(
        default_factory=lambda: Path(os.getenv("SHAPY_CHECKPOINT_PATH", BASE_DIR / "data" / "trained_models" / "shapy" / "SHAPY_A"))
    )
    LANDMARKS_PATH: Path = Field(
        default_factory=lambda: Path(os.getenv("LANDMARKS_PATH", BASE_DIR / "app" / "pipeline" / "landmarks.json"))
    )
    
    # Quality gate thresholds
    MIN_IMAGE_WIDTH: int = 512
    MIN_IMAGE_HEIGHT: int = 512
    KEYPOINT_CONFIDENCE_THRESHOLD: float = 0.4
    
    # Calibration plausible scale factor bounds [user_height / raw_mesh_height]
    SCALE_FACTOR_MIN: float = 0.70
    SCALE_FACTOR_MAX: float = 1.40
    
    # Service execution constraints
    MAX_REQUEST_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    CONCURRENCY_LIMIT: int = 2
    INFERENCE_TIMEOUT_SECONDS: float = 60.0
    
    # Metadata
    SHAPY_VERSION: str = "CVPR2022-SHAPY_A"
    BODY_MODEL: str = "smplx"
    PIPELINE_VERSION: str = "1.0.0"


settings = Settings()
