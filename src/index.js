import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs";

// Import Routes
import routerHome from "../routes/home.js";
import userRouter from "../routes/users.js";
import signupRouter from "../routes/signup.js";
import authRouter from "../routes/auth.js";
import adminAuthRouter from "../routes/adminAuth.js";
import { vetRouter } from "../routes/vetRoutes.js";
import bookingRouter, { reloadCronJobs } from "../routes/bookings.js";
import blogRouter from "../routes/blogs.js"; // Add this line
import seedAdmin from "../scripts/seedAdmin.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Ensure Uploads Directory Exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📂 'uploads' directory created.");
}
app.use("/uploads", express.static(uploadsDir));

// CORS Configuration
app.use(
  cors({
    origin: "*", // Change to specific origin in production (e.g., "http://localhost:5173")
    exposedHeaders: ["x-auth-token"],
  })
);

// Environment Variable Checks
if (!process.env.JWT_PRIVATE_KEY) {
  console.error("FATAL ERROR: JWT_PRIVATE_KEY is not defined!");
  process.exit(1);
}

// Define API Routes
app.use("/", routerHome);
app.use("/api/users", userRouter);
app.use("/api/signup", signupRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminAuthRouter);
app.use("/api/veterinarians", vetRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/blogs", blogRouter); // Add this line

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/VetCareDB";
const port = process.env.PORT || 3001;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
    });
    console.log("✅ Connected to MongoDB");

    // Seed Admin User
    try {
      await seedAdmin();
      console.log("Admin user seeding completed.");
    } catch (err) {
      console.error("Error seeding admin user:", err);
    }

    // Reload Cron Jobs for Notifications
    try {
      await reloadCronJobs();
      console.log("Cron jobs initialized");
    } catch (err) {
      console.error("Error reloading cron jobs:", err);
    }
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
};

// Global Error Handlers
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

// Start Server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
});