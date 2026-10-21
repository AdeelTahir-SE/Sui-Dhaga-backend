"""SHAPY inference wrapper module.

Wraps the pretrained SHAPY regressor network:
Input: cropped RGB image tensor (3, 256, 256)
Output: SMPL-X shape betas (10,), body pose (63,), global orient (3,), and camera parameters.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Union
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger("measurement-service")

from app.core.config import settings, BASE_DIR


def _ensure_safe_torch_load():
    """Patches torch.load to force weights_only=False for PyTorch 2.6+ checkpoint unpickling."""
    _orig_load = torch.load
    def safe_load(*args, **kwargs):
        kwargs["weights_only"] = False
        return _orig_load(*args, **kwargs)
    torch.load = safe_load


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
        self.use_official = False
        self.official_model: Optional[nn.Module] = None

        # Attempt to load the official SHAPY model first
        loaded_official = self._try_load_official_shapy()
        if not loaded_official:
            # Fallback network for lightweight testing without weights
            self._build_fallback_network()
            self._load_fallback_checkpoint()

        self.is_loaded = True

    def _try_load_official_shapy(self) -> bool:
        """Attempts to load the upstream official SHAPY HRNet-W48 + iterative MLP regressor."""
        # Locate checkpoint
        best_ckpt = self.checkpoint_path / "best_checkpoint" if self.checkpoint_path.is_dir() else self.checkpoint_path
        if not best_ckpt.exists():
            # Check within trained_models
            alt_ckpt = BASE_DIR / "models_shapy" / "trained_models" / "shapy" / "SHAPY_A" / "checkpoints" / "best_checkpoint"
            if alt_ckpt.exists():
                best_ckpt = alt_ckpt
            else:
                logger.info(f"Official SHAPY best_checkpoint not found at {best_ckpt}. Using fallback.")
                return False

        vendor_dir = BASE_DIR / "vendor" / "shapy"
        if not vendor_dir.exists():
            logger.info(f"Official SHAPY vendor repository not found at {vendor_dir}. Using fallback.")
            return False

        try:
            # Add vendor packages to sys.path
            for sub in ["regressor", "mesh-mesh-intersection", "attributes"]:
                p = str(vendor_dir / sub)
                if p not in sys.path:
                    sys.path.insert(0, p)

            _ensure_safe_torch_load()

            from omegaconf import OmegaConf
            from human_shape.config.defaults import conf as default_conf
            from human_shape.models.build import build_model
            from human_shape.utils import Checkpointer

            config_file = vendor_dir / "regressor" / "configs" / "b2a_expose_hrnet_demo.yaml"
            if not config_file.exists():
                logger.warning(f"Config file {config_file} not found.")
                return False

            cfg = default_conf.copy()
            yaml_cfg = OmegaConf.load(str(config_file))
            cfg.merge_with(yaml_cfg)

            cfg.is_training = False
            cfg.body_model.model_folder = str(settings.SMPLX_MODEL_PATH)
            cfg.network.smplx.backbone.pretrained = False
            cfg.network.smplx.backbone.hrnet.pretrained_path = str(best_ckpt)
            cfg.network.smplx.use_b2a = False
            cfg.network.smplx.use_a2b = False
            cfg.network.smplx.compute_measurements = False

            models_shapy_dir = BASE_DIR / "models_shapy"
            female_prior = models_shapy_dir / "utility_files" / "shape_priors" / "female_normal.npz"
            male_prior = models_shapy_dir / "utility_files" / "shape_priors" / "male_normal.npz"
            if female_prior.exists():
                cfg.losses.body.shape.prior.gender_shape.female_stats_path = str(female_prior)
            if male_prior.exists():
                cfg.losses.body.shape.prior.gender_shape.male_stats_path = str(male_prior)

            logger.info("Building official SHAPY model (HRNet-W48 + iterative MLP)...")
            model_dict = build_model(cfg)
            model = model_dict["network"]

            ckpt_dir = best_ckpt.parent if best_ckpt.is_file() else best_ckpt
            checkpointer = Checkpointer(model, save_dir=str(ckpt_dir))
            extra_data = checkpointer.load_checkpoint()
            iteration = extra_data.get("iteration", "unknown") if isinstance(extra_data, dict) else "unknown"

            model = model.to(self.device)
            model.eval()
            self.official_model = model
            self.use_official = True
            logger.info(f"Official SHAPY model successfully loaded (iteration {iteration}) on {self.device}.")
            return True

        except Exception as e:
            logger.error(f"Failed to load official SHAPY model: {e}", exc_info=True)
            self.official_model = None
            self.use_official = False
            return False

    def _build_fallback_network(self) -> None:
        """Constructs fallback feature extractor and regression heads when weights are unavailable."""
        try:
            import torchvision.models as models
            resnet = models.resnet50(weights=models.ResNet50_Weights.DEFAULT if not self.checkpoint_path.exists() else None)
            modules = list(resnet.children())[:-1]
            self.backbone = nn.Sequential(*modules)
        except Exception:
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

        feat_dim = 2048
        hidden_dim = 1024

        self.fc_shared = nn.Sequential(
            nn.Linear(feat_dim, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.1),
        )

        self.head_betas = nn.Linear(hidden_dim, self.num_betas)
        self.head_body_pose = nn.Linear(hidden_dim, 63)
        self.head_global_orient = nn.Linear(hidden_dim, 3)
        self.head_camera = nn.Linear(hidden_dim, 3)

        self.to(self.device)
        self.eval()

    def _load_fallback_checkpoint(self) -> None:
        """Loads fallback weights if present."""
        if not self.checkpoint_path.exists():
            return
        ckpt_files = list(self.checkpoint_path.glob("*.pt*")) + list(self.checkpoint_path.glob("*.ckpt*"))
        if not ckpt_files:
            return
        ckpt_file = ckpt_files[0]
        try:
            state = torch.load(ckpt_file, map_location=self.device)
            state_dict = state.get("state_dict", state.get("model", state))
            self.load_state_dict(state_dict, strict=False)
        except Exception as e:
            logger.warning(f"Could not load fallback checkpoint: {e}")

    @torch.no_grad()
    def infer(
        self,
        cropped_img_tensor: Union[np.ndarray, torch.Tensor],
        gender: str = "neutral",
    ) -> Dict[str, Any]:
        """Runs regressor inference on normalized image crop.

        Args:
            cropped_img_tensor: (3, H, W) normalized image array or tensor
            gender: 'male', 'female', or 'neutral'

        Returns:
            dict containing:
                betas: (10,) numpy array of shape coefficients
                body_pose: (63,) numpy array of joint rotations in angle-axis format
                global_orient: (3,) numpy array of global rotation in angle-axis format
                camera_scale: float
                camera_transl: (2,) numpy array
                gender: str
        """
        self.eval()

        if isinstance(cropped_img_tensor, np.ndarray):
            tensor = torch.from_numpy(cropped_img_tensor).float()
        else:
            tensor = cropped_img_tensor.float()

        if tensor.ndim == 3:
            tensor = tensor.unsqueeze(0)  # (1, 3, H, W)

        tensor = tensor.to(self.device)

        # Official SHAPY HRNet-W48 inference path
        if self.use_official and self.official_model is not None:
            # Ensure 256x256 resolution expected by SHAPY HRNet
            if tensor.shape[-2:] != (256, 256):
                tensor = F.interpolate(tensor, size=(256, 256), mode="bilinear", align_corners=False)

            out = self.official_model(tensor, compute_losses=False)
            last_stage = out.get("stage_02", out.get(out.get("stage_keys", ["stage_00"])[-1]))

            # Predicted shape betas (1, 10)
            pred_betas = last_stage["betas"][0].detach().cpu().numpy()[:self.num_betas]

            # Predicted body pose: (1, 21, 3, 3) rotation matrices -> convert to (63,) angle-axis
            body_pose_mats = last_stage["body_pose"][0].detach().cpu().numpy()
            aa_body_list = []
            for i in range(body_pose_mats.shape[0]):
                aa, _ = cv2.Rodrigues(body_pose_mats[i])
                aa_body_list.append(aa.flatten())
            pred_body_pose = np.concatenate(aa_body_list)

            # Predicted global orient: (1, 1, 3, 3) rotation matrix -> convert to (3,) angle-axis
            global_rot_mat = last_stage["global_rot"][0, 0].detach().cpu().numpy()
            pred_global_orient, _ = cv2.Rodrigues(global_rot_mat)
            pred_global_orient = pred_global_orient.flatten()

            # Camera parameters
            cam_params = out.get("camera_parameters")
            if cam_params is not None:
                camera_scale = float(cam_params.scale[0, 0].detach().cpu().numpy())
                camera_transl = cam_params.translation[0].detach().cpu().numpy()
            else:
                camera_scale = 1.0
                camera_transl = np.zeros(2, dtype=np.float32)

            return {
                "betas": pred_betas,
                "body_pose": pred_body_pose,
                "global_orient": pred_global_orient,
                "camera_scale": camera_scale,
                "camera_transl": camera_transl,
                "gender": gender,
            }

        # Fallback forward pass
        feats = self.backbone(tensor)
        feats = feats.flatten(1)
        shared = self.fc_shared(feats)

        pred_betas = self.head_betas(shared)
        pred_body_pose = self.head_body_pose(shared)
        pred_global_orient = self.head_global_orient(shared)
        pred_camera = self.head_camera(shared)

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
