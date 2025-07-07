import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Driver from '../models/Driver.js';
import User from '../models/User.js';

const router = express.Router();

// 驗證 Token 的中介軟體
const verifyToken = (req, res, next) => {
  //console.log("正在驗證 Token...");
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供驗證令牌' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded; 
    //console.log(req.user)
   // console.log("Token 驗證成功");
    next();
  } catch (error) {
    console.error("Token 驗證失敗:", error.message);
    return res.status(401).json({ 
      message: '無效的驗證令牌',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 檢查是否為司機角色的中介軟體
const isDriver = (req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: '僅限司機訪問' });
  }
  //console.log("nomo")
  next();
};

router.get('/profile', verifyToken,  async (req, res) => {
  //console.log('here');
  //console.log("role:",req.user.role)
  try {
    

    let driver = await Driver.findOne({ user: req.user.userId })
      .populate('user', 'name email phone profilePicture')
      .select('-__v');
    //console.log(driver);
    // If no driver profile exists, create a new one with default values
    if (!driver) {
      const tempId = Math.random().toString(36).substring(2, 8).toUpperCase();
      driver = new Driver({
        user: req.user._id,
        driverLicense: {
          licenseNumber: `TEMP-LICENSE-${tempId}`,
          issueDate: new Date(),
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
          licenseType: 'private',
          issueCountry: 'Unknown'
        },
        vehicle: {
          make: 'Unknown',
          model: 'Unknown',
          year: new Date().getFullYear(),
          licensePlate: `TEMP-${tempId}`,
          registrationExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          color: 'Unknown'
        },
        isActive: false,
        status: 'pending_verification',
        isAvailable: false
      });
      
      try {
        await driver.save();
        
        // Populate the user field after saving
        driver = await Driver.findById(driver._id)
          .populate('user', 'name email phone profilePicture')
          .select('-__v');
      } catch (saveError) {
        console.error('Error saving new driver profile:', saveError);
        return res.status(500).json({ 
          message: 'Error creating driver profile',
          error: process.env.NODE_ENV === 'development' ? saveError.message : undefined
        });
      }
    }

    res.json(driver);
  } catch (err) {
    console.error('Error in /profile:', err);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.get('/test', async (req, res) => {
  
    res.json({ message: 'Test drivers' });
})

router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // 驗證 userId 格式
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // 先查找用戶
    const user = await User.findById(userId).select('name email phone profilePicture').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 查找對應的司機資料
    const driver = await Driver.findOne({ user: userId }).lean();
    if (!driver) {
      // 如果沒有找到司機資料，返回用戶基本資料
      return res.json({
        success: true,
        data: {
          ...user,
          name: user.name,
          phone: user.phone,
          email: user.email,
          profilePicture: user.profilePicture,
          isDriver: false,
          message: 'User is not registered as a driver'
        }
      });
    }

    // 構建統一的回應格式
    const response = {
      success: true,
      data: {
        ...driver,
        // 確保這些欄位存在
        name: driver.user?.name,
        email: driver.user?.email,
        phone: driver.user?.phone,
        profilePicture: driver.user?.profilePicture,
        // 車輛資訊
        vehicleType: driver.vehicle?.model || '未知車型',
        vehiclePlateNumber: driver.vehicle?.licensePlate || '未設定',
        // 駕駛執照資訊
        licenseNumber: driver.driverLicense?.licenseNumber
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Error in /:driverId:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});



// @route   PUT /api/drivers/profile
// @desc    Update driver profile
// @access  Private (Driver)
router.put('/profile', verifyToken, async (req, res) => {
  const {
    // User fields
    name,
    email,
    phone,
    
    // Driver fields
    driverLicense,
    vehicle,
    isAvailable
  } = req.body;

  try {
    // 1. 更新用戶資料
    const userFields = {};
    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (phone) userFields.phone = phone;

    if (Object.keys(userFields).length > 0) {
      await User.findByIdAndUpdate(
        req.user.userId,  // 使用 req.user.userId 而非 req.user.id
        { $set: userFields },
        { new: true, runValidators: true }
      );
    }

    // 2. 準備司機資料更新
    const driverFields = {};
    if (driverLicense) driverFields.driverLicense = driverLicense;
    if (vehicle) driverFields.vehicle = vehicle;
    if (isAvailable !== undefined) driverFields.isAvailable = isAvailable;

    // 3. 更新或創建司機資料
    let driver = await Driver.findOne({ user: req.user.userId });

    if (driver) {
      // 更新現有司機資料
      driver = await Driver.findOneAndUpdate(
        { user: req.user.userId },  // 統一使用 req.user.userId
        { $set: driverFields },
        { new: true }  // 返回更新後的文檔
      ).populate('user', 'name email phone profilePicture');  // 填充用戶資料
    } else {
      // 創建新的司機資料
      driver = new Driver({
        user: req.user.userId,
        ...driverFields,
        isActive: false,
        status: 'pending_verification'
      });
      await driver.save();
      driver = await Driver.findById(driver._id)
        .populate('user', 'name email phone profilePicture');
    }

    // 4. 返回更新後的完整司機資料
    res.json({
      success: true,
      data: driver
    });

  } catch (err) {
    console.error('更新司機資料時出錯:', err);
    
    // 處理驗證錯誤
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: '資料驗證失敗',
        errors: err.errors 
      });
    }

    // 處理重複鍵錯誤
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '資料已存在',
        error: Object.keys(err.keyPattern)[0] + ' 已被使用'
      });
    }

    // 其他錯誤
    res.status(500).json({ 
      success: false,
      message: '伺服器錯誤',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// @route   GET /api/drivers/me
// @desc    Get current driver's profile
// @access  Private (Driver)
router.get('/me', verifyToken, async (req, res) => {
  try {
    // Check if user is a driver
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Access denied. Driver role required.' });
    }

    // Try to find the driver profile
    let driver = await Driver.findOne({ user: req.user._id })
      .populate('user', 'name email phone profilePicture')
      .select('-__v');

    // If no driver profile exists, create a new one with default values
    if (!driver) {
      const tempId = Math.random().toString(36).substring(2, 8).toUpperCase();
      driver = new Driver({
        user: req.user._id,
        driverLicense: {
          licenseNumber: `TEMP-LICENSE-${tempId}`,
          issueDate: new Date(),
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
          licenseType: 'private',
          issueCountry: 'Unknown'
        },
        vehicle: {
          make: 'Unknown',
          model: 'Unknown',
          year: new Date().getFullYear(),
          licensePlate: `TEMP-${tempId}`,
          registrationExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          color: 'Unknown'
        },
        isActive: false,
        status: 'pending_verification',
        isAvailable: false
      });
      
      try {
        await driver.save();
        
        // Populate the user field after saving
        driver = await Driver.findById(driver._id)
          .populate('user', 'name email phone profilePicture')
          .select('-__v');

        // Update user role to driver
        await User.findByIdAndUpdate(
          req.user._id,
          { $set: { role: 'driver' } },
          { new: true }
        );
      } catch (saveError) {
        console.error('Error saving new driver profile in /me:', saveError);
        return res.status(500).json({ 
          message: 'Error creating driver profile',
          error: process.env.NODE_ENV === 'development' ? saveError.message : undefined
        });
      }
    }

    res.json(driver);
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


export default router;