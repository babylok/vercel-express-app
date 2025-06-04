import express from 'express';
import axios from 'axios';
const router = express.Router();


router.post('/', async (req, res) => {
  console.log('here')
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }

    // Google Maps Directions API URL
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json`;
    
    // 你需要在.env中添加GOOGLE_MAPS_API_KEY
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    const response = await axios.get(directionsUrl, {
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: apiKey,
        mode: 'driving',
        language: 'zh-TW'
      }
    });

    const { routes } = response.data;
    
    if (routes.length === 0) {
      return res.status(404).json({ message: 'No route found' });
    }

    // 取第一條路線的詳細信息
    const route = routes[0];
    
    // 路徑點（用於繪製路線）
    const path = route.overview_polyline.points;
    
    // 距離和時間
    const distance = route.legs[0].distance.text;
    const duration = route.legs[0].duration.text;

    // 路線步驟（詳細路徑說明）
    const steps = route.legs[0].steps;

    return res.status(200).json({
      distance,
      duration,
      path,
      steps,
      totalDistance: route.legs[0].distance.value,
      totalDuration: route.legs[0].duration.value
    });
  } catch (error) {
    console.error('Error calculating route:', error);
    return res.status(500).json({ message: 'Error calculating route', error: error.message });
  }
});

export default router;

