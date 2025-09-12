/**
 * 经纬度转墨卡托投影工具
 * 将地理坐标转换为平面坐标系
 */

// 墨卡托投影常量
const EARTH_RADIUS = 6378137;
const MAX_LAT = 85.0511287798;

/**
 * 将经纬度转换为墨卡托坐标
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {{x: number, y: number}} 墨卡托坐标
 */
export function lngLatToMercator(lng, lat) {
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  return {
    x: x,
    y: y * 20037508.34 / 180
  };
}

/**
 * 将GeoJSON坐标数组转换为墨卡托坐标
 * @param {Array} coordinates - GeoJSON坐标数组
 * @returns {Array} 墨卡托坐标数组
 */
export function coordinatesToMercator(coordinates) {
  if (Array.isArray(coordinates[0])) {
    return coordinates.map(coord => coordinatesToMercator(coord));
  }
  
  const [lng, lat] = coordinates;
  const mercator = lngLatToMercator(lng, lat);
  return [mercator.x, mercator.y];
}

/**
 * 计算边界框
 * @param {Array} coordinates - 坐标数组
 * @returns {{minX: number, maxX: number, minY: number, maxY: number}} 边界框
 */
export function calculateBounds(coordinates) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  function processCoords(coords) {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoords);
    } else {
      const [x, y] = coords;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  
  processCoords(coordinates);
  return { minX, maxX, minY, maxY };
}

/**
 * 标准化坐标到中心点
 * @param {Array} coordinates - 坐标数组
 * @param {{x: number, y: number}} center - 中心点
 * @returns {Array} 标准化后的坐标
 */
export function normalizeCoordinates(coordinates, center) {
  if (Array.isArray(coordinates[0])) {
    return coordinates.map(coord => normalizeCoordinates(coord, center));
  }
  
  const [x, y] = coordinates;
  return [x - center.x, y - center.y];
}