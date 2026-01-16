// scripts/seed-admin.js

import dotenv from "dotenv";
import connectDB from "../src/db/index.js";
import { Admin } from "../src/models/Admin.model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });

    if (existing) {
      console.log("❌ Admin already exists. Aborting seed.");
      process.exit(0);
    }

    const admin = await Admin.create({
      name: "Royal Admin",
      email: process.env.ADMIN_EMAIL || "admin@turf.com",
      phone: process.env.ADMIN_PHONE || "7000000000",
      password: process.env.ADMIN_PASSWORD || "admin123",
      role: "admin",
    });

    console.log("✅ Admin created successfully!");
    console.log("➡  Email:", admin.email);
    console.log("➡  Password:", process.env.ADMIN_PASSWORD || "admin123");

    process.exit(0);

  } catch (err) {
    console.error("❌ Seed Failed:", err.message);
    process.exit(1);
  }
};

seedAdmin();
