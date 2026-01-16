// src/middlewares/admin.auth.js

import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin.model.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyAdminJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) throw new ApiError(401, "Unauthorized - No token provided");

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const admin = await Admin.findById(decoded?._id).select("-password -refreshToken");

    if (!admin) throw new ApiError(401, "Invalid token or admin not found");

    req.admin = admin;
    next();
  } catch (err) {
    next(new ApiError(401, err.message));
  }
};

export const requireAdminRole = (req, res, next) => {
  if (!req.admin || req.admin.role !== "admin") {
    throw new ApiError(403, "Access denied - Admin only");
  }
  next();
};
