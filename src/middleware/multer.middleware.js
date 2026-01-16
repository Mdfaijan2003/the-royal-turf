// src/middlewares/multer.middleware.js

import multer from "multer";
import fs from "fs";
import path from "path";

const tempDir = "./public/temp";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/",
    "video/",
    "application/pdf",
  ];

  if (allowed.some(type => file.mimetype.startsWith(type))) {
    cb(null, true);
  } else {
    cb(new Error("Only Images, Videos, or PDF allowed"), false);
  }
};

export const upload = multer({ storage, fileFilter });
