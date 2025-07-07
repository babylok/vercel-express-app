import mongoose from 'mongoose';
//import { io } from '../server.js';

const tripSchema = new mongoose.Schema({
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    address: String,
  },
  dropoffLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    address: String,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'in_progress','arrived', 'completed', 'cancelled'],
    default: 'pending',
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['Standard', 'Premium', 'SUV', 'Electric'],
  },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },
  seletedTunnel:{
    type:Array
  },
  seletedOption:{
    type:Array
  },
  estimatedPrice: {
    type: Number,
    required: true,
  },
  actualPrice: {
    type: Number,
  },
  estimatedDuration: {
    type: Number,
    required: true,
  },
  actualDuration: {
    type: Number,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  review: String,
  routePath:{
    type: String,
  },
}, {
  timestamps: true,
});

// Create 2dsphere index for location queries
tripSchema.index({ pickupLocation: '2dsphere' });
tripSchema.index({ dropoffLocation: '2dsphere' });



const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
