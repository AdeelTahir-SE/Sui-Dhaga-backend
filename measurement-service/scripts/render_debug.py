#!/usr/bin/env python3
"""Debug rendering script for Sui Dhaga Image-to-Measurements service.

Outputs visualization PNGs of the canonical T-pose mesh with:
- Top-of-head and left-heel vertical height markers
- Chest, Waist, Hip, Neck, and Thigh horizontal measurement planes
- Extracted 2D convex hull perimeters
Allows visual verification of anatomical landmarks and cutting plane positions.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure measurement-service directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    import matplotlib.pyplot as plt
    from matplotlib.patches import Polygon
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    from PIL import Image, ImageDraw, ImageFont

import numpy as np

from app.core.config import settings

from app.pipeline.canonical import GenderedSMPLXCanonical
from app.pipeline.measure import VirtualMeasurements, intersect_mesh_horizontal_plane, compute_convex_hull_perimeter


def generate_synthetic_human_mesh() -> tuple[np.ndarray, np.ndarray]:
    """Generates an anatomically proportioned synthetic humanoid mesh for offline testing."""
    # Create an ellipsoid body with head and limbs
    u = np.linspace(0, 2 * np.pi, 24)
    v = np.linspace(0, np.pi, 18)
    
    # Torso ellipsoid
    x_torso = 0.20 * np.outer(np.cos(u), np.sin(v)).flatten()
    y_torso = 0.45 * np.outer(np.sin(u), np.sin(v)).flatten() - 0.10
    z_torso = 0.14 * np.outer(np.ones(np.size(u)), np.cos(v)).flatten()

    # Head sphere
    x_head = 0.10 * np.outer(np.cos(u), np.sin(v)).flatten()
    y_head = 0.12 * np.outer(np.sin(u), np.sin(v)).flatten() + 0.40
    z_head = 0.10 * np.outer(np.ones(np.size(u)), np.cos(v)).flatten()

    # Legs (left and right cylinders)
    t = np.linspace(-0.55, -1.35, 12)
    phi = np.linspace(0, 2 * np.pi, 16)
    T, PHI = np.meshgrid(t, phi)
    
    # Left leg
    x_lleg = (0.10 + 0.08 * np.cos(PHI)).flatten()
    y_lleg = T.flatten()
    z_lleg = (0.08 * np.sin(PHI)).flatten()

    # Right leg
    x_rleg = (-0.10 + 0.08 * np.cos(PHI)).flatten()
    y_rleg = T.flatten()
    z_rleg = (0.08 * np.sin(PHI)).flatten()

    all_x = np.concatenate([x_torso, x_head, x_lleg, x_rleg])
    all_y = np.concatenate([y_torso, y_head, y_lleg, y_rleg])
    all_z = np.concatenate([z_torso, z_head, z_lleg, z_rleg])

    verts = np.stack([all_x, all_y, all_z], axis=1)

    # Compute a Delaunay/ConvexHull triangulation for surface faces
    from scipy.spatial import ConvexHull
    hull = ConvexHull(verts)
    faces = hull.simplices

    return verts, faces


def render_debug_visualization(output_path: Path, gender: str = "neutral") -> Path:
    """Renders the T-pose mesh, measurement planes, and 2D convex hulls to PNG."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Try loading real SMPL-X model, fallback to synthetic template
    try:
        canonical_layer = GenderedSMPLXCanonical(model_path=settings.SMPLX_MODEL_PATH)
        betas = np.zeros((1, 10), dtype=np.float32)
        v_tensor, f_tensor = canonical_layer(betas, gender=gender)
        vertices = v_tensor[0].detach().cpu().numpy()
        faces = f_tensor.detach().cpu().numpy()
        print("Using official SMPL-X body model template.")
    except Exception:
        print("SMPL-X weights not present. Using synthetic anthropometric humanoid mesh.")
        vertices, faces = generate_synthetic_human_mesh()

    measurer = VirtualMeasurements()

    # Calculate landmarks and measurements
    try:
        meas_out = measurer.measure(vertices, faces)
    except Exception:
        # Synthetic landmark fallbacks
        head_y = float(np.max(vertices[:, 1]))
        heel_y = float(np.min(vertices[:, 1]))
        chest_y = head_y - 0.45 * (head_y - heel_y)
        waist_y = head_y - 0.58 * (head_y - heel_y)
        crotch_y = head_y - 0.68 * (head_y - heel_y)
        neck_y = head_y - 0.20 * (head_y - heel_y)
        thigh_y = crotch_y - 0.05
    else:
        lms = meas_out["landmarks"]
        head_y = lms["HeadTop"][1]
        heel_y = lms["HeelLeft"][1]
        chest_y = lms["NippleRight"][1]
        waist_y = lms["BellyButton"][1]
        crotch_y = lms["Crotch"][1]
        neck_y = lms["NeckBase"][1]
        thigh_y = crotch_y - 0.05

    # Intersect cutting planes and extract 2D convex hulls
    plane_data = {
        "Chest": (chest_y, "#E63946"),
        "Waist": (waist_y, "#F4A261"),
        "Hips": (crotch_y, "#2A9D8F"),
        "Neck": (neck_y, "#457B9D"),
        "Thigh": (thigh_y, "#9B5DE5"),
    }

    if not HAS_MATPLOTLIB:
        # High-res PIL rendering when matplotlib is not installed
        canvas = Image.new("RGB", (1200, 800), color=(250, 250, 250))
        draw = ImageDraw.Draw(canvas)

        def to_screen(x, y, offset_x=300, offset_y=400, scale=350):
            return int(offset_x + x * scale), int(offset_y - y * scale)

        # Draw front projection vertices
        step = max(1, len(vertices) // 2500)
        for v in vertices[::step]:
            px, py = to_screen(v[0], v[1], offset_x=300)
            draw.rectangle([px - 1, py - 1, px + 1, py + 1], fill=(160, 170, 180))

        # Height indicator
        _, h_top = to_screen(0, head_y, offset_x=300)
        _, h_bot = to_screen(0, heel_y, offset_x=300)
        draw.line([(300, h_top), (300, h_bot)], fill=(217, 4, 41), width=3)
        draw.text((220, 30), f"Height: {abs(head_y - heel_y)*100:.1f} cm", fill=(217, 4, 41))

        # Draw horizontal cutting planes
        for name, (py_val, _) in plane_data.items():
            _, py_scr = to_screen(0, py_val, offset_x=300)
            draw.line([(80, py_scr), (520, py_scr)], fill=(0, 150, 214), width=2)
            draw.text((530, py_scr - 7), f"{name} (Y={py_val:.2f}m)", fill=(40, 40, 40))

        # Right panel: 2D convex hull cross sections
        draw.text((680, 40), "2D Convex Hull Cross Sections (X-Z Plane)", fill=(20, 20, 20))
        hull_centers = {"Chest": (750, 250), "Waist": (980, 250), "Hips": (865, 550)}
        for name, center in hull_centers.items():
            py_val = plane_data[name][0]
            pts_2d = intersect_mesh_horizontal_plane(vertices, faces, plane_y=py_val)
            if len(pts_2d) >= 3:
                circ_m, hull_pts = compute_convex_hull_perimeter(pts_2d)
                poly_pts = [(int(center[0] + pt[0] * 650), int(center[1] + pt[1] * 650)) for pt in hull_pts]
                if len(poly_pts) >= 3:
                    draw.polygon(poly_pts, outline=(0, 120, 220), width=3)
                draw.text((center[0] - 50, center[1] + 130), f"{name}: {circ_m*100:.1f} cm", fill=(20, 20, 20))

        canvas.save(output_path)
        print(f"Debug rendering saved successfully (via PIL) to: {output_path}")
        return output_path

    # Setup multi-panel figure
    fig = plt.figure(figsize=(18, 10))
    fig.suptitle(f"Sui Dhaga: Canonical T-Pose Mesh & Virtual Caliper Measurement Planes ({gender.capitalize()})", fontsize=16)

    # Panel 1: Front View (Coronal: X-Y plane)
    ax1 = fig.add_subplot(1, 3, 1)

    ax1.set_title("Frontal Projection (X-Y Plane)")
    # Sample subset of vertices for fast scatter
    step = max(1, len(vertices) // 2500)
    ax1.scatter(vertices[::step, 0], vertices[::step, 1], s=1, c="#8D99AE", alpha=0.4, label="Mesh Vertices")

    # Height line
    ax1.plot([0.0, 0.0], [heel_y, head_y], color="#D90429", linestyle="--", linewidth=2, label=f"Height: {abs(head_y - heel_y)*100:.1f} cm")
    ax1.scatter([0.0], [head_y], color="#D90429", s=40, zorder=5)
    ax1.scatter([0.0], [heel_y], color="#D90429", s=40, zorder=5)

    # Draw horizontal cutting planes
    for name, (py, col) in plane_data.items():
        ax1.axhline(py, color=col, linestyle="-", linewidth=2, label=f"{name} Plane (Y={py:.2f}m)")

    ax1.set_xlabel("X (meters)")
    ax1.set_ylabel("Y (meters)")
    ax1.legend(loc="upper right", fontsize=8)
    ax1.axis("equal")
    ax1.grid(True, linestyle=":", alpha=0.5)

    # Panel 2: Side View (Sagittal: Z-Y plane)
    ax2 = fig.add_subplot(1, 3, 2)
    ax2.set_title("Lateral Projection (Z-Y Plane)")
    ax2.scatter(vertices[::step, 2], vertices[::step, 1], s=1, c="#8D99AE", alpha=0.4)
    for name, (py, col) in plane_data.items():
        ax2.axhline(py, color=col, linestyle="-", linewidth=2)
    ax2.set_xlabel("Z (meters)")
    ax2.set_ylabel("Y (meters)")
    ax2.axis("equal")
    ax2.grid(True, linestyle=":", alpha=0.5)

    # Panel 3: Inset 2D Convex Hulls for Circumferences
    ax3 = fig.add_subplot(1, 3, 3)
    ax3.set_title("2D Cross-Section Convex Hulls (Top-Down X-Z Plane)")

    for name, (py, col) in [("Chest", plane_data["Chest"]), ("Waist", plane_data["Waist"]), ("Hips", plane_data["Hips"])]:
        pts_2d = intersect_mesh_horizontal_plane(vertices, faces, plane_y=py)
        if len(pts_2d) >= 3:
            circ_m, hull_pts = compute_convex_hull_perimeter(pts_2d)
            poly = Polygon(hull_pts, closed=True, fill=False, edgecolor=col, linewidth=2.5, label=f"{name}: {circ_m * 100:.1f} cm")
            ax3.add_patch(poly)
            ax3.scatter(pts_2d[::2, 0], pts_2d[::2, 1], s=4, c=col, alpha=0.3)

    ax3.set_xlabel("X (meters)")
    ax3.set_ylabel("Z (meters)")
    ax3.legend(loc="upper right", fontsize=10)
    ax3.axis("equal")
    ax3.grid(True, linestyle=":", alpha=0.5)

    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    print(f"Debug rendering saved successfully to: {output_path}")
    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render debug measurement planes on canonical mesh.")
    parser.add_argument("--output", default="output/debug_measurement_planes.png", help="Path to output PNG")
    parser.add_argument("--gender", default="neutral", choices=["male", "female", "neutral"], help="Gender model")
    args = parser.parse_args()

    render_debug_visualization(Path(args.output), gender=args.gender)
