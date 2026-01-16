// src/models/gallery.model.js
import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    url: { 
        type: String, 
        required: true
    },
    publicId: {
        type: String, 
        required: true 
    },
    resourceType: { 
        type: String, 
        enum: ["image", "video", "raw"], 
        required: true 
    },
    caption: { 
        type: String, 
        default: "" 
    },
    uploadedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Admin", 
        required: true 
    },
  },
  { timestamps: true }
);

export const Gallery = mongoose.model("Gallery", gallerySchema);
