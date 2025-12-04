// 地图工具函数
export const mapUtils = {
  /**
   * 更新辉光效果开关
   * @param {Array} items - 需要更新的项目数组
   * @param {string} uniformName - uniform名称
   * @param {boolean} isEnabled - 是否启用
   */
  updateGlowEffect(items, uniformName, isEnabled) {
    const glowValue = isEnabled ? 1.0 : 0.0;
    items.forEach(item => {
      if (item.material && item.material.uniforms && item.material.uniforms[uniformName]) {
        item.material.uniforms[uniformName].value = glowValue;
      }
    });
  },

  /**
   * 切换项目可见性
   * @param {Array} items - 需要更新的项目数组
   * @param {boolean} isVisible - 是否可见
   */
  toggleVisibility(items, isVisible) {
    items.forEach(item => {
      item.visible = isVisible;
    });
  },

  /**
   * 根据数据值获取对应的颜色
   * @param {number} value - 数据值
   * @param {Array} colorRanges - 颜色范围配置
   * @returns {number} 颜色值
   */
  getColorByValue(value, colorRanges) {
    for (let i = 0; i < colorRanges.length; i++) {
      const range = colorRanges[i];
      if (value >= range.min && value < range.max) {
        return range.color;
      }
    }
    return colorRanges[colorRanges.length - 1].color;
  },

  /**
   * 格式化数据值为显示文本
   * @param {number} value - 数据值
   * @returns {string} 格式化后的文本
   */
  formatDataValue(value) {
    if (value >= 10000) {
      return (value / 10000).toFixed(0) + '万';
    }
    return value.toString();
  },

  /**
   * 清理几何体资源
   * @param {Array} items - 需要清理的项目数组
   */
  disposeGeometries(items) {
    items.forEach(item => {
      if (item.geometry) {
        item.geometry.dispose();
      }
    });
  }
};