import express from "express";
import { Admin } from "../models/admin.js";
import { Veterinarian } from "../models/Veterinarian.js";
import _ from "lodash";
import bcrypt from "bcrypt";
import { z } from "zod";
import sendEmail from "../utils/sendmail.js";
import crypto from "crypto";

const adminAuthRouter = express.Router();

adminAuthRouter.post("/", async (req, res) => { 
    const { error } = validate(req.body);

    if (error) return res.status(400).json({ errors: error.errors });

    const { email, password, role } = req.body;

    let user;
    if (role === "admin") {
      user = await Admin.findOne({ email });
    } else if (role === "veterinarian") {
      user = await Veterinarian.findOne({ email: req.body.email }); 
      
      // Check if veterinarian account is active
      if (user && (user.status === "inactive" || user.isActive === false)) {
        return res.status(403).json({ message: "Your account has been deactivated. Please contact the administrator." });
      }
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }
    
    console.log(user);
    if (!user) return res.status(400).json({ message: "Invalid email or password" });


    // validats the password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Invalid email or password" });

    // generate token && send it at the header
    const token = user.generateAuthToken();
    res.header('x-auth-token', token).send(_.pick(user, ["_id", "email", "role"]));
});

// Veterinarian forgot password endpoint
adminAuthRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email, role } = req.body;

    if (role !== "veterinarian") {
      return res.status(400).json({ message: "This endpoint is only for veterinarians" });
    }

    const veterinarian = await Veterinarian.findOne({ email });
    if (!veterinarian) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Store the token and expiry time in the veterinarian document
    veterinarian.resetPasswordToken = resetToken;
    veterinarian.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await veterinarian.save();

    // Send the reset email
    const emailSubject = "VetCare Password Reset";
    const emailText = `
      Dear ${veterinarian.name},

      You requested a password reset for your VetCare account.
      
      Your password reset code is: ${resetToken}
      
      This code will expire in 1 hour.

      If you did not request this reset, please ignore this email.

      Best regards,
      VetCare System Team
    `;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #6B46C1;">VetCare Password Reset</h2>
        <p>Dear ${veterinarian.name},</p>
        <p>You requested a password reset for your VetCare account.</p>
        <p>Your password reset code is: <strong style="font-size: 18px; color: #6B46C1;">${resetToken}</strong></p>
        <p>This code will expire in 1 hour.</p>
        <p>If you did not request this reset, please ignore this email.</p>
        <p style="margin-top: 20px;">Best regards,<br />VetCare System Team</p>
      </div>
    `;

    await sendEmail(veterinarian.email, emailSubject, emailText, emailHtml);
    
    res.status(200).json({ message: "Password reset code sent to your email" });
  } catch (error) {
    console.error("Error in forgot password:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify reset token and reset password
adminAuthRouter.post("/reset-password", async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: "Email, reset token, and new password are required" });
    }

    const veterinarian = await Veterinarian.findOne({ 
      email,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!veterinarian) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the veterinarian's password and clear reset token fields
    veterinarian.password = hashedPassword;
    veterinarian.resetPasswordToken = undefined;
    veterinarian.resetPasswordExpires = undefined;
    await veterinarian.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error in reset password:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

const validate = (data) => {
  const schema = z.object({
    email: z.string().email({ message: "Invalid email format"}).min(5, { message: "email is required" }).max(255),
    password: z.string().min(5, { message: "Password is required" }).max(255),
  });

  return schema.safeParse(data);
};

export default adminAuthRouter;