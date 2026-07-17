import "dotenv/config";
import "./config/env.js";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import { ZodError } from "zod";

import {
  apiLimiter,
  holdSlotLimiter,
  adminLoginLimiter,
  paymentLimiter,
} from "./middleware/rateLimit.middleware.js";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

/* =====================================================
   SECURITY
===================================================== */

const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

app.use((req, res, next) => {
  if (req.path === "/booking") {
    return next();
  }

  helmetMiddleware(req, res, next);
});

app.use(compression());

app.use("/api", apiLimiter);

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",

      "script-src 'self' https://checkout.razorpay.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",

      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",

      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",

      "img-src 'self' data: https:",

      "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com https://cdnjs.cloudflare.com",

      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com https://maps.google.com",

      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ")
  );

  next();
});

const allowedOrigins = [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(
  Boolean
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

app.use(hpp());

/* =====================================================
   WEBHOOK
===================================================== */

app.use(
  "/webhook",
  express.raw({
    type: "application/json",
  }),
  webHookrouter
);

/* =====================================================
   API ROUTES
===================================================== */

app.use("/api/admin", adminRoutes);

app.use("/api/admin/bookings", verifyAdminJWT, requireAdminRole, bookingRouter);

app.use("/api/admin/finance", verifyAdminJWT, requireAdminRole, adminRoutes);

app.use("/api/v1/healthcheck", healthRoutes);

app.use("/api/slots", holdSlotLimiter, slotsRouter);

app.use("/api/bookings", bookingRouter);

app.use("/api/contact", contactRouter);

app.use("/api/payments", paymentLimiter, paymentRoutes);

app.use("/api/gallery", galleryRoutes);

/* =====================================================
   STATIC FILES
===================================================== */

app.use(express.static(path.join(process.cwd(), "public")));

/* =====================================================
   PAGE ROUTES
===================================================== */

const servePage = (route, file) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", file));
  });
};

servePage("/", "index.html");

servePage("/booking", "booking.html");

servePage("/gallery", "gallery.html");

servePage("/faq", "faq.html");

servePage("/contact", "contact.html");

servePage("/features", "features.html");

servePage("/about", "about.html");

app.get("/booking-confirmation/:token", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "booking-confirmation.html"));
});

/* ==========================
   ADMIN PAGES
========================== */

app.get("/admin/login", adminLoginLimiter, (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "admin", "login.html"));
});

/* =====================================================
   API 404
===================================================== */

app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/* =====================================================
   WEBSITE 404
===================================================== */

app.use((req, res) => {
  res.status(404).sendFile(path.join(process.cwd(), "public", "404.html"));
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.flatten(),
    });
  }

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

export { app };
