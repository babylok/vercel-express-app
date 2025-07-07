import express from 'express';
import axios from 'axios';

// Google Maps Directions API URL
const router = express.Router();


router.post('/', async (req, res) => {
  // try {
  //   const { origin, destination, mode = 'driving', tunnels = [] } = req.body;

  //   // 隧道位置資料庫（實際應用中應該從資料庫讀取）
  //   const tunnelLocations = {
  //     'Cross-Harbour Tunnel': { lat: 22.3072, lng: 114.1755 },
  //     'Eastern Harbour Crossing': { lat: 22.2941, lng: 114.2094 },
  //     'Western Harbour Tunnel': { lat: 22.3130, lng: 114.1684 },
  //     'Lion Rock Tunnel': { lat: 22.3672, lng: 114.1704 },
  //     'Eagle\'s Nest Tunnel': { lat: 22.3672, lng: 114.1704 },
  //     'Tate\'s Cairn Tunnel': { lat: 22.4172, lng: 114.1704 },
  //     'Shing Mun Tunnels': { lat: 22.3972, lng: 114.1704 },
  //     'Tai Lam Tunnel': { lat: 22.3672, lng: 114.1704 },
  //     'Aberdeen Tunnel': { lat: 22.2572, lng: 114.1704 }
  //   };

  //   // 建立waypoints陣列
  //   const waypoints = tunnels.map(tunnel => ({
  //     location: tunnelLocations[tunnel.name],
  //     stopover: false
  //   }));

  //   const directions = await maps.directions({
  //     origin,
  //     destination,
  //     mode,
  //     key: process.env.GOOGLE_MAPS_API_KEY,
  //     waypoints: waypoints,
  //     avoid: ['tolls', 'highways', 'ferries'] // 不再避免隧道，因為我們要指定特定隧道
  //   });

  //   // 計算隧道費用
  //   const tunnelFees = tunnels.reduce((total, tunnel) => total + Number(tunnel.price), 0);

  //   // 返回路線資料和隧道費用
  //   res.json({
  //     route: directions.data,
  //     tunnelFees,
  //     selectedTunnels: tunnels
  //   });
  // } catch (error) {
  //   res.status(500).json({ message: error.message });
  // }
  try {
    const { origin, destination, tunnels = [] } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }
    console.log(tunnels);
    // Google Maps Directions API URL
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json`;

      //   // 隧道位置資料庫（實際應用中應該從資料庫讀取）
    const tunnelLocations = {
      'Cross-Harbour Tunnel': { lat: 22.3009, lng: 114.1804 },
      'Eastern Harbour Crossing': { lat: 22.2941, lng: 114.2094 },
      'Western Harbour Tunnel': { lat: 22.3130, lng: 114.1684 },
      'Lion Rock Tunnel': { lat: 22.3672, lng: 114.1704 },
      'Eagle\'s Nest Tunnel': { lat: 22.3428, lng: 114.1438 },
      'Tate\'s Cairn Tunnel': { lat: 22.4172, lng: 114.1704 },
      'Shing Mun Tunnels': { lat: 22.3972, lng: 114.1704 },
      'Tai Lam Tunnel': { lat: 22.3672, lng: 114.1704 },
      'Aberdeen Tunnel': { lat: 22.2572, lng: 114.1704 }
    };

    // 你需要在.env中添加GOOGLE_MAPS_API_KEY
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    // const waypoints = tunnels.map(tunnel => ({
    //   location: tunnelLocations[tunnel.name],
    //   stopover: false
    // })).join('|');
    const waypoints = tunnels.map(tunnel => ({
      location: `${tunnelLocations[tunnel.name].lat},${tunnelLocations[tunnel.name].lng}`,
      stopover: false
    }));
    
    // 將 `waypoints` 轉換為字符串
    const waypointsString = waypoints.map(w => w.location).join('|');

    console.log(waypointsString);
    const response = await axios.get(directionsUrl, {
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: apiKey,
        mode: 'driving',
        waypoints: `optimize:true|${waypointsString}`,
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

