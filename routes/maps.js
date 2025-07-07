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
    const { origin, destination, mode = 'driving', tunnels = [] } = req.body;

    // 隧道位置資料庫（實際應用中應該從資料庫讀取）
    const tunnelLocations = {
      'Cross-Harbour Tunnel': { lat: 22.3072, lng: 114.1755 },
      'Eastern Harbour Crossing': { lat: 22.2941, lng: 114.2094 },
      'Western Harbour Tunnel': { lat: 22.3130, lng: 114.1684 },
      'Lion Rock Tunnel': { lat: 22.3672, lng: 114.1704 },
      'Eagle\'s Nest Tunnel': { lat: 22.3672, lng: 114.1704 },
      'Tate\'s Cairn Tunnel': { lat: 22.4172, lng: 114.1704 },
      'Shing Mun Tunnels': { lat: 22.3972, lng: 114.1704 },
      'Tai Lam Tunnel': { lat: 22.3672, lng: 114.1704 },
      'Aberdeen Tunnel': { lat: 22.2572, lng: 114.1704 }
    };

    // 建立waypoints陣列
    const waypoints = tunnels.map(tunnel => ({
      location: tunnelLocations[tunnel.name],
      stopover: false
    }));

    const directions = await maps.directions({
      origin,
      destination,
      mode,
      key: process.env.GOOGLE_MAPS_API_KEY,
      waypoints: waypoints,
      avoid: ['tolls', 'highways', 'ferries'] // 不再避免隧道，因為我們要指定特定隧道
    });

    // 計算隧道費用
    const tunnelFees = tunnels.reduce((total, tunnel) => total + Number(tunnel.price), 0);

    // 返回路線資料和隧道費用
    res.json({
      route: directions.data,
      tunnelFees,
      selectedTunnels: tunnels
    });
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
