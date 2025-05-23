import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'HKD',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'cash', 'wallet'],
    required: true,
  },
  paymentDetails: {
    cardNumber: String,
    expiryDate: String,
    cardType: String,
    walletId: String,
  },
  transactionId: {
    type: String,
    unique: true,
  },
  stripePaymentIntent: {
    id: String,
    clientSecret: String,
    status: String,
  },
}, {
  timestamps: true,
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
