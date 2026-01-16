// src/server.js
import dotenv from "dotenv";
import { app } from "./src/app.js";
import connectDB from "./src/db/index.js";

dotenv.config({ path: "./.env" });

// PORT config
const PORT = process.env.PORT || 3003;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ MongoDB connected!");

    // Trust proxy (for secure cookies + HTTPS)
    //app.set("trust proxy", 1);

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log("🚀 Server is running!");
      console.log(`➡️  API Base: http://localhost:${PORT}/api`);
      console.log(`➡️  Frontend: http://localhost:${PORT}/`);
      console.log(`🌐 MODE: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("\n🛑 Shutting down server ...");
      server.close(() => {
        console.log("✅ HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    console.error("❌ Server failed to start:", err.message);
    process.exit(1);
  }
}

startServer();
