// 地图配置常量
export const MAP_CONFIG = {
  // Mapbox Token
  ACCESS_TOKEN: 'pk.eyJ1Ijoid2VpbGlibyIsImEiOiJjbTVmNnkyMjY1amtuMmpzZGZkOGkxNmY2In0.5GY9-OLAxBPtAfMKzbBDoA',
  
  // 默认地图样式
  DEFAULT_STYLE: 'mapbox://styles/mapbox/streets-v12',
  
  // 北京坐标
  BEIJING_CENTER: [116.4074, 39.9042],
  
  // 默认缩放级别
  DEFAULT_ZOOM: 10,
  
  // 最小/最大缩放级别
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
  
  // 地图容器ID
  CONTAINER_ID: 'map-container'
}

// 地图控件配置
export const MAP_CONTROLS = {
  navigation: {
    showCompass: true,
    showZoom: true,
    visualizePitch: true
  },
  scale: {
    maxWidth: 80,
    unit: 'metric'
  }
}

// 地图图层配置
export const MAP_LAYERS = {
  POINTS: 'points-layer',
  LINES: 'lines-layer',
  POLYGONS: 'polygons-layer'
}