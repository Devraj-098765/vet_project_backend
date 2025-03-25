
import express from 'express';
import Booking from '../models/booking.js';
import auth from '../middleware/auth.js';
import { Veterinarian } from '../models/Veterinarian.js';

const router = express.Router();

// Fetch appointments for a specific veterinarian
router.get('/veterinarian', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ veterinarianId: req.user._id })
      .populate('userId', 'name email')
      .sort({ date: 1, time: 1 });
      console.log(bookings)
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching veterinarian appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments', details: error.message });
  }
});
// Get user's appointment history
router.get('/history', auth, async (req, res) => {
  try {
    console.log("Authenticated User ID: ", req.user._id);
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('veterinarianId', 'name image')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch appointment history", details: error.message });
  }
});


// Get available time slots for a veterinarian on a specific date
router.get('/available-slots', async (req, res) => {
  try {
    const { veterinarianId, date } = req.query;
    
    if (!veterinarianId || !date) {
      return res.status(400).json({ error: 'Veterinarian ID and date are required' });
    }

    const bookings = await Booking.find({ 
      veterinarianId, 
      date,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    const allTimeSlots = [
      "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
      "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM"
    ];

    const bookedSlots = bookings.map(booking => booking.time);
    const availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

    res.json({ availableSlots });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots', details: error.message });
  }
});

// Create a new booking
router.post('/', auth, async (req, res) => {
  try {
    const { veterinarianId, date, time } = req.body;

    const existingBooking = await Booking.findOne({
      veterinarianId,
      date,
      time,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    if (existingBooking) {
      return res.status(400).json({ error: 'This time slot is already booked' });
    }

    const booking = new Booking({
      ...req.body,
      userId: req.user._id,
      veterinarianId,
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

// Cancel an appointment (user)
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

// Get all bookings for admin (with optional today filter)
router.get('/admin/bookings', auth, async (req, res) => {
  try {
    // Uncomment this if you want to restrict to admins only
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Access denied: Admins only' });
    // }

    const today = req.query.today === 'true'; // Check for ?today=true query param
    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    let query = {};
    if (today) {
      query.date = todayDate; // Filter by today's date
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email')
      .populate('veterinarianId', 'name image')
      .sort({ createdAt: -1 });

    // Filter out bookings with invalid userId or veterinarianId
    const validBookings = bookings.filter(booking => {
      if (!booking.userId) {
        console.warn(`Booking ${booking._id} has invalid userId: ${booking.userId}`);
        return false;
      }
      if (!booking.veterinarianId) {
        console.warn(`Booking ${booking._id} has invalid veterinarianId: ${booking.veterinarianId}`);
        return false;
      }
      return true;
    });

    const vetBookings = await Promise.all(
      (await Veterinarian.find()).map(async (vet) => {
        const appointments = validBookings.filter(
          (booking) => booking.veterinarianId._id.toString() === vet._id.toString()
        );
        return {
          veterinarian: vet,
          appointments,
          totalAppointments: appointments.length,
        };
      })
    );

    res.json(vetBookings.filter((vet) => vet.appointments.length > 0));
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
});

// Cancel an appointment as admin
router.delete('/admin/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Appointment canceled successfully by admin' });
  } catch (error) {
    console.error('Error canceling appointment as admin:', error);
    res.status(500).json({ error: 'Failed to cancel appointment', details: error.message });
  }
});

// Update appointment status (e.g., mark as completed or cancelled by vet)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.veterinarianId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }

    booking.status = status;
    await booking.save();

    res.json({ message: `Appointment marked as ${status}`, booking });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Failed to update appointment status', details: error.message });
  }
});

export default router;