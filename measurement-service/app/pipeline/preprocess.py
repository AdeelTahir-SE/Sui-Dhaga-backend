"""Image decoding, EXIF rotation, person detection, and quality gate module."""

from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image, ImageOps
import torch

from app.core.config import settings
from app.core.errors import ErrorCode, MeasurementServiceException


def decode_image_bytes(image_bytes: bytes) -> Image.Image:
    """Decodes image bytes, respects EXIF orientation, and converts to RGB."""
    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        # Handle EXIF orientation (e.g. phone camera portrait mode)
        pil_image = ImageOps.exif_transpose(pil_image)
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        return pil_image
    except Exception as e:
        raise MeasurementServiceException(
            code=ErrorCode.INVALID_IMAGE,
            detail=f"Failed to decode uploaded image: {str(e)}",
        )


class QualityGateAndDetector:
    """Quality gate and bounding box detector for full-body photos."""

    def __init__(self, device: str = "cpu"):
        self.device = torch.device(device)
        self.detector = None
        self._load_detector()

    def _load_detector(self) -> None:
        """Attempts to load torchvision Keypoint R-CNN for high-precision detection."""
        try:
            from torchvision.models.detection import keypointrcnn_resnet50_fpn, KeypointRCNN_ResNet50_FPN_Weights
            self.detector = keypointrcnn_resnet50_fpn(
                weights=KeypointRCNN_ResNet50_FPN_Weights.DEFAULT
            ).to(self.device)
            self.detector.eval()
        except Exception:
            # Fallback to visual contour / heuristic detector if weights offline
            self.detector = None

    def process_and_validate(
        self, pil_image: Image.Image
    ) -> Tuple[np.ndarray, Tuple[float, float, float, float], List[str]]:
        """Validates image against quality constraints and extracts person crop.

        Returns:
            (cropped_normalized_tensor, (bbox_x1, bbox_y1, bbox_x2, bbox_y2), warnings)
        """
        width, height = pil_image.size
        warnings: List[str] = []

        # 1. Hard minimum resolution check
        if width < settings.MIN_IMAGE_WIDTH or height < settings.MIN_IMAGE_HEIGHT:
            raise MeasurementServiceException(
                code=ErrorCode.IMAGE_TOO_SMALL,
                detail=(
                    f"Image resolution ({width}x{height}) is below the required minimum "
                    f"({settings.MIN_IMAGE_WIDTH}x{settings.MIN_IMAGE_HEIGHT}). "
                    "Please provide a higher-resolution full-body photo."
                ),
            )

        # 2. Auto-upscale if below recommended resolution to improve keypoint and feature extraction
        if width < settings.RECOMMENDED_IMAGE_WIDTH or height < settings.RECOMMENDED_IMAGE_HEIGHT:
            scale = max(
                settings.RECOMMENDED_IMAGE_WIDTH / float(width),
                settings.RECOMMENDED_IMAGE_HEIGHT / float(height),
            )
            if scale > 1.0:
                new_w = int(round(width * scale))
                new_h = int(round(height * scale))
                pil_image = pil_image.resize((new_w, new_h), Image.Resampling.LANCZOS)
                warnings.append(
                    f"Image resolution ({width}x{height}) is below recommended "
                    f"{settings.RECOMMENDED_IMAGE_WIDTH}x{settings.RECOMMENDED_IMAGE_HEIGHT}. "
                    f"Auto-upscaled to ({new_w}x{new_h}) for feature extraction."
                )

        np_img = np.array(pil_image)

        # 3. Person & Keypoint Detection
        bbox, keypoints_ok, has_multiple = self._detect_person(np_img)

        if has_multiple:
            raise MeasurementServiceException(
                code=ErrorCode.MULTIPLE_PEOPLE,
                detail="Multiple prominent persons detected in photo. Please ensure only the customer is in frame.",
            )

        if bbox is None:
            raise MeasurementServiceException(
                code=ErrorCode.NO_PERSON,
                detail="No person detected in the image. Please ensure good lighting and clear contrast.",
            )

        if not keypoints_ok:
            raise MeasurementServiceException(
                code=ErrorCode.BODY_NOT_FULLY_VISIBLE,
                detail="Full body not completely visible. Head, arms, and feet must be clearly in frame.",
            )

        # 4. Check for loose clothing heuristic
        # Ratio of bbox width to height for human standing pose
        x1, y1, x2, y2 = bbox
        bw = x2 - x1
        bh = y2 - y1
        aspect = bw / max(1.0, bh)
        if aspect > 0.45:
            warnings.append(
                "Silhouette width is wide relative to height. Loose clothing or baggy fabric may cause overestimation."
            )

        # 5. Extract padded square crop
        cropped_tensor = self._extract_crop(np_img, bbox, crop_size=224)

        return cropped_tensor, bbox, warnings

    def _detect_person(
        self, np_img: np.ndarray
    ) -> Tuple[Optional[Tuple[float, float, float, float]], bool, bool]:
        """Runs detector to find the person and check keypoint coverage."""
        h, w = np_img.shape[:2]

        if self.detector is not None:
            try:
                from torchvision.transforms import functional as F
                img_tensor = F.to_tensor(np_img).to(self.device).unsqueeze(0)
                with torch.no_grad():
                    predictions = self.detector(img_tensor)[0]

                boxes = predictions["boxes"].cpu().numpy()
                scores = predictions["scores"].cpu().numpy()
                labels = predictions["labels"].cpu().numpy()
                keypoints = predictions.get("keypoints", torch.tensor([])).cpu().numpy()

                # Filter for person label (label == 1 in COCO)
                person_mask = (labels == 1) & (scores > 0.7)
                valid_boxes = boxes[person_mask]
                valid_scores = scores[person_mask]
                valid_kpts = keypoints[person_mask] if len(keypoints) > 0 else []

                if len(valid_boxes) > 0:
                    if len(valid_boxes) > 1:
                        # Check if second person is also prominent (> 35% area of main person)
                        areas = (valid_boxes[:, 2] - valid_boxes[:, 0]) * (valid_boxes[:, 3] - valid_boxes[:, 1])
                        sorted_idxs = np.argsort(areas)[::-1]
                        if areas[sorted_idxs[1]] > 0.35 * areas[sorted_idxs[0]]:
                            return None, False, True

                    main_idx = np.argmax(valid_scores)
                    best_box = tuple(valid_boxes[main_idx])

                    # Check keypoints for head and feet coverage
                    kpts_ok = True
                    if len(valid_kpts) > main_idx:
                        kpt = valid_kpts[main_idx]  # (17, 3): x, y, conf
                        # Indices 0=nose, 15=left_ankle, 16=right_ankle
                        nose_conf = kpt[0, 2]
                        l_ankle_conf = kpt[15, 2]
                        r_ankle_conf = kpt[16, 2]
                        feet_conf = max(l_ankle_conf, r_ankle_conf)
                        # Check if head and feet are visible and within frame
                        if nose_conf < settings.KEYPOINT_CONFIDENCE_THRESHOLD or feet_conf < settings.KEYPOINT_CONFIDENCE_THRESHOLD:
                            kpts_ok = False
                        elif (best_box[1] <= 2 and nose_conf < 0.5) or (best_box[3] >= (h - 2) and feet_conf < 0.5):
                            # Head or feet clipped directly at boundary with marginal confidence
                            kpts_ok = False

                    return best_box, kpts_ok, False
            except Exception:
                pass

        # Robust heuristic fallback (foreground person contour)
        # Assumes single subject standing in frame
        gray = np.mean(np_img, axis=-1)
        # Threshold gradient to find subject silhouette
        dy = np.abs(gray[1:, :] - gray[:-1, :])
        dx = np.abs(gray[:, 1:] - gray[:, :-1])
        edges = (dy[:, :-1] + dx[:-1, :]) > 15
        y_indices, x_indices = np.where(edges)

        if len(x_indices) < 500:
            return None, False, False

        x1 = float(np.percentile(x_indices, 2))
        x2 = float(np.percentile(x_indices, 98))
        y1 = float(np.percentile(y_indices, 2))
        y2 = float(np.percentile(y_indices, 98))

        # Check vertical coverage (person should occupy at least 35% of image height)
        person_height = y2 - y1
        if person_height < 0.35 * h:
            return None, False, False

        bbox = (x1, y1, x2, y2)
        # If head or feet are cut off right at border, flag not fully visible
        kpts_ok = (y1 >= 0.005 * h) and (y2 <= 0.995 * h)

        return bbox, kpts_ok, False

    def _extract_crop(
        self, np_img: np.ndarray, bbox: Tuple[float, float, float, float], crop_size: int = 224
    ) -> np.ndarray:
        """Extracts square padded crop, resizes, and normalizes for SHAPY network."""
        h, w = np_img.shape[:2]
        x1, y1, x2, y2 = bbox
        center_x = (x1 + x2) / 2.0
        center_y = (y1 + y2) / 2.0

        box_w = x2 - x1
        box_h = y2 - y1
        # Add 20% margin
        side = max(box_w, box_h) * 1.2

        crop_x1 = int(round(center_x - side / 2.0))
        crop_y1 = int(round(center_y - side / 2.0))
        crop_x2 = int(round(center_x + side / 2.0))
        crop_y2 = int(round(center_y + side / 2.0))

        # Pad image if crop goes out of bounds
        pad_left = max(0, -crop_x1)
        pad_top = max(0, -crop_y1)
        pad_right = max(0, crop_x2 - w)
        pad_bottom = max(0, crop_y2 - h)

        if any([pad_left, pad_top, pad_right, pad_bottom]):
            padded_img = np.pad(
                np_img,
                ((pad_top, pad_bottom), (pad_left, pad_right), (0, 0)),
                mode="edge",
            )
            crop_x1 += pad_left
            crop_x2 += pad_left
            crop_y1 += pad_top
            crop_y2 += pad_top
        else:
            padded_img = np_img

        cropped = padded_img[crop_y1:crop_y2, crop_x1:crop_x2]
        pil_crop = Image.fromarray(cropped).resize((crop_size, crop_size), Image.Resampling.BILINEAR)
        crop_arr = np.array(pil_crop, dtype=np.float32) / 255.0

        # ImageNet normalization: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (crop_arr - mean) / std

        # Transpose to (C, H, W)
        transposed = np.transpose(normalized, (2, 0, 1))
        return transposed
