import mongoose from "mongoose";
import jsonwebtoken from "jsonwebtoken";

const veterinarianSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  specialization: { type: String, required: true },
  bio: { type: String, required: true },
  fee: { type: Number, required: true },
  experience: { type: String, required: true },
  password: { type: String, required: true },
  image: { type: String },
  location: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  role: {
    type: String,
    default: "veterinarian",
  },
});

// Virtual getter to ensure backward compatibility
veterinarianSchema.virtual('isActiveComputed').get(function() {
  return this.status === 'active';
});

// Virtual setter to maintain backward compatibility
veterinarianSchema.virtual('isActiveComputed').set(function(value) {
  this.status = value ? 'active' : 'inactive';
});

veterinarianSchema.methods.generateAuthToken = function () {
  const token = jsonwebtoken.sign({ _id: this._id, email: this.email, role: this.role }, process.env.JWT_PRIVATE_KEY, {
    expiresIn: "1h",
  });
  return token;
};

const Veterinarian = mongoose.model("Veterinarian", veterinarianSchema);

export { Veterinarian };
