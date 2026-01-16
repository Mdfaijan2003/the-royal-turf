import "dotenv/config";
import express from "express";
import path from "path";
import cron from "node-cron";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { dirname } from "path";

import slotsRouter from "./routes/slots.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import healthRoutes from "./routes/healthcheck.routes.js";
import webHookrouter from "./routes/webhook.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import contactRouter from "./routes/contact.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import galleryRoutes from "./routes/gallery.routes.js";

import {
  verifyAdminJWT,
  requireAdminRole,
} from "./middleware/auth.middleware.js";

import SlotLock from "./models/slotlock.js";
import Booking from "./models/booking.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

/* ===============================
   SECURITY
================================ */
app.set("trust proxy", 1);
// Helmet for all routes EXCEPT booking/payment
const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Razorpay needs this
  crossOriginEmbedderPolicy: false,
});

app.use((req, res, next) => {
  // 👇 EXACT URL seen by Express
  if (req.path === "/booking.html") {
    return next(); // 🚫 helmet skipped ONLY here
  }

  helmetMiddleware(req, res, next);
});

app.use(compression());

// Remove your manual CSP middleware and use:
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      // Default
      "default-src 'self'",

      // Scripts
      "script-src 'self' https://checkout.razorpay.com https://cdnjs.cloudflare.com",

      // Styles & Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",

      // Images
      "img-src 'self' data: https:",

      // Network / API calls
      "connect-src 'self' https://cdnjs.cloudflare.com https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com",

      // ✅ IFAMES (FIXED)
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com https://www.google.com/maps https://maps.google.com",

      // Hardening
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ")
  );
  next();
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/webhook", express.raw({ type: "application/json" }), webHookrouter);

app.use("/api/admin", adminRoutes);
app.use("/api/admin/bookings", verifyAdminJWT, requireAdminRole, bookingRouter);
app.use("/api/v1/healthcheck", healthRoutes);
app.use("/api/slots", slotsRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/contact", contactRouter);
app.use("/api/payments", paymentRoutes);

// Protected Gallery Upload (Admin Only)
app.use("/api/gallery", verifyAdminJWT, requireAdminRole, galleryRoutes);

app.use(express.static(path.join(process.cwd(), "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

cron.schedule("* * * * *", async () => {
  try {
    console.log("Running cleanup for expired holds...");
    const now = new Date();

    const deleted = await SlotLock.deleteMany({ expiresAt: { $lte: now } });
    const result = await Booking.updateMany(
      { status: "HELD", holdExpiresAt: { $lte: now } },
      { status: "CANCELLED" }
    );

    console.log(`SlotLocks deleted: ${deleted.deletedCount}`);
    console.log(`Bookings cancelled: ${result.modifiedCount}`);
  } catch (err) {
    console.error("Error during cron cleanup:", err);
  }
});

export { app };
