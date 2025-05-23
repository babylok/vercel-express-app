import express from 'express';
import jwt from 'jsonwebtoken';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import geolib from 'geolib';

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create new trip
router.post('/', verifyToken, async (req, res) => {
  try {
    const tripData = req.body;
    
    // Create trip
    const trip = new Trip({
      passenger: req.userId,
      pickupLocation: tripData.pickupLocation,
      dropoffLocation: tripData.dropoffLocation,
      vehicleType: tripData.vehicleType,
      estimatedPrice: tripData.estimatedPrice,
      estimatedDuration: tripData.estimatedTime,
      status: tripData.status || 'pending',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    try {
      console.log('Saving trip:', trip);
      await trip.save();
      console.log('Trip saved successfully:', trip);

      res.status(201).json({
        trip,
        message: 'Trip created successfully',
      });
    } catch (error) {
      console.error('Error saving trip:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      const errorMessage = error.message || 'Failed to save trip';
      
      // 检查是否是验证错误
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        res.status(400).json({ 
          message: 'Validation failed',
          errors: validationErrors
        });
      } else {
        res.status(500).json({ 
          message: errorMessage,
          error: errorMessage
        });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's trips
router.get('/', verifyToken, async (req, res) => {
  try {
    const trips = await Trip.find({
      passenger: req.userId,
    }).populate('passenger', 'name email phone')
      .populate('driver', 'name email phone rating');

    res.json({ trips });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single trip
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('passenger', 'name email phone')
      .populate('driver', 'name email phone rating');

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.json({ trip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update trip status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = status;
    await trip.save();

    res.json({ trip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rate trip
router.post('/:id/rate', verifyToken, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.status !== 'completed') {
      return res.status(400).json({ message: 'Trip must be completed to rate' });
    }

    trip.rating = rating;
    trip.review = review;
    await trip.save();

    // Update driver's rating
    if (trip.driver) {
      const driver = await User.findById(trip.driver);
      if (driver) {
        const totalRatings = await Trip.find({
          driver: trip.driver,
          rating: { $exists: true },
        }).countDocuments();

        const totalRating = await Trip.aggregate([
          { $match: { driver: trip.driver, rating: { $exists: true } } },
          { $group: { _id: null, total: { $avg: '$rating' } } },
        ]);

        driver.rating = totalRating[0]?.total || 0;
        await driver.save();
      }
    }

    res.json({ trip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
