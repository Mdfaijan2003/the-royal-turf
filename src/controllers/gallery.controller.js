// src/controllers/gallery.controller.js

import { Gallery } from "../models/Gallery.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const uploaded = await uploadOnCloudinary(req.file.path);
    if (!uploaded) return res.status(500).json({ error: "Upload failed" });

    const item = await Gallery.create({
      url: uploaded.url,
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType,
      caption: req.body.caption || "",
      uploadedBy: req.admin._id,
    });

    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getGallery = async (req, res) => {
  const items = await Gallery.find().sort({ createdAt: -1 });
  res.json({ success: true, items });
};

export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Gallery.findById(id);

    if (!item) return res.status(404).json({ error: "Media not found" });

    await deleteFromCloudinary(item.publicId, item.resourceType);
    await item.deleteOne();

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
