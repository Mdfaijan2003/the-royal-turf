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
  addSalary,
  getPreviousMonthSalaries,
  salarySummary,
} from "../controllers/admin.salary.controller.js";

import {
  adminListBookings,
  adminGetBookingDetails,
  adminCancelBooking,
  adminCompleteBooking,
  adminManualPayment,
  searchBookingsById,
} from "../controllers/admin.booking.controller.js";

import {
  getDashboardSummary,
  getDashboardBookingLedger,
} from "../controllers/dashboard.controllers.js";
import {
  verifyAdminJWT,
  requireAdminRole,
} from "../middleware/auth.middleware.js";
import { unblockSlot } from "../controllers/admin.unBlockSlots.controller.js";
import { blockSlot } from "../controllers/admin.blockSlots.controller.js";
import { emergencyResetSlots } from "../controllers/admin.resetSlots.controller.js";
import {
  uploadMedia,
  getGallery,
  deleteMedia,
} from "../controllers/gallery.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  addExpense,
  getExpenses,
  deleteExpense,
  getFinanceSummary,
  exportExpensesCSV,
} from "../controllers/admin.finance.controller.js";

import {
  createStaff,
  getAllStaff,
} from "../controllers/admin.staff.controller.js";
import { financeCharts } from "../controllers/admin.finance.charts.controller.js";


const router = Router();

router.post("/login", loginAdmin);

router.get("/bookings", verifyAdminJWT, requireAdminRole, adminListBookings);
router.get(
  "/bookings/:id",
  verifyAdminJWT,
  requireAdminRole,
  adminGetBookingDetails
);
router.get(
  "/bookings/search",
  verifyAdminJWT,
  requireAdminRole,
  searchBookingsById
);
router.post(
  "/bookings/:id/cancel",
  verifyAdminJWT,
  requireAdminRole,
  adminCancelBooking
);
router.post(
  "/bookings/:id/complete",
  verifyAdminJWT,
  requireAdminRole,
  adminCompleteBooking
);
router.post(
  "/bookings/:id/manual-payment",
  verifyAdminJWT,
  requireAdminRole,
  adminManualPayment
);

// ===== Public (initial only) =====
// router.post("/register", registerAdmin);
// router.post("/login", loginAdmin);
router.get(
  "/dashboard/summary",
  verifyAdminJWT,
  requireAdminRole,
  getDashboardSummary
);
router.get(
  "/dashboard/bookings",
  verifyAdminJWT,
  requireAdminRole,
  getDashboardBookingLedger
);
router.get("/slots/block", verifyAdminJWT, requireAdminRole, blockSlot);
router.get("/slots/unblock", verifyAdminJWT, requireAdminRole, unblockSlot);
router.get(
  "/slots/emergency-reset",
  verifyAdminJWT,
  requireAdminRole,
  emergencyResetSlots
);

router.get("/gallery", getGallery);
router.post(
  "/gallery",
  verifyAdminJWT,
  requireAdminRole,
  upload.single("file"),
  uploadMedia
);
router.delete("/gallery/:id", verifyAdminJWT, requireAdminRole, deleteMedia);

/* Expenses */
router.post("/expenses", verifyAdminJWT, requireAdminRole, addExpense);
router.get("/expenses", verifyAdminJWT, requireAdminRole, getExpenses);
router.delete("/expenses/:id", verifyAdminJWT, requireAdminRole, deleteExpense);

/* Salaries */
router.post("/salaries",   verifyAdminJWT, requireAdminRole,  addSalary);
router.get("/salaries",   verifyAdminJWT, requireAdminRole,  getPreviousMonthSalaries);
router.get("/salaries/summary",  verifyAdminJWT, requireAdminRole,   salarySummary);

/* Summary */
router.get("/summary",  getFinanceSummary);

router.get("/export/expenses",verifyAdminJWT, requireAdminRole, exportExpensesCSV);

/* Staff */
router.post("/staff", createStaff);   // create staff
router.get("/staff", getAllStaff);  

/*Charts*/
router.get("/charts", financeCharts);



// router.post("/refresh-token", refreshAccessToken);

// ===== Private Admin =====
// router.post("/logout", verifyAdminJWT, requireAdminRole, logoutAdmin);
// router.post("/change-password", verifyAdminJWT, requireAdminRole, changeAdminPassword);
// router.get("/me", verifyAdminJWT, requireAdminRole, getCurrentAdmin);

export default router;
