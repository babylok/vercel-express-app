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
import testingRoutes from './routes/testing.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join_trip', (tripId) => {
    socket.join(`trip_${tripId}`);
  });

  socket.on('update_location', (data) => {
    io.to(`trip_${data.tripId}`).emit('driver_location', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/testing', testingRoutes); 

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
