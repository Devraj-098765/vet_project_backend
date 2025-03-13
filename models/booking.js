import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  petName: { type: String, required: true },
  petType: { type: String, required: true },
  petAge: String,
  service: { type: String, required: true },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Booking', bookingSchema);