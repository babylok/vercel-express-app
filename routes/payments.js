import express from 'express';
import jwt from 'jsonwebtoken';
import { Stripe } from 'stripe';
import Payment from '../models/Payment.js';
import Trip from '../models/Trip.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

// Create payment intent
router.post('/intent', verifyToken, async (req, res) => {
  try {
    const { tripId, amount, currency } = req.body;
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'usd',
      metadata: {
        tripId,
        userId: req.userId,
      },
    });

    // Create payment record
    const payment = new Payment({
      trip: tripId,
      user: req.userId,
      amount,
      currency,
      stripePaymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      },
    });

    await payment.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update payment status
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const payment = await Payment.findOne({
        'stripePaymentIntent.id': paymentIntent.id,
      });

      if (payment) {
        payment.status = 'completed';
        payment.stripePaymentIntent.status = paymentIntent.status;
        await payment.save();

        // Update trip status
        const trip = await Trip.findById(payment.trip);
        if (trip) {
          trip.paymentStatus = 'completed';
          trip.actualPrice = payment.amount;
          await trip.save();
        }
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      const failedPayment = await Payment.findOne({
        'stripePaymentIntent.id': failedPaymentIntent.id,
      });

      if (failedPayment) {
        failedPayment.status = 'failed';
        failedPayment.stripePaymentIntent.status = failedPaymentIntent.status;
        await failedPayment.save();
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Confirm payment
router.post('/confirm', verifyToken, async (req, res) => {
  try {
    const { tripId, paymentMethodId, paymentIntentId } = req.body;
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Confirm the payment
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    // Update payment record
    const payment = await Payment.findOne({
      'stripePaymentIntent.id': paymentIntentId,
    });

    if (payment) {
      payment.status = paymentIntent.status;
      payment.stripePaymentIntent = {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      };
      await payment.save();

      // Update trip status
      trip.paymentStatus = paymentIntent.status;
      await trip.save();

      res.json({ success: true, payment });
    } else {
      res.status(404).json({ message: 'Payment record not found' });
    }
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user's payments
router.get('/', verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.userId })
      .populate('trip', 'status estimatedPrice actualPrice')
      .sort({ createdAt: -1 });

    res.json({ payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
