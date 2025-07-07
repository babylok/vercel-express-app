import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';


import authRoutes from './routes/auth.js';
import tripRoutes from './routes/trips.js';
import paymentRoutes from './routes/payments.js';
import userRoutes from './routes/users.js';
import driverRoutes from './routes/drivers.js';

import calculateRoute from './routes/calculate-route.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// Export the io instance
export { io };


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

 

  // Handle trip room joining
  socket.on('join_trip', (data) => {
    const { tripId } = data;
    socket.join(`trip_${tripId}`);
    console.log(`Client ${socket.id} joined trip room ${tripId}`);

   
  });

  // Handle trip room leaving
  socket.on('leave_trip', (data) => {
    if (socket.tripId) {
      socket.leave(`trip_${socket.tripId}`);
      console.log(`Client ${socket.id} left trip room ${socket.tripId}`);
    }
  });

  // Handle trip status updates
  socket.on('trip_status_update', (data) => {

    io.to(`trip_${data.tripId}`).emit('trip_status_update', data);
    console.log(`Updated trip status for trip ${socket.tripId}`);

  });

  // Handle driver location updates
  socket.on('driver_location_update', (data) => {
      io.to(`trip_${data.tripId}`).emit('driver_location_update', {
        ...data,
        userId: socket.userId
      });
  });

  // Handle passenger pickup confirmation
  socket.on('pickup_confirmed', (data) => {
      io.to(`trip_${data.tripId}`).emit('pickup_confirmed', {
        ...data,
        updatedAt: new Date()
      });
  });

  

  // Handle driver room joining
  socket.on('join_driver_room', () => {
    socket.join(`driver_room`);
    console.log(socket.id,' join driver room')
  });

  // Handle driver room leaving
  socket.on('leave_driver_room', () => {
    socket.leave(`driver_room}`);
    console.log(socket.id,' leave driver room')
  });

   // 測試事件
   socket.on('test_event', () => {
    console.log('Received test event from:', socket.id);
    io.to(`driver_room`).emit('test_response', { 
      message: 'Test response from server',
      time: new Date().toISOString()
    });
  });

  // Handle location updates
  socket.on('update_location', (data) => {
    io.to(`trip_${data.tripId}`).emit('driver_location', data);
  });

  // Handle driver availability
  socket.on('driver_available', (data) => {
    io.emit('driver_status_update', {
      driverId: data.driverId,
      isAvailable: data.isAvailable
    });
  });

  // Handle non-client removal
  socket.on('dataRemove', (data) => {
    console.log(data)
    const socketToDisconnect = io.sockets.sockets.get(data);

    if (socketToDisconnect) {
      socketToDisconnect.disconnect(true); // 強制斷開
      console.log(`Disconnected client with id: ${data}`);
    } else {
      console.log(`Socket with id ${data} not found`);
    }
  })

// Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected`);

    // Get all rooms the socket was in
    const rooms = Array.from(socket.rooms);

    // Leave all rooms
    rooms.forEach(room => {
      if (room !== socket.id) { // Skip the socket's own ID
        console.log(`Client ${socket.id} leaving room ${room}`);
        socket.leave(room);
      }


    });

  });


});


app.use('/api/trips', tripRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/calculate-route', calculateRoute);
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
