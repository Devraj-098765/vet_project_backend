import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs"; // Ensure 'uploads' directory exists

// ✅ Corrected import paths
import routerHome from "../routes/home.js";
import userRouter from "../routes/users.js";
import authRouter from "../routes/auth.js";
import adminAuthRouter from "../routes/adminAuth.js";
import { vetRouter } from "../routes/vetRoutes.js"; // ✅ FIXED import
import seedAdmin from "../scripts/seedAdmin.js";

const app = express();
app.use(express.json());

// ✅ Ensure 'uploads' directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ✅ Allow static files (Uploaded images)
app.use("/uploads", express.static(uploadsDir));

app.use(
  cors({
    exposedHeaders: ["x-auth-token"],
  })
);

// ✅ Check JWT Private Key
if (!process.env.JWT_PRIVATE_KEY) {
  console.error("❌ FATAL ERROR: JWT_PRIVATE_KEY is not defined");
  process.exit(1);
}

// Define routes
app.use("/", routerHome);
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminAuthRouter);
app.use("/api/veterinarians", vetRouter);

// ✅ Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/VetCareDB";
const port = process.env.PORT || 3001;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // ✅ Ensure admin seeding runs only after DB connection
    await seedAdmin();
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Exit if DB connection fails
  }
};

// Start server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
});
