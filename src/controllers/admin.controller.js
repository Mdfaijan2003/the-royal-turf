// // src/controllers/admin.controller.js

import { Admin } from "../models/Admin.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

// // REGISTER ADMIN
export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, phone, password, adminSecret } = req.body;

  if (!name || !email || !phone || !password)
    throw new ApiError(400, "All fields are required");

  if (adminSecret !== process.env.ADMIN_SECRET)
    throw new ApiError(401, "Unauthorized to create admin");

  const exists = await Admin.findOne({ $or: [{ email }, { phone }] });
  if (exists) throw new ApiError(409, "Admin already exists");

  const admin = await Admin.create({
    name,
    email,
    phone,
    password,
    role: "admin",
  });

  return res
    .status(201)
    .json(
      new apiResponse(201, { id: admin._id }, "Admin registered successfully")
    );
});

// LOGIN ADMIN
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    if (admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    const isValid = await admin.isPasswordCorrect(password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();

    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });

    const cookieOptions = {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 10 * 24 * 60 * 60 * 1000,
    });

    const safeAdmin = await Admin.findById(admin._id).select(
      "-password -refreshToken"
    );

    return res.status(200).json({
      success: true,
      admin: safeAdmin,
      message: "Admin login successful",
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// /* ======================================================
//    🔹 LOGOUT ADMIN
// ====================================================== */
export const logoutAdmin = asyncHandler(async (req, res) => {
  const adminId = req.admin?._id;

  if (!adminId) throw new ApiError(401, "Unauthorized");

  await Admin.findByIdAndUpdate(adminId, { $unset: { refreshToken: "" } });

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Logged out successfully"));
});

// /* ======================================================
//    🔹 REFRESH TOKEN
// ====================================================== */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefresh = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefresh) throw new ApiError(401, "Missing refresh token");

  const decoded = jwt.verify(incomingRefresh, process.env.REFRESH_TOKEN_SECRET);

  const admin = await Admin.findById(decoded._id);
  if (!admin) throw new ApiError(401, "Invalid token user not found");

  if (admin.refreshToken !== incomingRefresh)
    throw new ApiError(401, "Refresh token expired or reused");

  const newAccess = admin.generateAccessToken();
  const newRefresh = admin.generateRefreshToken();

  admin.refreshToken = newRefresh;
  await admin.save({ validateBeforeSave: false });

  const cookieOpt = {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 1 * 24 * 60 * 60 * 1000,
  };

  res.cookie("accessToken", newAccess, cookieOpt);
  res.cookie("refreshToken", newRefresh, {
    ...cookieOpt,
    maxAge: 10 * 24 * 60 * 60 * 1000,
  });

  return res
    .status(200)
    .json(new apiResponse(200, { accessToken: newAccess }, "Token refreshed"));
});

// /* ======================================================
//    🔹 CHANGE PASSWORD
// ====================================================== */
export const changeAdminPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body;

  if (!oldPassword || !newPassword || !confPassword)
    throw new ApiError(400, "All password fields are required");

  if (newPassword !== confPassword)
    throw new ApiError(400, "New password mismatch");

  const admin = await Admin.findById(req.admin._id).select("+password");

  if (!admin) throw new ApiError(404, "Admin not found");

  if (!(await admin.isPasswordCorrect(oldPassword)))
    throw new ApiError(400, "Invalid old password");

  admin.password = newPassword;
  admin.refreshToken = null; // logout from all sessions
  await admin.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password updated successfully"));
});

// /* ======================================================
//    🔹 CURRENT ADMIN PROFILE
// ====================================================== */
export const getCurrentAdmin = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.admin, "Admin info fetched"));
});
