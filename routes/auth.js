import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, userType } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !phone || !userType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate user type
    if (!['passenger', 'driver'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      role: userType
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Authentication error:', error);
    
    // 如果是驗證錯誤，返回 400 狀態碼
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: error.errors 
      });
    }
    
    // 如果是用戶不存在或密碼不匹配，返回 401
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ 
        message: 'Invalid email or password'
      });
    }
    
    // 其他錯誤返回 500 狀態碼
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email,password)
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Authentication error:', error);
    
    // 如果是驗證錯誤，返回 400 狀態碼
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: error.errors 
      });
    }
    
    // 如果是用戶不存在或密碼不匹配，返回 401
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ 
        message: 'Invalid email or password'
      });
    }
    
    // 其他錯誤返回 500 狀態碼
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

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
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
