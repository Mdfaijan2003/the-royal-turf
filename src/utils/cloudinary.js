// src/utils/cloudinary.js

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload handler
export const uploadOnCloudinary = async localFilePath => {
  try {
    if (!localFilePath) return null;

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // auto supports image + video + pdf
    });

    //fs.unlinkSync(localFilePath);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type, // image | video | raw
      format: result.format,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};

// Delete handler
export const deleteFromCloudinary = async (publicId, resourceType = "auto") => {
  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return res;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};
