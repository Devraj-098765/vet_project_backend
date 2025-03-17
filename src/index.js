import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs";

import routerHome from "../routes/home.js";
import userRouter from "../routes/users.js";
import signupRouter from "../routes/signup.js";
import authRouter from "../routes/auth.js";
import adminAuthRouter from "../routes/adminAuth.js";
import { vetRouter } from "../routes/vetRoutes.js";
import bookingRouter from "../routes/bookings.js";
import seedAdmin from "../scripts/seedAdmin.js";

const app = express();
app.use(express.json());

// ✅ Ensure Uploads Directory Exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true }); // Ensure recursive creation
  console.log("📂 Created 'uploads' directory.");
}

app.use("/uploads", express.static(uploadsDir));

// ✅ CORS Configuration
app.use(
  cors({
    exposedHeaders: ["x-auth-token"],
  })
);

// ✅ Check JWT Private Key
if (!process.env.JWT_PRIVATE_KEY) {
  console.error("FATAL ERROR: JWT_PRIVATE_KEY is not defined");
  process.exit(1);
}

// ✅ Define API Routes
app.use("/", routerHome);
app.use("/api/users", userRouter);
app.use("/api/signup", signupRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminAuthRouter);
app.use("/api/veterinarians", vetRouter);
app.use("/api/bookings", bookingRouter);

// ✅ MongoDB Connection
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/VetCareDB";
const port = process.env.PORT || 3001;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true, // Ensures indexes are created automatically
    });
    console.log(" Connected to MongoDB");

    // ✅ Seed Admin (Wrap in Try-Catch)
    try {
      await seedAdmin();
      console.log("Admin seeding completed.");
    } catch (err) {
      console.error(" Error seeding admin:", err);
    }
  } catch (err) {
    console.error(" MongoDB Connection Error:", err);
    process.exit(1); // Exit if DB connection fails
  }
};

// ✅ Global Error Handlers (Prevent Crashes)
process.on("unhandledRejection", (err) => {
  console.error(" UNHANDLED REJECTION:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

// ✅ Start Server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(` Server running on http://localhost:${port}`);
  });
});