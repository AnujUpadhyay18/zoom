import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server); // Initialize socket server

// Middleware
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ extended: true, limit: "40kb" }));

// API Routes
app.use("/api/v1/users", userRoutes);

// Port and DB config
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;

// Connect DB and Start Server
const startServer = async () => {
  try {
    const connectionDb = await mongoose.connect(MONGO_URI);

    console.log(`✅ MongoDB Connected: ${connectionDb.connection.host}`);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

startServer();
