import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import { Veterinarian } from "../models/Veterinarian.js";
import sendEmail from "../utils/sendmail.js";
import auth from "../middleware/auth.js";
import mongoose from "mongoose";

const vetRouter = express.Router();

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// POST route to add a new veterinarian (with image)
vetRouter.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    const {
      name,
      email,
      phone,
      specialization,
      experience,
      fee,
      bio,
      password,
      location,
    } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !specialization ||
      !experience ||
      !fee ||
      !bio ||
      !password ||
      !location
    ) {
      return res
        .status(400)
        .json({ message: "All fields are required, including password and location" });
    }

    const existingVet = await Veterinarian.findOne({ email });
    if (existingVet) {
      return res.status(400).json({ message: "Veterinarian already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newVeterinarian = new Veterinarian({
      name,
      email,
      phone,
      specialization,
      experience,
      fee,
      bio,
      password: hashedPassword,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      location,
    });

    console.log("New veterinarian object:", newVeterinarian);
    await newVeterinarian.save();
    console.log("Saved veterinarian:", newVeterinarian);

    const emailSubject = "Your VetCare System Login Credentials";
    const emailText = `
      Dear ${name},

      Your veterinarian account has been created successfully. Below are your login credentials:

      Email: ${email}
      Password: ${password}

      Please keep this information secure and do not share it with others. You can log in to the VetCare System at [Your Login URL].

      Best regards,
      VetCare System Team
    `;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #6B46C1;">Welcome to VetCare System!</h2>
        <p>Dear ${name},</p>
        <p>Your veterinarian account has been created successfully. Below are your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Please keep this information secure and do not share it with others.</p>
        <p>You can log in to the VetCare System <a href="[Your Login URL]" style="color: #6B46C1;">here</a>.</p>
        <p style="margin-top: 20px;">Best regards,<br />VetCare System Team</p>
      </div>
    `;

    try {
      await sendEmail(email, emailSubject, emailText, emailHtml);
    } catch (emailError) {
      console.error("Email sending failed, but veterinarian was created:", emailError);
      return res.status(201).json({
        message:
          "Veterinarian added successfully, but failed to send credentials email",
        veterinarian: newVeterinarian,
      });
    }

    res
      .status(201)
      .json({ message: "Veterinarian added successfully", veterinarian: newVeterinarian });
  } catch (error) {
    console.error("Error adding veterinarian:", { message: error.message, stack: error.stack });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET route to fetch all active veterinarians
vetRouter.get("/", async (req, res) => {
  try {
    console.log("Fetching veterinarians");
    
    // Check if admin role is requesting (for future role-based filtering)
    // For now, always return all veterinarians including inactive ones
    const veterinarians = await Veterinarian.find();
    
    // Ensure status field exists for all veterinarians (for backward compatibility)
    const processedVets = veterinarians.map(vet => {
      const vetObj = vet.toObject();
      
      // If there's no status field but isActive exists, set status based on isActive
      if (vetObj.status === undefined && vetObj.isActive !== undefined) {
        vetObj.status = vetObj.isActive ? 'active' : 'inactive';
      }
      // If there's no isActive field but status exists, set isActive based on status
      else if (vetObj.isActive === undefined && vetObj.status !== undefined) {
        vetObj.isActive = vetObj.status === 'active';
      }
      
      return vetObj;
    });
    
    console.log("Fetched veterinarians:", processedVets.length);
    res.json(processedVets);
  } catch (error) {
    console.error("Error fetching veterinarians:", { message: error.message, stack: error.stack });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET route to fetch the authenticated veterinarian's profile
vetRouter.get("/me", auth, async (req, res) => {
  try {
    console.log("Fetching profile for user:", req.user);

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error("MongoDB not connected:", mongoose.connection.readyState);
      return res.status(500).json({ message: "Database connection error" });
    }

    // Validate user ID
    if (!req.user?._id) {
      console.error("No user ID found in request");
      return res.status(401).json({ message: "Unauthorized: No user ID provided" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      console.error("Invalid ObjectId:", req.user._id);
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const veterinarian = await Veterinarian.findById(req.user._id);
    console.log("Database query result:", veterinarian);

    if (!veterinarian) {
      console.error("Veterinarian not found for ID:", req.user._id);
      return res.status(404).json({ message: "Veterinarian not found" });
    }

    console.log("Fetched veterinarian profile:", veterinarian);
    res.json(veterinarian);
  } catch (error) {
    console.error("Error fetching veterinarian profile:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET route to fetch a specific veterinarian by ID
vetRouter.get("/:id", async (req, res) => {
  try {
    console.log("Fetching veterinarian by ID:", req.params.id);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error("Invalid ObjectId:", req.params.id);
      return res.status(400).json({ message: "Invalid veterinarian ID format" });
    }

    const veterinarian = await Veterinarian.findById(req.params.id);
    if (!veterinarian) {
      console.error("Veterinarian not found for ID:", req.params.id);
      return res.status(404).json({ message: "Veterinarian not found" });
    }
    console.log("Fetched veterinarian:", veterinarian);
    res.json(veterinarian);
  } catch (error) {
    console.error("Error fetching veterinarian:", { message: error.message, stack: error.stack });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT route to update a veterinarian profile
vetRouter.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    console.log("Update request for ID:", req.params.id);
    console.log("Update request body:", req.body);
    console.log("Update request file:", req.file);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error("Invalid ObjectId:", req.params.id);
      return res.status(400).json({ message: "Invalid veterinarian ID format" });
    }

    const veterinarian = await Veterinarian.findById(req.params.id);
    if (!veterinarian) {
      console.error("Veterinarian not found for ID:", req.params.id);
      return res.status(404).json({ message: "Veterinarian not found" });
    }

    if (veterinarian._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      console.error("Unauthorized update attempt:", { userId: req.user._id, vetId: req.params.id });
      return res.status(403).json({ message: "Not authorized to update this profile" });
    }

    const updatableFields = ["name", "phone", "specialization", "experience", "bio", "fee", "location", "isActive"];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        veterinarian[field] = req.body[field];
      }
    });

    if (req.file) {
      veterinarian.image = `/uploads/${req.file.filename}`;
    }

    await veterinarian.save();
    console.log("Updated veterinarian:", veterinarian);

    res.json(veterinarian);
  } catch (error) {
    console.error("Error updating veterinarian:", { message: error.message, stack: error.stack });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT route to change veterinarian password
vetRouter.put("/:id/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error("Invalid ObjectId:", req.params.id);
      return res.status(400).json({ message: "Invalid veterinarian ID format" });
    }

    const veterinarian = await Veterinarian.findById(req.params.id);
    if (!veterinarian) {
      console.error("Veterinarian not found for ID:", req.params.id);
      return res.status(404).json({ message: "Veterinarian not found" });
    }

    if (veterinarian._id.toString() !== req.user._id.toString()) {
      console.error("Unauthorized password change attempt:", { userId: req.user._id, vetId: req.params.id });
      return res.status(403).json({ message: "Not authorized to change this password" });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, veterinarian.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    veterinarian.password = hashedPassword;
    await veterinarian.save();
    console.log("Password updated for veterinarian:", veterinarian._id);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", { message: error.message, stack: error.stack });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PATCH route to update veterinarian status
vetRouter.patch("/:id/status", async (req, res) => {
  try {
    console.log("Status update request for ID:", req.params.id);
    console.log("Status update request body:", req.body);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error("Invalid ObjectId:", req.params.id);
      return res.status(400).json({ message: "Invalid veterinarian ID format" });
    }

    const veterinarian = await Veterinarian.findById(req.params.id);
    if (!veterinarian) {
      console.error("Veterinarian not found for ID:", req.params.id);
      return res.status(404).json({ message: "Veterinarian not found" });
    }

    const { status } = req.body;
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: "Valid status required (active or inactive)" });
    }

    // Save the previous status to check if it changed
    const previousStatus = veterinarian.status;
    
    veterinarian.status = status;
    // Maintain backward compatibility with isActive
    veterinarian.isActive = status === 'active';
    
    await veterinarian.save();
    console.log("Updated veterinarian status to:", status);

    // Send email notification when account status changes
    try {
      // Account deactivation email
      if (status === 'inactive' && previousStatus === 'active') {
        const emailSubject = 'Your VetCare Account Has Been Temporarily Blocked';
        const emailText = `Dear ${veterinarian.name},
        
Your account has been temporarily blocked by the admin. Please contact the VetCare administrator as soon as possible for further details.

Best regards,
VetCare System Team`;

        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #6B46C1;">VetCare Account Status Update</h2>
          <p>Dear ${veterinarian.name},</p>
          <p>Your account has been temporarily blocked by the admin.</p>
          <p>Please contact the VetCare administrator as soon as possible for further details.</p>
          <p style="margin-top: 20px;">Best regards,<br />VetCare System Team</p>
        </div>
        `;

        await sendEmail(veterinarian.email, emailSubject, emailText, emailHtml);
        console.log(`Deactivation notification email sent to ${veterinarian.email}`);
      } 
      // Account reactivation email
      else if (status === 'active' && previousStatus === 'inactive') {
        const emailSubject = 'Your VetCare Account Has Been Reactivated';
        const emailText = `Dear ${veterinarian.name},
        
Your account has been reactivated. You can now log in to the VetCare system with your existing credentials.

Best regards,
VetCare System Team`;

        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #6B46C1;">VetCare Account Reactivated</h2>
          <p>Dear ${veterinarian.name},</p>
          <p>Good news! Your account has been reactivated.</p>
          <p>You can now log in to the VetCare system with your existing credentials.</p>
          <p style="margin-top: 20px;">Best regards,<br />VetCare System Team</p>
        </div>
        `;

        await sendEmail(veterinarian.email, emailSubject, emailText, emailHtml);
        console.log(`Reactivation notification email sent to ${veterinarian.email}`);
      }
    } catch (emailError) {
      console.error("Failed to send status change email:", emailError);
      // Continue with the response even if email fails
    }

    res.json({ message: "Status updated successfully", veterinarian });
  } catch (error) {
    console.error("Error updating veterinarian status:", { message: error.message, stack: error.stack });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export { vetRouter };