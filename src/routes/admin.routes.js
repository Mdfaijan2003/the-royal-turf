// src/routes/admin.routes.js

import { Router } from "express";
import {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  refreshAccessToken,
  changeAdminPassword,
  getCurrentAdmin
} from "../controllers/admin.controller.js";

import { verifyAdminJWT, requireAdminRole } from "../middleware/auth.middleware.js";

const router = Router();

// ===== Public (initial only) =====
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/refresh-token", refreshAccessToken);

// ===== Private Admin =====
router.post("/logout", verifyAdminJWT, requireAdminRole, logoutAdmin);
router.post("/change-password", verifyAdminJWT, requireAdminRole, changeAdminPassword);
router.get("/me", verifyAdminJWT, requireAdminRole, getCurrentAdmin);

export default router;
