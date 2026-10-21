# Multi-stage Dockerfile for Sui Dhaga measurement-service
# Default target: CPU (Fedora/Debian compatible)
# To build with CUDA GPU support, pass: --build-arg TORCH_INDEX=https://download.pytorch.org/whl/cu118

FROM python:3.10-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000 \
    DEVICE=cpu

# Install system dependencies for OpenCV, Trimesh, and build utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install PyTorch (CPU-first by default)
ARG TORCH_INDEX=https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir torch torchvision --index-url ${TORCH_INDEX}

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/
COPY scripts/ ./scripts/
COPY LICENSE_NOTES.md README.md ARCHITECTURE.md ./

# Create data directories for mounted checkpoints
RUN mkdir -p /app/data/body_models/smplx /app/data/trained_models/shapy/SHAPY_A

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
