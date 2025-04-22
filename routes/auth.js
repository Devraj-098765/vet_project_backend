import express from "express";
import { User } from "../models/user.js";
import _ from "lodash";
import bcrypt from "bcrypt";
import { z } from "zod";
import jwt from "jsonwebtoken";
import nodeMailer from "nodemailer";

import dotenv from "dotenv";
dotenv.config();

const authRouter = express.Router();

const transporter = nodeMailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

authRouter.post("/", async (req, res) => {
  try {
    const { error } = validate(req.body);
    if (error) {
      return res.status(400).json({ errors: error.errors });
    }

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = user.generateAuthToken();
    console.log("Generated Token:", token);

    res.header('x-auth-token', token).send(_.pick(user, ["_id", "email"]));
  } catch (error) {
    console.error("Error in authentication:", error.stack);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
});

authRouter.post("/forgot-password", async (req, res)  => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" }); 
  }

  const token = user.generateAuthToken();

  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset",
    text: `Click the link to reset your password: http://localhost:5173/reset-password/${token}`,
  }, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ message: "Error sending email" });
    }
    res.status(200).json({ message: "Password reset email sent" });
  });
}) 

authRouter.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);

    // Optionally, check if the user exists
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(404).send("Invalid token or user does not exist.");
    }

    // If the token is valid, redirect to the frontend reset password page
    res.status(200).json({ valid: true });
  } catch (err) {
    console.error("Error validating token:", err);
    res.status(400).send("Invalid or expired token.");
  }
});

// when the gmail link is sent reset password
authRouter.post("/reset-password", async(req, res) => {
  const { password } = req.body;
  const token = req.header("x-auth-token");

  if (!token) return res.status(401).send("Access denied. No token provided.");

  const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
  const user = await User.findById(decoded._id);

  if (!user) return res.status(400).send("Invalid token.");

  if (!password) return res.status(400).send("Password is required.");
  
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);

  await user.save();

  res.send("Password reset successfully.");
})

const validate = (user) => {
  const schema = z.object({
    email: z.string().email({ message: "Invalid email format" }).min(5, { message: "Email is required" }).max(255),
    password: z.string().min(5, { message: "Password is required" }).max(255),
  });

  return schema.safeParse(user);
};

export default authRouter;