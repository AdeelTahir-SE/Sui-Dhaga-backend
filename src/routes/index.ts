import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { resourceRoutes } from "../modules/resources/resources.routes.js";

export const apiRoutes = Router();
apiRoutes.use("/auth", authRoutes);
apiRoutes.use(resourceRoutes);
