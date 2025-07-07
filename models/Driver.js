import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  driverLicense: {
    licenseNumber: {
      type: String,
      required: true,
      unique: true
    },
    issueDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    licenseType: {
      type: String,
      enum: ['private', 'commercial', 'motorcycle'],
      default: 'private'
    },
    licenseImage: String
  },
  vehicle: {
    make: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    licensePlate: {
      type: String,
      required: true,
      unique: true
    },
    registrationExpiry: {
      type: Date,
      required: true
    },
    color: String,
    vehicleImage: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalTrips: {
    type: Number,
    default: 0
  },
  documents: [{
    type: {
      type: String,
      enum: ['insurance', 'registration', 'inspection', 'other']
    },
    url: String,
    expiryDate: Date,
    isVerified: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
driverSchema.index({ 'currentLocation': '2dsphere' });

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;
