import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";

// ✅ Corrected import paths
import routerHome from "../routes/home.js";
import userRouter from "../routes/users.js";
import authRouter from "../routes/auth.js";
import adminAuthRouter from "../routes/adminAuth.js";
import vetRouter from "../routes/vetRoutes.js";
import seedAdmin from "../scripts/seedAdmin.js";

const app = express();
app.use(express.json());

// ✅ Allow static files (Uploaded images)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  cors({
    exposedHeaders: ["x-auth-token"],
  })
);

if (!process.env.JWT_PRIVATE_KEY) {
  console.error("FATAL ERROR: jwtPrivateKey is not defined");
  process.exit(1);
}

// Define routes
app.use("/", routerHome);
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminAuthRouter);
app.use("/api/veterinarians", vetRouter);

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/VetCareDB";
const port = process.env.PORT || 3001;

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    seedAdmin();
  })
  .catch((err) => console.error("❌ Error connecting to MongoDB", err));

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
