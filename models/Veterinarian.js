import mongoose from "mongoose";
import bcrypt from "bcrypt";

const veterinarianSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  specialization: { type: String, required: true },
  bio: { type: String, required: true },
  fee: { type: Number, required: true },
  experience: { type: String, required: true },
  password: { type: String, required: true},
  image: { type: String }, 
});

export const Veterinarian = mongoose.model("Veterinarian", veterinarianSchema);