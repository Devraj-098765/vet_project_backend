import express from "express";
import multer from "multer";
import { Veterinarian } from "../models/Veterinarian.js";

const vetRouter = express.Router();

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// @route   POST /api/veterinarians
// @desc    Add new veterinarian
vetRouter.post("/", upload.single("photo"), async (req, res) => {
  try {
    const { name, email, phone, specialization, experience, fee, bio } = req.body;

    if (!name || !email || !phone || !specialization || !experience || !fee || !bio) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingVet = await Veterinarian.findOne({ email });
    if (existingVet) {
      return res.status(400).json({ message: "Veterinarian already exists" });
    }

    const newVeterinarian = new Veterinarian({
      name,
      email,
      phone,
      specialization,
      experience,
      fee,
      bio,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    });

    await newVeterinarian.save();
    res.status(201).json({ message: "Veterinarian added successfully", veterinarian: newVeterinarian });
  } catch (error) {
    console.error("❌ Error adding veterinarian:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/veterinarians
// @desc    Get all veterinarians
vetRouter.get("/", async (req, res) => {
  try {
    const veterinarians = await Veterinarian.find();
    res.json(veterinarians);
  } catch (error) {
    console.error("❌ Error fetching veterinarians:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export { vetRouter };
