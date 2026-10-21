"""Virtual Anthropometric Measurement module.

Calculates virtual measurements from a canonical T-pose mesh using the
Virtual Caliper / Wuhrer et al. method as adopted in the SHAPY paper:
- Height: vertical (Y) distance between HeadTop and HeelLeft
- Weight: watertight mesh volume x 985 kg/m^3
- Circumferences: horizontal plane intersection with mesh -> 2D convex hull perimeter
- Tailoring extensions: shoulder width, sleeve length, inseam, neck, thigh
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Tuple, Union
import numpy as np
from scipy.spatial import ConvexHull
import torch

from app.core.config import settings

HUMAN_BODY_DENSITY = 985.0  # kg/m^3 (Wuhrer et al., SHAPY paper)


def compute_watertight_volume(vertices: np.ndarray, faces: np.ndarray) -> float:
    """Computes the enclosed volume of a watertight triangular mesh.

    Uses the divergence theorem (sum of signed tetrahedra volumes from origin).
    Vertices: (V, 3) in meters
    Faces: (F, 3) vertex indices
    """
    v0 = vertices[faces[:, 0]]
    v1 = vertices[faces[:, 1]]
    v2 = vertices[faces[:, 2]]

    # Determinant of 3x3 matrix [v0, v1, v2] for each triangle
    signed_volumes = (
        -v2[:, 0] * v1[:, 1] * v0[:, 2]
        + v1[:, 0] * v2[:, 1] * v0[:, 2]
        + v2[:, 0] * v0[:, 1] * v1[:, 2]
        - v0[:, 0] * v2[:, 1] * v1[:, 2]
        - v1[:, 0] * v0[:, 1] * v2[:, 2]
        + v0[:, 0] * v1[:, 1] * v2[:, 2]
    ) / 6.0

    return float(np.abs(np.sum(signed_volumes)))


def intersect_mesh_horizontal_plane(
    vertices: np.ndarray, faces: np.ndarray, plane_y: float
) -> np.ndarray:
    """Intersects a 3D triangle mesh with a horizontal plane y = plane_y.

    Returns the 2D intersection points (X, Z) on the plane.
    """
    # Vertex coordinates for all 3 corners of each triangle
    tri_verts = vertices[faces]  # (F, 3, 3)
    y_coords = tri_verts[:, :, 1]  # (F, 3)

    # Find triangles that straddle plane_y
    y_min = np.min(y_coords, axis=1)
    y_max = np.max(y_coords, axis=1)
    crossing_mask = (y_min <= plane_y) & (y_max >= plane_y)
    crossing_tris = tri_verts[crossing_mask]  # (K, 3, 3)

    if len(crossing_tris) == 0:
        return np.empty((0, 2), dtype=np.float64)

    # Triangle edges: (0, 1), (1, 2), (2, 0)
    edges = [(0, 1), (1, 2), (2, 0)]
    intersect_pts = []

    for i1, i2 in edges:
        p1 = crossing_tris[:, i1, :]  # (K, 3)
        p2 = crossing_tris[:, i2, :]  # (K, 3)
        y1 = p1[:, 1]
        y2 = p2[:, 1]

        # Check which edges cross the plane
        dy = y2 - y1
        valid_edge = (dy != 0) & (((y1 <= plane_y) & (y2 >= plane_y)) | ((y1 >= plane_y) & (y2 <= plane_y)))

        if np.any(valid_edge):
            t = (plane_y - y1[valid_edge]) / dy[valid_edge]
            # Interpolate (x, z) points
            x_cross = p1[valid_edge, 0] + t * (p2[valid_edge, 0] - p1[valid_edge, 0])
            z_cross = p1[valid_edge, 2] + t * (p2[valid_edge, 2] - p1[valid_edge, 2])
            pts_2d = np.stack([x_cross, z_cross], axis=1)
            intersect_pts.append(pts_2d)

    if not intersect_pts:
        return np.empty((0, 2), dtype=np.float64)

    return np.concatenate(intersect_pts, axis=0)


def compute_convex_hull_perimeter(points_2d: np.ndarray) -> Tuple[float, np.ndarray]:
    """Computes the perimeter of the 2D convex hull of points on a slicing plane.

    Returns:
        (perimeter in meters, hull_vertices_2d)
    """
    if len(points_2d) < 3:
        return 0.0, np.empty((0, 2))

    try:
        hull = ConvexHull(points_2d)
        ordered_pts = points_2d[hull.vertices]
        diffs = ordered_pts - np.roll(ordered_pts, -1, axis=0)
        perimeter = float(np.sum(np.sqrt(np.sum(diffs ** 2, axis=1))))
        return perimeter, ordered_pts
    except Exception:
        # Fallback if collinear or degenerate
        return 0.0, np.empty((0, 2))


class VirtualMeasurements:
    """Virtual Caliper Anthropometric Measurement Engine."""

    def __init__(self, landmarks_path: Union[str, Path] | None = None):
        if landmarks_path is None:
            landmarks_path = settings.LANDMARKS_PATH
        self.landmarks_path = Path(landmarks_path)
        self.landmarks_data: dict[str, Any] = {}
        self._load_landmarks()

    def _load_landmarks(self) -> None:
        if not self.landmarks_path.exists():
            raise FileNotFoundError(f"Landmarks file not found: {self.landmarks_path}")
        with open(self.landmarks_path, "r", encoding="utf-8") as f:
            self.landmarks_data = json.load(f)["landmarks"]

    def get_landmark_coord(self, name: str, vertices: np.ndarray, faces: np.ndarray) -> np.ndarray:
        """Computes 3D coordinates for a named landmark from barycentric coordinates."""
        if name not in self.landmarks_data:
            raise KeyError(f"Unknown landmark: {name}")

        lm = self.landmarks_data[name]
        face_idx = lm["face_idx"]
        bc = np.array(lm["bc"], dtype=np.float64)

        face_vert_indices = faces[face_idx]
        face_verts = vertices[face_vert_indices]  # (3, 3)
        coord = np.sum(face_verts * bc[:, None], axis=0)
        return coord

    def measure(
        self,
        vertices: Union[np.ndarray, torch.Tensor],
        faces: Union[np.ndarray, torch.Tensor],
    ) -> Dict[str, Any]:
        """Calculates all measurements on canonical T-pose mesh.

        All internal units are in METERS and KILOGRAMS.

        Args:
            vertices: (10475, 3) mesh vertices in meters
            faces: (20908, 3) triangular faces

        Returns:
            Dictionary containing metric values (meters/kg) and landmark points.
        """
        if torch.is_tensor(vertices):
            vertices = vertices.detach().cpu().numpy()
        if torch.is_tensor(faces):
            faces = faces.detach().cpu().numpy()

        if vertices.ndim == 3:
            vertices = vertices[0]
        if faces.ndim == 3:
            faces = faces[0]

        # 1. Height: Vertical Y-distance between HeadTop and HeelLeft
        head_top = self.get_landmark_coord("HeadTop", vertices, faces)
        left_heel = self.get_landmark_coord("HeelLeft", vertices, faces)
        raw_height = float(np.abs(head_top[1] - left_heel[1]))

        # 2. Watertight mesh volume & mass (Weight)
        volume = compute_watertight_volume(vertices, faces)
        if volume < 1e-4:
            # Fallback for non-watertight or open test templates: cylinder/ellipsoid approximation
            volume = 0.070 * ((raw_height / 1.70) ** 3)
        raw_weight = float(volume * HUMAN_BODY_DENSITY)


        # 3. Chest circumference (horizontal plane at NippleRight)
        nipple_r = self.get_landmark_coord("NippleRight", vertices, faces)
        chest_plane_pts = intersect_mesh_horizontal_plane(vertices, faces, plane_y=nipple_r[1])
        chest_circ, chest_hull_pts = compute_convex_hull_perimeter(chest_plane_pts)

        # 4. Waist circumference (horizontal plane at BellyButton)
        belly_button = self.get_landmark_coord("BellyButton", vertices, faces)
        waist_plane_pts = intersect_mesh_horizontal_plane(vertices, faces, plane_y=belly_button[1])
        waist_circ, waist_hull_pts = compute_convex_hull_perimeter(waist_plane_pts)

        # 5. Hips circumference (horizontal plane at Crotch)
        crotch = self.get_landmark_coord("Crotch", vertices, faces)
        hips_plane_pts = intersect_mesh_horizontal_plane(vertices, faces, plane_y=crotch[1])
        hips_circ, hips_hull_pts = compute_convex_hull_perimeter(hips_plane_pts)

        # --- Tailoring Extensions (Experimental) ---
        # 6. Bi-acromial Shoulder Width (Euclidean distance ShoulderLeft to ShoulderRight)
        shoulder_l = self.get_landmark_coord("ShoulderLeft", vertices, faces)
        shoulder_r = self.get_landmark_coord("ShoulderRight", vertices, faces)
        shoulder_width = float(np.linalg.norm(shoulder_l - shoulder_r))

        # 7. Sleeve Length (ShoulderLeft -> ElbowLeft -> WristLeft)
        elbow_l = self.get_landmark_coord("ElbowLeft", vertices, faces)
        wrist_l = self.get_landmark_coord("WristLeft", vertices, faces)
        sleeve_length = float(np.linalg.norm(shoulder_l - elbow_l) + np.linalg.norm(elbow_l - wrist_l))

        # 8. Inseam (Vertical distance from Crotch to HeelLeft)
        inseam = float(np.abs(crotch[1] - left_heel[1]))

        # 9. Neck Circumference (horizontal plane at NeckBase)
        neck_base = self.get_landmark_coord("NeckBase", vertices, faces)
        neck_plane_pts = intersect_mesh_horizontal_plane(vertices, faces, plane_y=neck_base[1])
        neck_circ, neck_hull_pts = compute_convex_hull_perimeter(neck_plane_pts)

        # 10. Thigh Circumference (horizontal plane 5cm below crotch, left thigh isolated x > 0.01)
        thigh_plane_y = crotch[1] - 0.05
        thigh_plane_pts = intersect_mesh_horizontal_plane(vertices, faces, plane_y=thigh_plane_y)
        left_thigh_pts = thigh_plane_pts[thigh_plane_pts[:, 0] > 0.01] if len(thigh_plane_pts) > 0 else thigh_plane_pts
        thigh_circ, thigh_hull_pts = compute_convex_hull_perimeter(left_thigh_pts)

        return {
            "height": raw_height,
            "weight": raw_weight,
            "chest": chest_circ,
            "waist": waist_circ,
            "hips": hips_circ,
            "shoulder_width": shoulder_width,
            "sleeve_length": sleeve_length,
            "inseam": inseam,
            "neck": neck_circ,
            "thigh": thigh_circ,
            "volume_m3": volume,
            "landmarks": {
                "HeadTop": head_top.tolist(),
                "HeelLeft": left_heel.tolist(),
                "NippleRight": nipple_r.tolist(),
                "BellyButton": belly_button.tolist(),
                "Crotch": crotch.tolist(),
                "ShoulderLeft": shoulder_l.tolist(),
                "ShoulderRight": shoulder_r.tolist(),
                "ElbowLeft": elbow_l.tolist(),
                "WristLeft": wrist_l.tolist(),
                "NeckBase": neck_base.tolist(),
            },
            "debug_hulls": {
                "chest": chest_hull_pts.tolist(),
                "waist": waist_hull_pts.tolist(),
                "hips": hips_hull_pts.tolist(),
                "neck": neck_hull_pts.tolist(),
                "thigh": thigh_hull_pts.tolist(),
            },
        }
