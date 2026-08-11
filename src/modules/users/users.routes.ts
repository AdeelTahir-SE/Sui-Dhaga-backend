import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as usersController from "./users.controller.js";
import { updateProfileSchema, updateAvatarSchema } from "./users.validator.js";

export const usersRoutes = Router();

usersRoutes.get("/users/me", requireAuth, asyncHandler(usersController.getMyProfile));
usersRoutes.patch("/users/me", requireAuth, validate(updateProfileSchema), asyncHandler(usersController.updateMyProfile));
usersRoutes.patch("/users/me/avatar", requireAuth, validate(updateAvatarSchema), asyncHandler(usersController.updateAvatar));
usersRoutes.delete("/users/me", requireAuth, asyncHandler(usersController.deleteMyProfile));
usersRoutes.get("/users/:userId", requireAuth, asyncHandler(usersController.getUserById));
