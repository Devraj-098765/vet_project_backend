
import express from 'express';
import Booking from '../models/booking.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get user's appointment history
router.get('/history', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('veterinarianId', 'name image') // Populate name and image
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch appointment history', details: error.message });
  }
});

// Create a new booking
router.post('/', auth, async (req, res) => {
  try {
    const booking = new Booking({
      ...req.body,
      userId: req.user._id,
      veterinarianId: req.body.veterinarianId,
    });
    await booking.save();
    res.status(201).json({ 
      message: 'Booking created successfully',
      bookingId: booking._id 
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});

// Cancel an appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not authorized' });
    }
    res.json({ message: 'Appointment canceled successfully' });
  } catch (error) {
    console.error('Error canceling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment', details: error.message });
  }
});

export default router;