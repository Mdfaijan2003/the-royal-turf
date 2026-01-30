// src/routes/admin.routes.js

import { Router } from "express";
import {
  // registerAdmin,
  loginAdmin,
  // logoutAdmin,
  // refreshAccessToken,
  // changeAdminPassword,
  // getCurrentAdmin
} from "../controllers/admin.controller.js";
import {
  adminListBookings,
  adminGetBookingDetails,
  adminCancelBooking,
  adminCompleteBooking,
  adminManualPayment,
  adminRequestOnlinePayment,
  adminExportBookings,
  adminExportBookingsPDF
} from "../controllers/admin.booking.controller.js";


import { getDashboardSummary } from "../controllers/dashboard.controllers.js";
import {verifyAdminJWT, requireAdminRole} from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", loginAdmin);

router.get("/bookings", verifyAdminJWT, requireAdminRole, adminListBookings);

// ✅ EXPORT FIRST
router.get("/bookings/export", verifyAdminJWT, requireAdminRole,adminExportBookings );
router.get("/bookings/export/pdf", verifyAdminJWT, requireAdminRole,adminExportBookingsPDF);

// ✅ THEN ID ROUTES
router.get( "/bookings/:id", verifyAdminJWT, requireAdminRole, adminGetBookingDetails);
router.post("/bookings/:id/cancel", verifyAdminJWT, requireAdminRole, adminCancelBooking);
router.post("/bookings/:id/complete", verifyAdminJWT, requireAdminRole, adminCompleteBooking);
router.post("/bookings/:id/manual-payment", verifyAdminJWT, requireAdminRole, adminManualPayment);
router.post("/bookings/:id/request-payment", verifyAdminJWT, requireAdminRole, adminRequestOnlinePayment);




// ===== Public (initial only) =====
// router.post("/register", registerAdmin);
// router.post("/login", loginAdmin);
router.get("/dashboard/summary", verifyAdminJWT, requireAdminRole,
  getDashboardSummary
);
// router.post("/refresh-token", refreshAccessToken);

// ===== Private Admin =====
// router.post("/logout", verifyAdminJWT, requireAdminRole, logoutAdmin);
// router.post("/change-password", verifyAdminJWT, requireAdminRole, changeAdminPassword);
// router.get("/me", verifyAdminJWT, requireAdminRole, getCurrentAdmin);

export default router;
