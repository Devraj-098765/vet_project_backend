import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  veterinarianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Veterinarian', required: true },
  petName: { type: String, required: true },
  petType: { type: String, required: true },
  diagnosis: { type: String, required: true },
  treatment: { type: String, required: true },
  recommendations: { type: String },
  followUpDate: { type: String },
  weight: { type: String },
  temperature: { type: String },
  vaccinations: { type: String },
  medications: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Report', reportSchema);