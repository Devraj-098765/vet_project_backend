// // export { vetRouter };
// import express from "express";
// import multer from "multer";
// import bcrypt from "bcrypt";
// import { Veterinarian } from "../models/Veterinarian.js";
// const vetRouter = express.Router();

// // Multer Configuration for File Uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
// });

// const upload = multer({ storage });

// // POST route to add a new veterinarian (with image)
// vetRouter.post("/", upload.single("image"), async (req, res) => {
//   try {
//     // Debug: Log all incoming request body and file
//     console.log("Request body:", req.body);
//     console.log("Request file:", req.file);

//     const {
//       name,
//       email,
//       phone,
//       specialization,
//       experience,
//       fee,
//       bio,
//       password,
//       location,
//     } = req.body;

//     // Check if all required fields are provided
//     if (
//       !name ||
//       !email ||
//       !phone ||
//       !specialization ||
//       !experience ||
//       !fee ||
//       !bio ||
//       !password ||
//       !location
//     ) {
//       return res
//         .status(400)
//         .json({ message: "All fields are required, including password and location" });
//     }

//     // Check if veterinarian already exists
//     const existingVet = await Veterinarian.findOne({ email });
//     if (existingVet) {
//       return res.status(400).json({ message: "Veterinarian already exists" });
//     }

//     // Hash the password before storing
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create a new veterinarian object
//     const newVeterinarian = new Veterinarian({
//       name,
//       email,
//       phone,
//       specialization,
//       experience,
//       fee,
//       bio,
//       password: hashedPassword,
//       image: req.file ? `/uploads/${req.file.filename}` : null,
//       location,
//     });

//     // Debug: Log the veterinarian object before saving
//     console.log("New veterinarian object:", newVeterinarian);

//     // Save veterinarian to database
//     await newVeterinarian.save();

//     // Debug: Log the saved veterinarian
//     console.log("Saved veterinarian:", newVeterinarian);

//     res
//       .status(201)
//       .json({ message: "Veterinarian added successfully", veterinarian: newVeterinarian });
//   } catch (error) {
//     console.error("Error adding veterinarian:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// // GET route to fetch all veterinarians
// vetRouter.get("/", async (req, res) => {
//   try {
//     const veterinarians = await Veterinarian.find();
//     // Debug: Log fetched veterinarians
//     console.log("Fetched veterinarians:", veterinarians);
//     res.json(veterinarians);
//   } catch (error) {
//     console.error("Error fetching veterinarians:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// export { vetRouter };
import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import { Veterinarian } from "../models/Veterinarian.js";
import sendEmail from "../utils/sendmail.js";

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
    // Debug: Log all incoming request body and file
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

    // Check if all required fields are provided
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

    // Check if veterinarian already exists
    const existingVet = await Veterinarian.findOne({ email });
    if (existingVet) {
      return res.status(400).json({ message: "Veterinarian already exists" });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new veterinarian object
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

    // Debug: Log the veterinarian object before saving
    console.log("New veterinarian object:", newVeterinarian);

    // Save veterinarian to database
    await newVeterinarian.save();

    // Debug: Log the saved veterinarian
    console.log("Saved veterinarian:", newVeterinarian);

    // Send email with login credentials
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

    // Optional: HTML version of the email for better formatting
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
    console.error("Error adding veterinarian:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET route to fetch all veterinarians
vetRouter.get("/", async (req, res) => {
  try {
    const veterinarians = await Veterinarian.find();
    // Debug: Log fetched veterinarians
    console.log("Fetched veterinarians:", veterinarians);
    res.json(veterinarians);
  } catch (error) {
    console.error("Error fetching veterinarians:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export { vetRouter };