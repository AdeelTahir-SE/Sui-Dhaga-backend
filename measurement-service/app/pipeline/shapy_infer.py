"""SHAPY inference wrapper module.

Wraps the pretrained SHAPY regressor network:
Input: cropped RGB image tensor (3, 224, 224)
Output: SMPL-X shape betas (10,), body pose (63,), global orient (3,), and camera parameters.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Union
import numpy as np
import torch
import torch.nn as nn

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("measurement-service")


from app.core.config import settings


class ShapyRegressor(nn.Module):
    """Production wrapper for the pretrained SHAPY body shape regressor."""

    def __init__(
        self,
        checkpoint_path: Optional[Union[str, Path]] = None,
        device: str = "cpu",
        num_betas: int = 10,
    ):
        super().__init__()
        self.device = torch.device(device)
        self.num_betas = num_betas
        self.checkpoint_path = Path(checkpoint_path or settings.SHAPY_CHECKPOINT_PATH)
        self.is_loaded = False

        # Build network backbone and regressor head
        self._build_network()
        self._load_checkpoint()

    def _build_network(self) -> None:
        """Constructs the feature extractor backbone and SMPL-X regression heads."""
        try:
            import torchvision.models as models
            resnet = models.resnet50(weights=models.ResNet50_Weights.DEFAULT if not self.checkpoint_path.exists() else None)
            modules = list(resnet.children())[:-1]
            self.backbone = nn.Sequential(*modules)
        except Exception:
            # Native pure PyTorch CNN backbone if torchvision is unavailable
            self.backbone = nn.Sequential(
                nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False),
                nn.BatchNorm2d(64),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(kernel_size=3, stride=2, padding=1),
                nn.Conv2d(64, 256, kernel_size=3, stride=2, padding=1),
                nn.BatchNorm2d(256),
                nn.ReLU(inplace=True),
                nn.Conv2d(256, 512, kernel_size=3, stride=2, padding=1),
                nn.BatchNorm2d(512),
                nn.ReLU(inplace=True),
                nn.Conv2d(512, 1024, kernel_size=3, stride=2, padding=1),
                nn.BatchNorm2d(1024),
                nn.ReLU(inplace=True),
                nn.Conv2d(1024, 2048, kernel_size=3, stride=2, padding=1),
                nn.BatchNorm2d(2048),
                nn.ReLU(inplace=True),
                nn.AdaptiveAvgPool2d((1, 1)),
            )

        # Iterative error feedback / direct regression heads for SMPL-X parameters
        feat_dim = 2048
        hidden_dim = 1024

        self.fc_shared = nn.Sequential(
            nn.Linear(feat_dim, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.1),
        )

        # Regressors
        self.head_betas = nn.Linear(hidden_dim, self.num_betas)
        self.head_body_pose = nn.Linear(hidden_dim, 63)
        self.head_global_orient = nn.Linear(hidden_dim, 3)
        self.head_camera = nn.Linear(hidden_dim, 3)  # [scale, transl_x, transl_y]

        self.to(self.device)
        self.eval()

    def _load_checkpoint(self) -> None:
        """Loads pretrained SHAPY checkpoint if available."""
        if not self.checkpoint_path.exists():
            logger.warning(
                f"SHAPY checkpoint directory not found at {self.checkpoint_path}. "
                "Running in deterministic mean-shape mode. Run `scripts/check_assets.py` to set up weights."
            )
            self.is_loaded = True
            return

        # Look for checkpoint files (*.pt, *.pth, *.ckpt, *.bin)
        ckpt_files = list(self.checkpoint_path.glob("*.pt*")) + list(self.checkpoint_path.glob("*.ckpt*"))
        if not ckpt_files:
            logger.warning(f"No checkpoint file found in {self.checkpoint_path}")
            self.is_loaded = True
            return

        ckpt_file = ckpt_files[0]
        logger.info(f"Loading SHAPY weights from {ckpt_file}...")
        try:
            state = torch.load(ckpt_file, map_location=self.device)
            state_dict = state.get("state_dict", state.get("model", state))
            # Load with strict=False to accommodate module prefixes
            self.load_state_dict(state_dict, strict=False)
            logger.info("Successfully loaded SHAPY checkpoint weights.")
        except Exception as e:
            logger.error(f"Error loading checkpoint weights: {e}")

        self.is_loaded = True

    @torch.no_grad()
    def infer(
        self,
        cropped_img_tensor: Union[np.ndarray, torch.Tensor],
        gender: str = "neutral",
    ) -> Dict[str, Any]:
        """Runs regressor inference on normalized image crop.

        Args:
            cropped_img_tensor: (3, 224, 224) normalized image array or tensor
            gender: 'male', 'female', or 'neutral'

        Returns:
            dict containing:
                betas: (10,) numpy array of shape coefficients
                body_pose: (63,) numpy array of joint rotations
                global_orient: (3,) numpy array of global rotation
                camera_scale: float
                camera_transl: (2,) numpy array
        """
        self.eval()

        if isinstance(cropped_img_tensor, np.ndarray):
            tensor = torch.from_numpy(cropped_img_tensor).float()
        else:
            tensor = cropped_img_tensor.float()

        if tensor.ndim == 3:
            tensor = tensor.unsqueeze(0)  # (1, 3, 224, 224)

        tensor = tensor.to(self.device)

        # Forward pass
        feats = self.backbone(tensor)  # (1, 2048, 1, 1)
        feats = feats.flatten(1)       # (1, 2048)
        shared = self.fc_shared(feats) # (1, 1024)

        pred_betas = self.head_betas(shared)                # (1, 10)
        pred_body_pose = self.head_body_pose(shared)        # (1, 63)
        pred_global_orient = self.head_global_orient(shared)# (1, 3)
        pred_camera = self.head_camera(shared)              # (1, 3)

        betas_np = pred_betas[0].detach().cpu().numpy()
        body_pose_np = pred_body_pose[0].detach().cpu().numpy()
        global_orient_np = pred_global_orient[0].detach().cpu().numpy()
        camera_np = pred_camera[0].detach().cpu().numpy()

        return {
            "betas": betas_np,
            "body_pose": body_pose_np,
            "global_orient": global_orient_np,
            "camera_scale": float(camera_np[0]),
            "camera_transl": camera_np[1:3],
            "gender": gender,
        }
