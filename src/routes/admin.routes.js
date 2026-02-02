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

//Boking routes
import {
  adminListBookings,
  adminGetBookingDetails,
  adminCancelBooking,
  adminCompleteBooking,
  adminManualPayment,
  adminRequestOnlinePayment,
  adminExportBookings,
  adminExportBookingsPDF,
  adminManualBookingCreate,
} from "../controllers/admin.booking.controller.js";

// Dashboard
import { getDashboardSummary } from "../controllers/dashboard.controllers.js";
import {verifyAdminJWT, requireAdminRole} from "../middleware/auth.middleware.js";

//slots
import { 
  getAdminSlotsByDate,
  adminForceReleaseSlot,
  adminGetHeldSlots,
  adminCreateHeldSlot,
  adminConvertHeldToManualBooking,
  adminGetSlotDetail,
 } from "../controllers/admin.slots.controller.js";
import { adminBlockSlots } from "../controllers/admin.slot.block.controller.js";

//Audit file 
import { adminGetAuditLogs } from "../controllers/admin.audit.controller.js";




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
router.post("/bookings/manual", verifyAdminJWT, requireAdminRole,adminManualBookingCreate);

//requireAdminRole,



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

//===== slots =====

router.get( "/slots", verifyAdminJWT, requireAdminRole,getAdminSlotsByDate);
router.get("/slots/held", verifyAdminJWT, requireAdminRole,adminGetHeldSlots);

router.post("/slots/hold", verifyAdminJWT, requireAdminRole,adminCreateHeldSlot);

router.post("/slots/held/:lockId/convert", verifyAdminJWT,requireAdminRole, adminConvertHeldToManualBooking);

router.post("/slots/force-release/:lockId", verifyAdminJWT,requireAdminRole, adminForceReleaseSlot);

router.post("/slots/block", verifyAdminJWT, requireAdminRole,adminBlockSlots);

router.get("/slots/detail", verifyAdminJWT, requireAdminRole,adminGetSlotDetail
);

//===== Audit Logs =====
router.get("/audit-logs", verifyAdminJWT, requireAdminRole,adminGetAuditLogs);





//697f0050982a4022e01b9891

export default router;
