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
    const { origin, destination, tunnels = [], directions } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }
    //console.log(tunnels);
    // Google Maps Directions API URL
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json`;

    //   // 隧道位置資料庫（實際應用中應該從資料庫讀取）
    const tunnelInLocations = {
      'Cross-Harbour Tunnel': { lat: 22.301162636814208, lng: 114.18028630249306 },
      'Eastern Harbour Crossing': { lat: 22.300052536011478, lng: 114.23179656434493 },
      'Western Harbour Tunnel': { lat: 22.301270550494003, lng: 114.15659585627296 },
      'Lion Rock Tunnel': { lat: 22.356380042585677, lng: 114.1728945956766 },
      'Eagle\'s Nest Tunnel': { lat: 22.358214274705354, lng: 114.1624489621155 },
      'Tate\'s Cairn Tunnel': { lat: 22.376441813882437, lng: 114.212668451033 },
      'Shing Mun Tunnels': { lat: 22.376660838389007, lng: 114.15012626582094 },
      'Tai Lam Tunnel': { lat: 22.408766874108686, lng: 114.0596500085339 },
      'Aberdeen Tunnel': { lat: 22.270665263955298, lng: 114.18058799436515 },
      'Discovery Bay Tunnel': { lat: 22.30942372434448, lng: 113.99149188473565 },
      'Tuen Mun Road': { lat: 22.36395646934013, lng: 114.04114440018556 },
      'Tai Po Road': { lat: 22.343586442144545, lng: 114.15609939911347 }
    };
    const tunnelOutLocations = {
      'Cross-Harbour Tunnel': { lat: 22.30112929664223, lng: 114.1804588938343 },
      'Eastern Harbour Crossing': { lat: 22.299833214725467, lng: 114.23188433796419 },
      'Western Harbour Tunnel': { lat: 22.301145953857507, lng: 114.15673952460672 },
      'Lion Rock Tunnel': { lat: 22.356876162319057, lng: 114.17319500308034 },
      'Eagle\'s Nest Tunnel': { lat: 22.357989758919107, lng: 114.16285862947493 },
      'Tate\'s Cairn Tunnel': { lat: 22.37654102367537, lng: 114.21293667192917 },
      'Shing Mun Tunnels': { lat: 22.376244157142192, lng: 114.15023355417942 },
      'Tai Lam Tunnel': { lat: 22.40870014945362, lng: 114.06011012235369 },
      'Aberdeen Tunnel': { lat: 22.270605692905047, lng: 114.1803519599765 },
      'Discovery Bay Tunnel': { lat: 22.30942372434448, lng: 113.99149188473565 },
      'Tuen Mun Road': { lat: 22.36428094590369, lng: 114.04122733243706 },
      'Tai Po Road': { lat: 22.34365319802457, lng: 114.15620315026892 }
    };
    const tunnelFees = {
      'Cross-Harbour Tunnel': 50,
      'Eastern Harbour Crossing': 50,
      'Western Harbour Tunnel': 50,
      'Lion Rock Tunnel': 8,
      'Eagle\'s Nest Tunnel': 8,
      'Tate\'s Cairn Tunnel': 24,
      'Shing Mun Tunnels': 5,
      'Tai Lam Tunnel': 43,
      'Aberdeen Tunnel': 5,
      'Discovery Bay Tunnel': 120,
      'Tuen Mun Road': 0,
      'Tai Po Road': 0
    }


    let passesThroughPoint = [];
    let tunnelFeeSum = 0;
    // 你需要在.env中添加GOOGLE_MAPS_API_KEY
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    // const waypoints = tunnels.map(tunnel => ({
    //   location: tunnelLocations[tunnel.name],
    //   stopover: false
    // })).join('|');
    let waypoints = tunnels.map(tunnel => ({
      location: `${tunnelInLocations[tunnel.name].lat},${tunnelInLocations[tunnel.name].lng}`,
      stopover: false
    }));
    if (directions === 'in') {
      waypoints = tunnels.map(tunnel => ({
        location: `${tunnelInLocations[tunnel.name].lat},${tunnelInLocations[tunnel.name].lng}`,
        stopover: false
      }));
    } else if (directions === 'out') {
      waypoints = tunnels.map(tunnel => ({
        location: `${tunnelOutLocations[tunnel.name].lat},${tunnelOutLocations[tunnel.name].lng}`,
        stopover: false
      }));
    }


    // 將 `waypoints` 轉換為字符串
    const waypointsString = waypoints.map(w => w.location).join('|');

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

    //console.log(routes);
    //check tunnel pass through
    route.legs.forEach(leg => {
      leg.steps.forEach(step => {
        const stepPoints = step.polyline.points; // 獲取步驟的多邊形點
        // 解析 polyline 點
        const decodedPoints = decodePolyline(stepPoints);

        for (let key in tunnelOutLocations) {
          // 檢查特定點是否在步驟的多邊形內
          if (isPointOnRoute(decodedPoints, tunnelOutLocations[key])) {
            if (!passesThroughPoint.includes(key)) {
              passesThroughPoint.push(key);
              tunnelFeeSum += tunnelFees[key];
            }
          }
        }

        for (let key in tunnelInLocations) {
          // 檢查特定點是否在步驟的多邊形內
          if (isPointOnRoute(decodedPoints, tunnelInLocations[key])) {
            if (!passesThroughPoint.includes(key)) {
              passesThroughPoint.push(key);
              tunnelFeeSum += tunnelFees[key];
            }


          }
        }

      });
    });
    // if (passesThroughPoint.length > 0) {
    //   console.log(passesThroughPoint);
    //   console.log(tunnelFeeSum);
    // } else {
    //   console.log('路線不經過隧道。');
    // }

    // 路徑點（用於繪製路線）
    const path = route.overview_polyline.points;

    // 距離和時間
    //let distance = route.legs[0].distance.text;
    // let duration = route.legs[0].duration.text;
    let distance = 0;
    let duration = 0;
    let steps = ''
    route.legs.forEach(leg => {
      distance+=Number(leg.distance.value);
      duration+=Number(leg.duration.value);
      steps+=leg.steps;
    })

    // 路線步驟（詳細路徑說明）
    // const steps = route.legs[0].steps;

    return res.status(200).json({
      distance,
      duration,
      path,
      steps,
      totalDistance: distance,
      totalDuration: duration,
      tunnel: passesThroughPoint,
      tunnelFeeSum: tunnelFeeSum
    });
  } catch (error) {
    console.error('Error calculating route:', error);
    return res.status(500).json({ message: 'Error calculating route', error: error.message });
  }
});


function decodePolyline(encoded) {
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result >> 1) ^ -(result & 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result >> 1) ^ -(result & 1));
    lng += dlng;

    points.push({ lat: lat / 1E5, lng: lng / 1E5 });
  }
  return points;
}

// 輔助函數：檢查點是否在路線內（簡化示例，實際應使用更有效的算法）
function isPointOnRoute(routePoints, point) {
  // 簡單的距離檢查
  for (const routePoint of routePoints) {
    const distance = Math.sqrt(Math.pow(routePoint.lat - point.lat, 2) + Math.pow(routePoint.lng - point.lng, 2));
    if (distance < 0.0002) { // 調整距離閾值根據需求
      return true;
    }
  }
  return false;
}
export default router;

