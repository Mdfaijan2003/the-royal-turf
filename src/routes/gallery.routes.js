// src/routes/gallery.routes.js

import express from "express";
import { uploadMedia, getGallery, deleteMedia } from "../controllers/gallery.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyAdminJWT, requireAdminRole } from "../middleware/auth.middleware.js";


const router = express.Router();

router.get("/", getGallery);
router.post("/", verifyAdminJWT, requireAdminRole, upload.single("file"), uploadMedia);
router.delete("/:id", verifyAdminJWT, requireAdminRole, deleteMedia);

export default router;
