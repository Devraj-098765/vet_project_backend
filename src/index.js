import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env

import express from "express";
import mongoose from "mongoose";
import routerHome from "../routes/home.js";
import userRouter from "../routes/users.js";
import authRouter from "../routes/auth.js";
import adminAuthRouter from "../routes/adminAuth.js";
import seedAdmin from "../scripts/seedAdmin.js";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(
  cors({
    exposedHeaders: ["x-auth-token"],
  })
);

console.log("your jwt private key", process.env.JWT_PRIVATE_KEY)
// Use process.env instead of config.get()
if (!process.env.JWT_PRIVATE_KEY) {
  console.error("FATAL ERROR: jwtPrivateKey is not defined");
  process.exit(1);
}

const home = routerHome;
const users = userRouter;
const auth = authRouter;
const adminAuth = adminAuthRouter;

app.use("/", home);
app.use("/api/users", users);
app.use("/api/auth", auth);
app.use("/api/admin", adminAuth);

const port = process.env.PORT || 3001;

mongoose
  .connect(`${process.env.MONGODB_URI}/Devrajkhatri`)
  .then(() => { 
    console.log("Connected to MongoDB");
    seedAdmin();
  })
  .catch((err) => console.error("Error connecting to MongoDB", err));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
