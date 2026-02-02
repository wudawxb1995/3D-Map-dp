/**
 * 省份名称到代码的映射表
 * 代码对应 geometryProvince 目录下的文件名
 * 同时也对应 geometryCouties 目录下文件名的前两位
 * 例如: 北京 -> 11 -> 11.json (省市) / 110100.json (区县)
 */
export const provinceCodeMap = {
  '北京': '11',
  '天津': '12',
  '河北': '13',
  '山西': '14',
  '内蒙古': '15',
  '辽宁': '21',
  '吉林': '22',
  '黑龙江': '23',
  '上海': '31',
  '江苏': '32',
  '浙江': '33',
  '安徽': '34',
  '福建': '35',
  '江西': '36',
  '山东': '37',
  '河南': '41',
  '湖北': '42',
  '湖南': '43',
  '广东': '44',
  '广西': '45',
  '海南': '46',
  '重庆': '50',
  '四川': '51',
  '贵州': '52',
  '云南': '53',
  '西藏': '54',
  '陕西': '61',
  '甘肃': '62',
  '青海': '63',
  '宁夏': '64',
  '新疆': '65',
  '台湾': '71',
  '香港': '81',
  '澳门': '82'
};

/**
 * 代码到省份名称的反向映射
 */
export const codeToProvinceName = Object.fromEntries(
  Object.entries(provinceCodeMap).map(([k, v]) => [v, k])
);

/**
 * 获取省份代码
 * @param {string} provinceName - 省份名称
 * @returns {string|null} 省份代码，如果未找到返回null
 */
export function getProvinceCode(provinceName) {
  // 1. 精确匹配（如果传入的是简称）
  if (provinceCodeMap[provinceName]) {
    return provinceCodeMap[provinceName];
  }

  // 2. 模糊匹配：遍历映射表，检查传入的全称是否包含简称
  // 例如 "北京市" startsWith "北京"
  // "内蒙古自治区" startsWith "内蒙古"
  for (const key in provinceCodeMap) {
    if (provinceName.startsWith(key)) {
      return provinceCodeMap[key];
    }
  }

  return null;
}

/**
 * 获取省份名称
 * @param {string} code - 省份代码
 * @returns {string|null} 省份名称，如果未找到返回null
 */
export function getProvinceName(code) {
  return codeToProvinceName[code] || null;
}

/**
 * 检查是否支持区县下钻
 * 台湾、香港、澳门等特殊行政区可能缺少区县数据
 * @param {string} provinceCode - 省份代码
 * @returns {boolean} 是否支持下钻
 */
export function isSupportedForDrillDown(provinceCode) {
  // 暂时排除台湾、澳门
  const unsupportedCodes = ['71', '82'];
  return !unsupportedCodes.includes(provinceCode);
}

/**
 * 检查是否为直辖市
 * 直辖市没有市级划分，直接下钻到区县
 * @param {string} code - 省份代码
 * @returns {boolean} 是否为直辖市
 */
export function isMunicipality(code) {
  const municipalities = ['11', '12', '31', '50']; // 北京, 天津, 上海, 重庆
  return municipalities.includes(code);
}
