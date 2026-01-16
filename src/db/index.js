import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {

  mongoose.connection.on("connected", () => {
    console.log("🟢 MongoDB connected successfully");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠ MongoDB disconnected");
    // Optionally try reconnect here
    mongoose.connect(
      process.env.MONGODB_URI + "/" + DB_NAME,
      mongoose.connection.options
    );
  });

  mongoose.connection.on("error", err => {
    console.error("❌ MongoDB connection error:", err);
  });


  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,
      {
        serverSelectionTimeoutMS: 30000, // retry server selection longer
        socketTimeoutMS: 45000, // wait longer for responses
        connectTimeoutMS: 30000, // initial connection timeout
        retryWrites: true,
        retryReads: true,
      }
    );

    // console.log(
    //   `MongoDB connected successfully ! DB_HOST: ${connectionInstance.connection.host} DB_PORT: ${connectionInstance.connection.port} DB_NAME: ${DB_NAME}`
    // );
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
