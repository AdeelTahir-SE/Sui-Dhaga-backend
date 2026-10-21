"""Pytest fixtures and configuration for measurement-service tests."""

import sys
from pathlib import Path
import numpy as np
import pytest
from PIL import Image

# Ensure measurement-service directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


@pytest.fixture
def sample_pil_image() -> Image.Image:
    """Creates a valid 600x800 RGB test image with a high-contrast standing silhouette."""
    img = Image.new("RGB", (600, 800), color=(240, 240, 240))
    # Draw simple standing person silhouette
    arr = np.array(img)
    # Head
    arr[60:140, 260:340] = [40, 40, 40]
    # Torso
    arr[140:480, 220:380] = [30, 30, 80]
    # Left leg
    arr[480:740, 240:290] = [20, 20, 20]
    # Right leg
    arr[480:740, 310:360] = [20, 20, 20]
    # Arms
    arr[160:440, 170:220] = [40, 40, 40]
    arr[160:440, 380:430] = [40, 40, 40]
    return Image.fromarray(arr)


@pytest.fixture
def small_pil_image() -> Image.Image:
    """Creates an undersized test image (200x200) to test IMAGE_TOO_SMALL gate."""
    return Image.new("RGB", (200, 200), color=(200, 200, 200))


@pytest.fixture
def synthetic_cylinder_mesh() -> tuple[np.ndarray, np.ndarray]:
    """Generates a closed watertight cylinder mesh of known radius R and height H.

    Radius R = 0.2 m (circumference = 2 * pi * R = 1.2566 m)
    Height H = 1.0 m (volume = pi * R^2 * H = 0.12566 m^3)
    """
    radius = 0.20
    height = 1.0
    num_sectors = 64

    theta = np.linspace(0, 2 * np.pi, num_sectors, endpoint=False)
    x = radius * np.cos(theta)
    z = radius * np.sin(theta)

    # Vertices: bottom circle, top circle, center bottom, center top
    v_bottom = np.stack([x, np.zeros_like(x), z], axis=1)
    v_top = np.stack([x, np.full_like(x, height), z], axis=1)
    c_bottom = np.array([[0.0, 0.0, 0.0]])
    c_top = np.array([[0.0, height, 0.0]])

    vertices = np.concatenate([v_bottom, v_top, c_bottom, c_top], axis=0)

    faces = []
    n = num_sectors
    idx_cb = 2 * n
    idx_ct = 2 * n + 1

    for i in range(n):
        next_i = (i + 1) % n
        # Side quad as 2 triangles
        faces.append([i, next_i, n + next_i])
        faces.append([i, n + next_i, n + i])
        # Bottom cap
        faces.append([idx_cb, next_i, i])
        # Top cap
        faces.append([idx_ct, n + i, n + next_i])

    faces = np.array(faces, dtype=np.int64)
    return vertices, faces
