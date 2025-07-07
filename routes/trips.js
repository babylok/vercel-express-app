import express from 'express';
import jwt from 'jsonwebtoken';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import schedule from 'node-schedule';
import { io } from '../server.js';

const router = express.Router();

// 設置定時任務，每5分鐘檢查一次超時的行程
schedule.scheduleJob('*/5 * * * *', async () => {
  try {
    // 找到所有狀態為 pending 且更新時間超過1小時的行程
    const cutoffTime = new Date(Date.now() - 3600000); // 1小時前的 UTC 時間
    const pendingTrips = await Trip.find({
      status: 'pending',
      updatedAt: { $lt: cutoffTime }
    });

    // 更新這些行程的狀態為 cancelled
    for (const trip of pendingTrips) {
      const updateData = {
        status: 'cancelled',
        updatedAt: new Date()
      };
      await Trip.findByIdAndUpdate(trip._id, updateData, {
        new: true,
        runValidators: true
      });
      io.to(`trip_${trip._id}`).emit('trip_status_update', {
        tripId: trip._id,
        status: 'cancelled',
        updatedAt: new Date()
      });
      console.log(`Trip ${trip._id} has been cancelled due to timeout`);
    }
  } catch (error) {
    console.error('Error processing timeout trips:', error);
  }
});

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

router.get('/test', (req, res) => {
  sendMessage(`trip_68552bf856a94eee1d9371e3`,'in_trip_status_update',{ message: 'accept Trip',status:"status" });
  res.json({ message: 'Test route' });
});
// Get passenger's trip history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find trips for this passenger
    const trips = await Trip.find({ passenger: userId })
      .sort({ createdAt: -1 })
      .populate('driver', 'name avatar')
      .exec();

    // Transform trip data for frontend
    //console.log('Found trips:', trips);
    const transformedTrips = trips.map(trip => ({
      id: trip._id,
      date: trip.createdAt.toLocaleString('en-US', { 
        timeZone: 'Asia/Hong_Kong', 
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
      time: trip.createdAt.toLocaleString('en-US', { 
        timeZone: 'Asia/Hong_Kong',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      updatedAt: trip.updatedAt.toLocaleString('en-US', { 
        timeZone: 'Asia/Hong_Kong',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      pickupLocation: trip.pickupLocation.address,
      dropoffLocation: trip.dropoffLocation.address,
      fare: trip.actualPrice || trip.estimatedPrice,
      status: trip.status,
      vehicleType: trip.vehicleType,
      driver: trip.driver ? {
        name: trip.driver.name,
        avatar: trip.driver.avatar
      } : null,
      rating: trip.rating,
      review: trip.review,
      routePath: trip.routePath,
      estimatedDistance: trip.estimatedDistance,
      estimatedDuration: trip.estimatedDuration
    }));

    res.status(200).json(transformedTrips);
  } catch (error) {
    console.error('Error fetching trip history:', error);
    res.status(500).json({ message: 'Failed to fetch trip history' });
  }
});

// Create new trip
router.post('/', verifyToken, async (req, res) => {
  try {
    const tripData = req.body;
    
    // Validate required fields
    const requiredFields = ['pickupLocation', 'dropoffLocation', 'vehicleType', 'estimatedPrice', 'estimatedDuration'];
    const missingFields = requiredFields.filter(field => !tripData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Ensure pickup and dropoff locations are valid
    const requiredLocationFields = ['coordinates', 'address'];
    const pickupMissing = requiredLocationFields.filter(field => !tripData.pickupLocation[field]);
    const dropoffMissing = requiredLocationFields.filter(field => !tripData.dropoffLocation[field]);
    
    if (pickupMissing.length > 0 || dropoffMissing.length > 0) {
      return res.status(400).json({
        message: 'Pickup and dropoff locations must include coordinates and address'
      });
    }
    console.log(req.userId);
    // Create trip
    const trip = new Trip({
      passenger: req.userId,
      pickupLocation: {
        type: 'Point',
        coordinates: tripData.pickupLocation.coordinates,
        address: tripData.pickupLocation.address
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: tripData.dropoffLocation.coordinates,
        address: tripData.dropoffLocation.address
      },
      vehicleType: tripData.vehicleType,
      estimatedPrice: tripData.estimatedPrice,
      estimatedDuration: tripData.estimatedDuration,
      status: tripData.status || 'pending',
      paymentStatus: 'pending',
      routePath: tripData.routePath,  
      estimatedDistance: tripData.estimatedDistance || 0,
      seletedTunnel:tripData.seletedTunnel || [],
      seletedOption:tripData.seletedOption || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    

    try {
      //console.log('Saving trip:', trip);
      await trip.save();
      //console.log('Trip saved successfully:', trip);

      
      sendMessage(`driver_room`,'trip_status_update',{ message: 'Test event' })
      

      res.status(201).json({
        trip: {
          id: trip._id,
          ...trip.toObject(),
          _id: undefined // 移除 _id 字段，使用 id
        },
        message: 'Trip created successfully'
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

// Get avalible trips
router.get('/available', verifyToken, async (req, res) => {
  try {
    const trips = await Trip.find({
      status: 'pending',
    }).populate('passenger', 'name email phone rating')
    .populate('driver', 'name email phone');

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

function sendMessage(roomId,messageType,message){
  console.log('messageType',messageType)
  io.to(roomId).emit(messageType, message);
}
// Update trip status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    // 只有乘客和司机可以更新狀態
    if (trip.driver&&(trip.passenger.toString() !== req.userId && trip.driver.toString() !== req.userId)) {
      
      return res.status(403).json({ message: 'Unauthorized' });
    }
    console.log('req.userId')
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    // 如果是司机接受行程，自动更新司机信息
    if (status === 'accepted') {
      if (trip.passenger.toString() !== req.userId) {
        // 只有当司机接受行程时才更新司机信息
        trip.driver = req.userId;
        //await trip.save();
        //console.log('saved')
        //sendMessage(`trip_${trip._id}`,'in_trip_status_update',{ message: 'accept Trip',status:status });
       
      }
    }
    
   

    // 更新行程狀態
    trip.status = status;
    await trip.save();
    sendMessage(`trip_${trip._id}`,'in_trip_status_update',{ message: 'Trip update',status:status });
    
    
    sendMessage(`driver_room`,'trip_status_update',{ message: 'Test event' })
    
    res.json({
      message: 'Trip status updated successfully',
      trip: {
        id: trip._id,
        ...trip.toObject(),
        _id: undefined // Remove _id field, use id
      }
    });
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
