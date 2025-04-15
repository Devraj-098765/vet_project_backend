import express from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';
import Booking from '../models/booking.js';
import Notification from '../models/notification.js';
import auth from '../middleware/auth.js';
import { Veterinarian } from '../models/Veterinarian.js';
import Report from '../models/Report.js';

const router = express.Router();

// Store scheduled jobs (in-memory for now, can be moved to DB for better persistence)
const scheduledJobs = new Map();

// Fetch appointments for a specific veterinarian
router.get('/veterinarian', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ veterinarianId: req.user._id })
      .populate('userId', 'name email')
      .sort({ date: 1, time: 1 });

    const total = bookings.length;
    const upcoming = bookings.filter(appt => {
      const appointmentDate = new Date(`${appt.date} ${appt.time}`);
      return appointmentDate > new Date() && ['Pending', 'Confirmed'].includes(appt.status);
    }).length;
    const pending = bookings.filter(appt => appt.status === 'Pending').length;

    res.json({ bookings, stats: { total, upcoming, pending } });
  } catch (error) {
    console.error('Error fetching veterinarian appointments:', error.stack);
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
    console.error("Error fetching history:", error.stack);
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
    let availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

    // Restrict past time slots if the date is today
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      const currentTime = new Date();
      availableSlots = availableSlots.filter(slot => {
        const slotTime = new Date(`${date} ${slot}`);
        return slotTime > currentTime;
      });
    }

    res.json({ availableSlots });
  } catch (error) {
    console.error('Error fetching available slots:', error.stack);
    res.status(500).json({ error: 'Failed to fetch available slots', details: error.message });
  }
});

// Create a new booking and schedule reminder
router.post('/', auth, async (req, res) => {
  try {
    const { veterinarianId, date, time } = req.body;

    console.log('Creating booking with:', { veterinarianId, date, time, userId: req.user._id });

    // Validate that the booking time is in the future
    const appointmentDateTime = new Date(`${date} ${time}`);
    const currentTime = new Date();
    if (appointmentDateTime <= currentTime) {
      return res.status(400).json({ error: 'Cannot book past or current time slots' });
    }

    const existingBooking = await Booking.findOne({
      veterinarianId,
      date,
      time,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    if (existingBooking) {
      console.log('Slot already booked:', existingBooking);
      return res.status(400).json({ error: 'This time slot is already booked' });
    }

    const booking = new Booking({
      ...req.body,
      userId: req.user._id,
      veterinarianId,
    });
    await booking.save();
    console.log('Booking saved:', booking._id);

    const reminderDateTime = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000);
    const cronTime = `${reminderDateTime.getSeconds()} ${reminderDateTime.getMinutes()} ${reminderDateTime.getHours()} ${reminderDateTime.getDate()} ${reminderDateTime.getMonth() + 1} *`;

    console.log('Scheduling cron job:', { cronTime, reminderDateTime: reminderDateTime.toISOString() });

    const job = cron.schedule(cronTime, async () => {
      try {
        const vet = await Veterinarian.findById(veterinarianId);
        if (!vet) throw new Error('Veterinarian not found');
        const notification = new Notification({
          userId: req.user._id,
          bookingId: booking._id,
          message: `Reminder: Your appointment with Dr. ${vet.name} is in 30 minutes on ${date} at ${time}.`,
          time: appointmentDateTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' }),
        });
        await notification.save();
        console.log(`Notification saved for ${req.user._id} at ${new Date().toISOString()} (NPT)`);
        scheduledJobs.delete(booking._id.toString());
      } catch (err) {
        console.error('Cron job error:', err.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kathmandu" // Nepal Time (UTC+5:45)
    });

    scheduledJobs.set(booking._id.toString(), job);
    res.status(201).json({ message: 'Booking created successfully', bookingId: booking._id });
  } catch (error) {
    console.error('Error creating booking:', error.stack);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});

// Reload cron jobs on server start
const reloadCronJobs = async () => {
  try {
    const bookings = await Booking.find({
      date: { $gte: new Date().toISOString().split('T')[0] },
      status: { $in: ['Pending', 'Confirmed'] }
    });

    console.log(`Found ${bookings.length} bookings to reschedule`);

    for (const booking of bookings) {
      const { date, time, userId, veterinarianId, _id } = booking;
      const appointmentDateTime = new Date(`${date} ${time}`);
      const reminderDateTime = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000);
      const now = new Date();

      if (reminderDateTime > now) {
        const cronTime = `${reminderDateTime.getSeconds()} ${reminderDateTime.getMinutes()} ${reminderDateTime.getHours()} ${reminderDateTime.getDate()} ${reminderDateTime.getMonth() + 1} *`;
        console.log('Rescheduling cron job for booking:', _id, cronTime);

        const job = cron.schedule(cronTime, async () => {
          try {
            const vet = await Veterinarian.findById(veterinarianId);
            if (!vet) throw new Error('Veterinarian not found');
            const notification = new Notification({
              userId,
              bookingId: _id,
              message: `Reminder: Your appointment with Dr. ${vet.name} is in 30 minutes on ${date} at ${time}.`,
              time: appointmentDateTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' }),
            });
            await notification.save();
            console.log(`Notification saved for ${userId} at ${new Date().toISOString()} (NPT)`);
            scheduledJobs.delete(_id.toString());
          } catch (err) {
            console.error('Cron job error:', err.message);
          }
        }, {
          scheduled: true,
          timezone: "Asia/Kathmandu"
        });

        scheduledJobs.set(_id.toString(), job);
      } else {
        console.log(`Skipping past booking: ${_id}, reminder time: ${reminderDateTime.toISOString()}`);
      }
    }
  } catch (error) {
    console.error('Error reloading cron jobs:', error.stack);
  }
};

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
    // Stop the scheduled job if it exists
    const job = scheduledJobs.get(booking._id.toString());
    if (job) {
      job.stop();
      scheduledJobs.delete(booking._id.toString());
      console.log(`Stopped cron job for booking: ${booking._id}`);
    }
    res.json({ message: 'Appointment canceled successfully' });
  } catch (error) {
    console.error('Error canceling appointment:', error.stack);
    res.status(500).json({ error: 'Failed to cancel appointment', details: error.message });
  }
});

// Get all bookings for admin
router.get('/admin/bookings', auth, async (req, res) => {
  try {
    const today = req.query.today === 'true';
    const todayDate = new Date().toISOString().split('T')[0];

    let query = {};
    if (today) {
      query.date = todayDate;
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email')
      .populate('veterinarianId', 'name image')
      .sort({ createdAt: -1 });

    const validBookings = bookings.filter(booking => booking.userId && booking.veterinarianId);

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
    console.error('Error fetching admin bookings:', error.stack);
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
    // Stop the scheduled job if it exists
    const job = scheduledJobs.get(booking._id.toString());
    if (job) {
      job.stop();
      scheduledJobs.delete(booking._id.toString());
      console.log(`Stopped cron job for booking: ${booking._id}`);
    }
    res.json({ message: 'Appointment canceled successfully by admin' });
  } catch (error) {
    console.error('Error canceling appointment as admin:', error.stack);
    res.status(500).json({ error: 'Failed to cancel appointment', details: error.message });
  }
});

// Update appointment status
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

    // If status changes to something other than Pending/Confirmed, stop the cron job
    if (!['Pending', 'Confirmed'].includes(status)) {
      const job = scheduledJobs.get(booking._id.toString());
      if (job) {
        job.stop();
        scheduledJobs.delete(booking._id.toString());
        console.log(`Stopped cron job for booking: ${booking._id} due to status change to ${status}`);
      }
    }

    res.json({ message: `Appointment marked as ${status}`, booking });
  } catch (error) {
    console.error('Error updating appointment status:', error.stack);
    res.status(500).json({ error: 'Failed to update appointment status', details: error.message });
  }
});

// Create a report for a booking (Veterinarian only)
router.post('/:id/report', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.veterinarianId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to create report for this booking' });
    }
    const reportData = {
      bookingId: booking._id,
      userId: booking.userId,
      veterinarianId: booking.veterinarianId,
      petName: booking.petName,
      petType: booking.petType,
      ...req.body
    };
    const report = new Report(reportData);
    await report.save();
    console.log('Report created:', report);

    // Create a notification for the user
    const vet = await Veterinarian.findById(booking.veterinarianId);
    const notification = new Notification({
      userId: booking.userId,
      bookingId: booking._id,
      message: `A new report has been submitted for your pet ${booking.petName} by Dr. ${vet.name}.`,
      time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' }), // Nepal Time
    });
    await notification.save();
    console.log(`Notification created for user ${booking.userId} about new report at ${new Date().toISOString()} (NPT)`);

    res.status(201).json({ message: 'Report created successfully', report });
  } catch (error) {
    console.error('Error creating report:', error.stack);
    res.status(500).json({ error: 'Failed to create report', details: error.message });
  }
});

// Get all reports for a user
router.get('/reports', auth, async (req, res) => {
  try {
    console.log('Request received for /bookings/reports');
    if (!req.user || !req.user._id) {
      console.log('No user ID in request');
      return res.status(401).json({ error: 'Authentication failed: No user ID' });
    }
    console.log('Authenticated user:', req.user);
    console.log('Fetching reports for userId:', req.user._id);
    console.log('Report model available:', typeof Report !== 'undefined');

    const dbState = mongoose.connection.readyState;
    console.log('MongoDB connection state:', dbState);

    const reports = await Report.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    console.log('Raw reports:', reports);

    if (reports.length > 0) {
      try {
        const populatedReports = await Report.populate(reports, { 
          path: 'veterinarianId', 
          select: 'name' 
        });
        console.log('Populated reports:', populatedReports);
        res.json(populatedReports);
      } catch (popError) {
        console.warn('Population failed:', popError.message);
        res.json(reports);
      }
    } else {
      console.log('No reports found for this user');
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching reports:', error.stack);
    res.status(500).json({ error: 'Failed to fetch reports', details: error.message });
  }
});

// Fetch notifications for a user
router.get('/notifications', auth, async (req, res) => {
  console.log('--- Starting /notifications endpoint ---');
  try {
    console.log('Authenticated user:', req.user);
    console.log('User ID:', req.user._id);
    console.log('MongoDB connection state:', mongoose.connection.readyState);

    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB is not connected');
    }

    console.log('Checking Notification model availability:', typeof Notification !== 'undefined' ? 'Available' : 'Not Available');
    console.log('Querying Notification collection for userId:', req.user._id);

    const notifications = await Notification.find({ userId: req.user._id })
      .populate('bookingId', 'date time veterinarianId')
      .sort({ createdAt: -1 });

    console.log('Notifications retrieved:', notifications.length);
    console.log('Notifications data:', JSON.stringify(notifications, null, 2));
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id || 'Unknown',
      mongoState: mongoose.connection.readyState,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
  console.log('--- Finished /notifications endpoint ---');
});

// Get a specific booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Fetching booking with ID:', req.params.id);
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('veterinarianId', 'name');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.userId._id.toString() !== req.user._id.toString() && 
        booking.veterinarianId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error.stack);
    res.status(500).json({ error: 'Failed to fetch booking', details: error.message });
  }
});

// Get a specific report by ID
router.get('/report/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('veterinarianId', 'name');
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (report.userId.toString() !== req.user._id.toString() && 
        report.veterinarianId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view this report' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error.stack);
    res.status(500).json({ error: 'Failed to fetch report', details: error.message });
  }
});

// Edit a report (Veterinarian only)
router.put('/report/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (report.veterinarianId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this report' });
    }
    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    console.log('Report updated:', updatedReport);

    // Fetch the associated booking to get the pet name
    const booking = await Booking.findById(report.bookingId);
    if (!booking) {
      console.warn('Associated booking not found for report:', report._id);
    }

    // Create a notification for the user
    const vet = await Veterinarian.findById(report.veterinarianId);
    const notification = new Notification({
      userId: report.userId,
      bookingId: report.bookingId,
      message: `The report for your pet ${booking ? booking.petName : 'Unknown Pet'} has been updated by Dr. ${vet.name}.`,
      time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' }), // Nepal Time
    });
    await notification.save();
    console.log(`Notification created for user ${report.userId} about updated report at ${new Date().toISOString()} (NPT)`);

    res.json({ message: 'Report updated successfully', report: updatedReport });
  } catch (error) {
    console.error('Error updating report:', error.stack);
    res.status(500).json({ error: 'Failed to update report', details: error.message });
  }
});

// Get all reports for the authenticated veterinarian
router.get('/veterinarian/reports', auth, async (req, res) => {
  try {
    const reports = await Report.find({ veterinarianId: req.user._id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching veterinarian reports:', error.stack);
    res.status(500).json({ error: 'Failed to fetch veterinarian reports', details: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error.stack);
    res.status(500).json({ error: 'Failed to mark notification as read', details: error.message });
  }
});

export default router;
export { reloadCronJobs };