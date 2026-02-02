/**
 * 地图数据加载器
 * 负责动态加载省份和区县的GeoJSON数据
 */
class MapDataLoader {
  constructor() {
    // 缓存已加载的数据，避免重复请求
    this.cache = new Map();
    // 最大缓存数量（避免内存占用过大）
    this.maxCacheSize = 20;
  }

  /**
   * 加载省份数据 (包含该省的所有城市)
   * 对应 geometryProvince 目录下的文件
   * @param {string} provinceCode - 省份代码，如 '41' 代表河南
   * @returns {Promise<Object|null>} GeoJSON数据对象
   */
  async loadProvinceData(provinceCode) {
    const cacheKey = `province_${provinceCode}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`开始加载省份数据: ${provinceCode}.json`);
      const module = await import(
        `@/assets/jsonNew/geometryProvince/${provinceCode}.json`
      );
      const data = module.default;
      this._addToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`加载省份数据失败: ${provinceCode}`, error);
      return null;
    }
  }

  /**
   * 加载城市/区县数据
   * 对应 geometryCouties 目录下的文件
   * 命名规则通常为: cityCode + '00' (例如郑州 4101 -> 410100.json)
   * 直辖市的区县数据也在 geometryProvince 中 (如北京 11.json)，
   * 但如果需要单独加载区县详情（如有），一般直辖市不再有下一级 geometryCouties 文件
   * 
   * @param {string} areaCode - 城市代码或区域代码 (如 4101)
   * @returns {Promise<Object|null>} GeoJSON数据对象
   */
  async loadCityData(areaCode) {
    const cacheKey = `city_${areaCode}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 构造文件名：城市代码 + 00
      const fileName = `${areaCode}00`; 
      console.log(`开始加载城市数据: ${fileName}.json`);
      
      const module = await import(
        `@/assets/jsonNew/geometryCouties/${fileName}.json`
      );
      
      const data = module.default;
      this._addToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`加载城市数据失败: ${areaCode}`, error);
      return null;
    }
  }

  /**
   * 兼容旧方法：加载区县数据（实际就是加载城市数据）
   */
  async loadCountyData(code) {
    return this.loadCityData(code);
  }

  /**
   * 添加数据到缓存
   * @private
   */
  _addToCache(key, data) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, data);
  }

  clearCache() {
    this.cache.clear();
  }
}

// 导出单例
export default new MapDataLoader();
