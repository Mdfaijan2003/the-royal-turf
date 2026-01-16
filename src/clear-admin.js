import dotenv from "dotenv";
import connectDB from "../src/db/index.js";
import { Admin } from "../src/models/Admin.model.js";

dotenv.config();

const clearAdmins = async () => {
  try {
    await connectDB();
    
    const result = await Admin.deleteMany({});
    console.log(`🗑 Deleted ${result.deletedCount} admins`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
};

clearAdmins();
