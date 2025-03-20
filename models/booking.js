// import mongoose from 'mongoose';


// const bookingSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   name: { type: String, required: true },
//   phone: { type: String, required: true },
//   date: { type: String, required: true },
//   time: { type: String, required: true },
//   petName: { type: String, required: true },
//   petType: { type: String, required: true },
//   petAge: String,
//   service: { type: String, required: true },
//   notes: String,
//   createdAt: { type: Date, default: Date.now },
 
// });

// export default mongoose.model('Booking', bookingSchema);

import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  veterinarianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Veterinarian', required: true }, // Reference to Veterinarian
  name: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  petName: { type: String, required: true },
  petType: { type: String, required: true },
  petAge: String,
  service: { type: String, required: true },
  notes: String,
  status: { 
    type: String, 
    default: 'Pending', 
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'] 
  }, // Appointment status
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Booking', bookingSchema);