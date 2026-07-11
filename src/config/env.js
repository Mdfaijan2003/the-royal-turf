import { cleanEnv, str, port, email, makeValidator } from "envalid";

/* ===========================
   Custom Validators
=========================== */

// JWT Expiration (15m, 1h, 7d, etc.)
const jwtExpiry = makeValidator(value => {
  if (!/^\d+[smhd]$/.test(value)) {
    throw new Error("JWT expiration must be like 15m, 1h, 7d, etc.");
  }

  return value;
});

// WhatsApp Number
const whatsapp = makeValidator(value => {
  if (!/^\d{10,15}$/.test(value)) {
    throw new Error("Invalid WhatsApp number");
  }

  return value;
});

// Cloudinary Cloud Name
const cloudinaryName = makeValidator(value => {
  if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
    throw new Error("Invalid Cloudinary cloud name");
  }

  return value;
});

/* ===========================
   Environment Validation
=========================== */

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production"],
    default: "development",
  }),

  PORT: port({
    default: 3000,
  }),

  /* ---------- Database ---------- */

  MONGODB_URI: str(),

  /* ---------- JWT ---------- */

  ACCESS_TOKEN_SECRET: str(),

  ACCESS_TOKEN_EXPIRATION: jwtExpiry(),

  REFRESH_TOKEN_SECRET: str(),

  REFRESH_TOKEN_EXPIRATION: jwtExpiry(),

  /* ---------- Admin ---------- */

  ADMIN_EMAIL: email(),

  ADMIN_PHONE: str(),

  /* ---------- Razorpay ---------- */

  RAZORPAY_KEY_ID: str(),

  RAZORPAY_KEY_SECRET: str(),

  RAZORPAY_WEBHOOK_SECRET: str(),

  /* ---------- Cloudinary ---------- */

  CLOUDINARY_CLOUD_NAME: cloudinaryName(),

  CLOUDINARY_API_KEY: str(),

  CLOUDINARY_API_SECRET: str(),

  /* ---------- Email ---------- */

  CONTACT_EMAIL: email(),

  SMTP_USER: email(),

  /* ---------- Team Emails ---------- */

  ZAID_EMAIL: email(),

  ISHTIYAQUE_EMAIL: email(),

  FAIJAN_EMAIL: email(),

  /* ---------- Developer ---------- */

  // DEVELOPER_WHATSAPP: whatsapp(),

  /* ---------- APIs ---------- */

  RESEND_API_KEY: str(),
});

/* ===========================
   Production Security Checks
=========================== */

if (env.isProduction) {
  if (env.ACCESS_TOKEN_SECRET.length < 32) {
    throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters long.");
  }

  if (env.REFRESH_TOKEN_SECRET.length < 32) {
    throw new Error(
      "REFRESH_TOKEN_SECRET must be at least 32 characters long."
    );
  }

  if (env.ADMIN_PASSWORD.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
  }
}
