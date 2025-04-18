// import express from "express";
// import multer from "multer";
// import bcrypt from "bcrypt"; // Import bcrypt for password hashing
// import { Veterinarian } from "../models/Veterinarian.js";

// const vetRouter = express.Router();

// // Multer Configuration for File Uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),  // Store images in the 'uploads/' folder
//   filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),  // Use timestamp to avoid conflicts
// });

// const upload = multer({ storage });

// // POST route to add a new veterinarian (with image)
// vetRouter.post("/", upload.single("image"), async (req, res) => {
//   try {
//     const { name, email, phone, specialization, experience, fee, bio, password } = req.body;

//     // Check if all required fields are provided
//     if (!name || !email || !phone || !specialization || !experience || !fee || !bio || !password) {
//       return res.status(400).json({ message: "All fields are required, including password" });
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
//       password: hashedPassword,  // Store hashed password
//       image: req.file ? `/uploads/${req.file.filename}` : null,  // Store image path if uploaded
//     });

//     // Save veterinarian to database
//     await newVeterinarian.save();
//     res.status(201).json({ message: "Veterinarian added successfully", veterinarian: newVeterinarian });
//   } catch (error) {
//     console.error("Error adding veterinarian:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// // GET route to fetch all veterinarians
// vetRouter.get("/", async (req, res) => {
//   try {
//     const veterinarians = await Veterinarian.find();
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

    // Save veterinarian to database
    await newVeterinarian.save();
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
    res.json(veterinarians);
  } catch (error) {
    console.error("Error fetching veterinarians:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export { vetRouter };