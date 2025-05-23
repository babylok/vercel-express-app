import mongoose from 'mongoose';

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
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['economy', 'comfort', 'luxury'],
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
  route: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  }],
}, {
  timestamps: true,
});

// Create 2dsphere index for location queries
tripSchema.index({ pickupLocation: '2dsphere' });
tripSchema.index({ dropoffLocation: '2dsphere' });

const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
