import express from 'express';
import { google } from 'googleapis';
import { verifyToken } from './auth.js';

const router = express.Router();

// 初始化 Google Maps API 客戶端
const maps = google.maps({
  version: 'latest',
  apiKey: process.env.GOOGLE_MAPS_API_KEY
});

// 獲取路線規劃
router.post('/directions', verifyToken, async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;

    const directions = await maps.directions({
      origin,
      destination,
      mode,
      key: process.env.GOOGLE_MAPS_API_KEY
    });

    res.json(directions.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 搜索地點
router.get('/places', verifyToken, async (req, res) => {
  try {
    const { query, location, radius = 5000 } = req.query;

    const places = await maps.places({
      query,
      location,
      radius,
      key: process.env.GOOGLE_MAPS_API_KEY
    });

    res.json(places.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 獲取地點詳細信息
router.get('/place-details', verifyToken, async (req, res) => {
  try {
    const { placeId } = req.query;

    const details = await maps.placeDetails({
      placeId,
      key: process.env.GOOGLE_MAPS_API_KEY
    });

    res.json(details.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 計算距離和時間
router.post('/distance-matrix', verifyToken, async (req, res) => {
  try {
    const { origins, destinations, mode = 'driving' } = req.body;

    const matrix = await maps.distanceMatrix({
      origins,
      destinations,
      mode,
      key: process.env.GOOGLE_MAPS_API_KEY
    });

    res.json(matrix.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
