import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

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


router.patch('/', verifyToken, async (req, res) => {
  try {
    const updates = req.body;
    

    if (updates.password) {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }


      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        settings: user.settings,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.patch('/settings', verifyToken, async (req, res) => {
  try {
    const { settings } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { settings },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      settings: user.settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.post('/payment-methods', verifyToken, async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.paymentMethods.push(paymentMethod);
    await user.save();

    res.json({
      message: 'Payment method added successfully',
      paymentMethods: user.paymentMethods,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/payment-methods', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      paymentMethods: user.paymentMethods,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
