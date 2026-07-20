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

// import { getCsrfToken } from "../controllers/admin.controller.js";
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
import {
  unblockSlot,
  blockSlot,
  emergencyResetSlots,
  getAdminSlotsByDate,
} from "../controllers/admin.slots.controller.js";

import {
  uploadMedia,
  getGallery,
  deleteMedia,
} from "../controllers/gallery.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import {
  adminGetBookingByDate,
  adminManualBookingCreate,
} from "../controllers/admin.booking.controller.js";
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
// import { csrfSynchronisedProtection } from "../config/csrf.js";
const adminRouter = Router();

adminRouter.post("/login", loginAdmin);
// adminRouter.get("/csrf", verifyAdminJWT, requireAdminRole, getCsrfToken);

adminRouter.get(
  "/bookings",
  verifyAdminJWT,
  requireAdminRole,
  adminListBookings
);
adminRouter.get(
  "/bookings/:id",
  verifyAdminJWT,
  requireAdminRole,
  adminGetBookingDetails
);
adminRouter.get(
  "/bookings/search",
  verifyAdminJWT,
  requireAdminRole,
  searchBookingsById
);
adminRouter.post(
  "/bookings/:id/cancel",
  verifyAdminJWT,
  requireAdminRole,
  // csrfSynchronisedProtection,
  adminCancelBooking
);
adminRouter.post(
  "/bookings/:id/complete",
  verifyAdminJWT,
  requireAdminRole,
  // csrfSynchronisedProtection,
  adminCompleteBooking
);
adminRouter.post(
  "/bookings/:id/manual-payment",
  verifyAdminJWT,
  requireAdminRole,
  // csrfSynchronisedProtection,
  adminManualPayment
);
adminRouter.get(
  "/V2/bookings",
  verifyAdminJWT,
  requireAdminRole,
  adminGetBookingByDate
);
adminRouter.post(
  "/V2/bookings/create",
  verifyAdminJWT,
  requireAdminRole,
  // csrfSynchronisedProtection,
  adminManualBookingCreate
);

// ===== Public (initial only) =====
// adminRouter.post("/register", registerAdmin);
// adminRouter.post("/login", loginAdmin);
adminRouter.get(
  "/dashboard/summary",
  verifyAdminJWT,
  requireAdminRole,
  getDashboardSummary
);
adminRouter.get(
  "/dashboard/bookings",
  verifyAdminJWT,
  requireAdminRole,
  getDashboardBookingLedger
);

adminRouter.get("/slots", getAdminSlotsByDate);
adminRouter.post("/slots/block", verifyAdminJWT, requireAdminRole, blockSlot);
adminRouter.delete(
  "/slots/unblock",
  verifyAdminJWT,
  requireAdminRole,
  unblockSlot
);
adminRouter.get(
  "/slots/emergency-reset",
  verifyAdminJWT,
  requireAdminRole,
  emergencyResetSlots
);

adminRouter.get("/gallery", getGallery);
adminRouter.post(
  "/gallery",
  verifyAdminJWT,
  requireAdminRole,
  upload.single("file"),
  uploadMedia
);
adminRouter.delete(
  "/gallery/:id",
  verifyAdminJWT,
  requireAdminRole,
  deleteMedia
);

/* Expenses */
adminRouter.post("/expenses", verifyAdminJWT, requireAdminRole, addExpense);
adminRouter.get("/expenses", verifyAdminJWT, requireAdminRole, getExpenses);
adminRouter.delete(
  "/expenses/:id",
  verifyAdminJWT,
  requireAdminRole,
  // csrfSynchronisedProtection,
  deleteExpense
);

/* Salaries */
adminRouter.post(
  "/salaries",
  verifyAdminJWT,
  requireAdminRole,
  // csrfSynchronisedProtection,
  addSalary
);
adminRouter.get(
  "/salaries",
  verifyAdminJWT,
  requireAdminRole,
  getPreviousMonthSalaries
);
adminRouter.get(
  "/salaries/summary",
  verifyAdminJWT,
  requireAdminRole,
  salarySummary
);

/* Summary */
adminRouter.get("/summary", getFinanceSummary);

adminRouter.get(
  "/export/expenses",
  verifyAdminJWT,
  requireAdminRole,
  exportExpensesCSV
);

/* Staff */
adminRouter.post(
  "/staff",
  // csrfSynchronisedProtection,
  createStaff
); // create staff
adminRouter.get("/staff", getAllStaff);

/*Charts*/
adminRouter.get("/charts", financeCharts);

// router.post("/refresh-token", refreshAccessToken);

// ===== Private Admin =====
// router.post("/logout", verifyAdminJWT, requireAdminRole, logoutAdmin);
// router.post("/change-password", verifyAdminJWT, requireAdminRole, changeAdminPassword);
// adminRouter.get("/me", verifyAdminJWT, requireAdminRole, getCurrentAdmin);

export default adminRouter;
