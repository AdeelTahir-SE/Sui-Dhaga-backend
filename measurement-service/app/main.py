"""Main FastAPI application entry point for Sui Dhaga measurement service."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("measurement-service")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.errors import MeasurementServiceException
from app.pipeline.canonical import GenderedSMPLXCanonical
from app.pipeline.measure import VirtualMeasurements
from app.pipeline.preprocess import QualityGateAndDetector
from app.pipeline.shapy_infer import ShapyRegressor


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager: loads heavy ML models once at startup and frees them at shutdown."""
    logger.info("Initializing Sui Dhaga Image-to-Measurements service...")
    logger.info(f"Target execution device: {settings.DEVICE}")

    # Load models
    app.state.concurrency_semaphore = asyncio.Semaphore(settings.CONCURRENCY_LIMIT)
    app.state.quality_gate = QualityGateAndDetector(device=settings.DEVICE)
    app.state.shapy_model = ShapyRegressor(
        checkpoint_path=settings.SHAPY_CHECKPOINT_PATH,
        device=settings.DEVICE,
    )
    app.state.canonical_model = GenderedSMPLXCanonical(
        model_path=settings.SMPLX_MODEL_PATH,
        device=settings.DEVICE,
    )
    app.state.measurer = VirtualMeasurements(landmarks_path=settings.LANDMARKS_PATH)

    logger.info("All pipeline models and assets loaded successfully.")
    yield

    logger.info("Shutting down measurement service. Releasing resources...")
    del app.state.shapy_model
    del app.state.canonical_model
    del app.state.measurer
    del app.state.quality_gate


def create_app() -> FastAPI:
    """Builds and configures the FastAPI application instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.PIPELINE_VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom machine-readable 422 error handler
    @app.exception_handler(MeasurementServiceException)
    async def measurement_exception_handler(request: Request, exc: MeasurementServiceException):
        detail = exc.detail
        if isinstance(detail, dict):
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": detail.get("code", exc.code.value),
                    "code": detail.get("code", exc.code.value),
                    "message": detail.get("message", "Processing error"),
                },
            )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.code.value,
                "code": exc.code.value,
                "message": str(detail),
            },
        )

    # Mount routes: /v1/measure and /health
    app.include_router(api_router, prefix=settings.API_PREFIX)
    app.include_router(api_router)  # Also expose /health at root level

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
