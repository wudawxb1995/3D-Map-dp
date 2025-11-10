/**
 * 中国行政区划数据整合脚本
 * 将分散的省、市、县JSON数据整合为"省-市-区/县"层级结构
 * 遵循中国真实的行政区划关系
 */

const fs = require('fs');
const path = require('path');

// 中国行政区划代码规则：
// 省级：2位（如11北京市）
// 地级：4位（如1101北京市市辖区）  
// 县级：6位（如110101东城区）

// 省级映射表（基于真实行政区划代码）
const PROVINCE_MAP = {
  '11': '北京市',
  '12': '天津市', 
  '13': '河北省',
  '14': '山西省',
  '15': '内蒙古自治区',
  '21': '辽宁省',
  '22': '吉林省',
  '23': '黑龙江省',
  '31': '上海市',
  '32': '江苏省',
  '33': '浙江省',
  '34': '安徽省',
  '35': '福建省',
  '36': '江西省',
  '37': '山东省',
  '41': '河南省',
  '42': '湖北省',
  '43': '湖南省',
  '44': '广东省',
  '45': '广西壮族自治区',
  '46': '海南省',
  '50': '重庆市',
  '51': '四川省',
  '52': '贵州省',
  '53': '云南省',
  '54': '西藏自治区',
  '61': '陕西省',
  '62': '甘肃省',
  '63': '青海省',
  '64': '宁夏回族自治区',
  '65': '新疆维吾尔自治区',
  '71': '台湾省',
  '81': '香港特别行政区',
  '82': '澳门特别行政区'
};

// 特殊直辖市和地级市的处理
const DIRECT_CITIES = ['11', '12', '31', '50', '81', '82']; // 直辖市和特别行政区

/**
 * 读取JSON文件
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 提取行政区划代码的前缀
 */
function getCodePrefix(code, level) {
  const codeStr = code.toString();
  switch (level) {
    case 'province': return codeStr.substring(0, 2);
    case 'city': return codeStr.substring(0, 4);
    case 'county': return codeStr.substring(0, 6);
    default: return codeStr;
  }
}

/**
 * 从县级代码中提取市级代码
 */
function getCityCodeFromCounty(countyCode) {
  return countyCode.toString().substring(0, 4);
}

/**
 * 从市级代码中提取省级代码
 */
function getProvinceCodeFromCity(cityCode) {
  return cityCode.toString().substring(0, 2);
}

/**
 * 处理直辖市特殊情况
 */
function isDirectCity(provinceCode) {
  return DIRECT_CITIES.includes(provinceCode);
}

/**
 * 整合行政区划数据
 */
async function mergeAdministrativeData() {
  console.log('开始整合中国行政区划数据...');
  
  const baseDir = path.dirname(__filename);
  const chinaPath = path.join(baseDir, 'china.json');
  const provinceDir = path.join(baseDir, 'geometryProvince');
  const countyDir = path.join(baseDir, 'geometryCouties');
  
  // 读取全国数据
  const chinaData = readJsonFile(chinaPath);
  if (!chinaData) {
    console.error('无法读取china.json文件');
    return;
  }
  
  // 构建最终的层级结构
  const result = {
    type: 'FeatureCollection',
    name: '中国行政区划数据',
    description: '省-市-区/县三级行政区划数据',
    features: [],
    metadata: {
      version: '1.0',
      updateTime: new Date().toISOString(),
      totalProvinces: 0,
      totalCities: 0,
      totalCounties: 0
    }
  };
  
  // 处理每个省份
  for (const [provinceCode, provinceName] of Object.entries(PROVINCE_MAP)) {
    console.log(`处理省份: ${provinceName} (${provinceCode})`);
    
    const provinceFeature = {
      type: 'Feature',
      properties: {
        code: provinceCode,
        name: provinceName,
        level: 'province',
        cities: []
      },
      geometry: null // 将在后面从china.json中获取
    };
    
    // 从china.json中获取省级几何数据
    const provinceGeometry = chinaData.features.find(f => 
      f.properties.id === provinceCode
    );
    if (provinceGeometry) {
      provinceFeature.geometry = provinceGeometry.geometry;
    }
    
    // 处理直辖市特殊情况
    if (isDirectCity(provinceCode)) {
      // 直辖市直接处理县级数据
      const cities = await processDirectCity(provinceCode, countyDir);
      provinceFeature.properties.cities = cities;
      result.metadata.totalCities += cities.length;
      
      // 直辖市的县级数据总数
      let countyCount = 0;
      cities.forEach(city => {
        countyCount += city.properties.counties.length;
      });
      result.metadata.totalCounties += countyCount;
    } else {
      // 普通省份处理市级和县级数据
      const cities = await processProvince(provinceCode, provinceDir, countyDir);
      provinceFeature.properties.cities = cities;
      result.metadata.totalCities += cities.length;
      
      // 计算县级总数
      let countyCount = 0;
      cities.forEach(city => {
        countyCount += city.properties.counties.length;
      });
      result.metadata.totalCounties += countyCount;
    }
    
    result.features.push(provinceFeature);
    result.metadata.totalProvinces++;
  }
  
  // 保存结果
  const outputPath = path.join(baseDir, 'china_administrative_hierarchy.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  
  console.log('\n=== 数据整合完成 ===');
  console.log(`省份数量: ${result.metadata.totalProvinces}`);
  console.log(`城市数量: ${result.metadata.totalCities}`);
  console.log(`区县数量: ${result.metadata.totalCounties}`);
  console.log(`输出文件: ${outputPath}`);
}

/**
 * 处理直辖市
 */
async function processDirectCity(provinceCode, countyDir) {
  const cities = [];
  
  // 直辖市只有一个"市辖区"城市
  const cityFeature = {
    type: 'Feature',
    properties: {
      code: provinceCode + '01', // 如1101
      name: '市辖区',
      level: 'city',
      provinceCode: provinceCode,
      counties: []
    },
    geometry: null
  };
  
  // 获取该直辖市的所有区县
  const countyFiles = fs.readdirSync(countyDir)
    .filter(file => file.startsWith(provinceCode) && file.endsWith('.json'));
  
  for (const countyFile of countyFiles) {
    const countyData = readJsonFile(path.join(countyDir, countyFile));
    if (countyData && countyData.features) {
      countyData.features.forEach(county => {
        const countyFeature = {
          type: 'Feature',
          properties: {
            code: county.properties.id || county.properties.code,
            name: county.properties.name,
            level: 'county',
            cityCode: cityFeature.properties.code,
            provinceCode: provinceCode
          },
          geometry: county.geometry
        };
        cityFeature.properties.counties.push(countyFeature);
      });
    }
  }
  
  cities.push(cityFeature);
  return cities;
}

/**
 * 处理普通省份
 */
async function processProvince(provinceCode, provinceDir, countyDir) {
  const cities = [];
  
  // 读取该省的地级市数据
  const provinceFile = path.join(provinceDir, provinceCode + '.json');
  const provinceData = readJsonFile(provinceFile);
  
  if (!provinceData || !provinceData.features) {
    console.warn(`无法读取省份数据: ${provinceCode}`);
    return cities;
  }
  
  // 处理每个地级市
  for (const cityFeature of provinceData.features) {
    const cityCode = cityFeature.properties.id || cityFeature.properties.code;
    const cityName = cityFeature.properties.name;
    
    const cityData = {
      type: 'Feature',
      properties: {
        code: cityCode,
        name: cityName,
        level: 'city',
        provinceCode: provinceCode,
        counties: []
      },
      geometry: cityFeature.geometry
    };
    
    // 获取该市的区县数据
    const countyFiles = fs.readdirSync(countyDir)
      .filter(file => file.startsWith(cityCode) && file.endsWith('.json'));
    
    for (const countyFile of countyFiles) {
      const countyData = readJsonFile(path.join(countyDir, countyFile));
      if (countyData && countyData.features) {
        countyData.features.forEach(county => {
          const countyFeature = {
            type: 'Feature',
            properties: {
              code: county.properties.id || county.properties.code,
              name: county.properties.name,
              level: 'county',
              cityCode: cityCode,
              provinceCode: provinceCode
            },
            geometry: county.geometry
          };
          cityData.properties.counties.push(countyFeature);
        });
      }
    }
    
    cities.push(cityData);
  }
  
  return cities;
}

/**
 * 验证数据完整性
 */
function validateData(result) {
  console.log('\n=== 数据验证 ===');
  
  let errors = [];
  let warnings = [];
  
  result.features.forEach(province => {
    const provinceCode = province.properties.code;
    const provinceName = province.properties.name;
    
    // 验证省份
    if (!provinceCode || !provinceName) {
      errors.push(`省份数据不完整: ${provinceCode} - ${provinceName}`);
    }
    
    // 验证城市
    province.properties.cities.forEach(city => {
      const cityCode = city.properties.code;
      const cityName = city.properties.name;
      
      if (!cityCode || !cityName) {
        errors.push(`城市数据不完整: ${provinceName} - ${cityCode} - ${cityName}`);
      }
      
      // 验证区县
      city.properties.counties.forEach(county => {
        const countyCode = county.properties.code;
        const countyName = county.properties.name;
        
        if (!countyCode || !countyName) {
          errors.push(`区县数据不完整: ${provinceName} - ${cityName} - ${countyCode} - ${countyName}`);
        }
        
        // 验证代码层级关系
        if (cityCode && countyCode) {
          const expectedCityCode = countyCode.toString().substring(0, 4);
          if (cityCode.toString() !== expectedCityCode) {
            warnings.push(`代码层级不匹配: ${cityName}(${cityCode}) - ${countyName}(${countyCode})`);
          }
        }
      });
      
      // 检查空区县
      if (city.properties.counties.length === 0) {
        warnings.push(`${provinceName} - ${cityName} 没有区县数据`);
      }
    });
    
    // 检查空城市
    if (province.properties.cities.length === 0) {
      warnings.push(`${provinceName} 没有城市数据`);
    }
  });
  
  console.log(`错误数量: ${errors.length}`);
  errors.forEach(error => console.error(`错误: ${error}`));
  
  console.log(`警告数量: ${warnings.length}`);
  warnings.forEach(warning => console.warn(`警告: ${warning}`));
  
  return { errors, warnings };
}

/**
 * 生成统计报告
 */
function generateReport(result) {
  const report = {
    summary: {
      totalProvinces: result.metadata.totalProvinces,
      totalCities: result.metadata.totalCities,
      totalCounties: result.metadata.totalCounties
    },
    provinces: []
  };
  
  result.features.forEach(province => {
    const provinceInfo = {
      code: province.properties.code,
      name: province.properties.name,
      cityCount: province.properties.cities.length,
      countyCount: 0,
      cities: []
    };
    
    province.properties.cities.forEach(city => {
      const cityInfo = {
        code: city.properties.code,
        name: city.properties.name,
        countyCount: city.properties.counties.length
      };
      provinceInfo.countyCount += city.properties.counties.length;
      provinceInfo.cities.push(cityInfo);
    });
    
    report.provinces.push(provinceInfo);
  });
  
  return report;
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 中国行政区划数据整合工具 ===');
  console.log('开始时间:', new Date().toLocaleString());
  
  try {
    await mergeAdministrativeData();
    
    // 读取结果文件进行验证
    const resultPath = path.join(__dirname, 'china_administrative_hierarchy.json');
    console.log('正在验证结果文件:', resultPath);
    const result = readJsonFile(resultPath);
    
    if (result) {
      console.log('数据验证开始...');
      // 验证数据
      const validation = validateData(result);
      
      console.log('生成报告...');
      // 生成报告
      const report = generateReport(result);
      const reportPath = path.join(__dirname, 'administrative_report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      
      console.log('\n=== 报告生成完成 ===');
      console.log(`验证结果: ${validation.errors.length}个错误, ${validation.warnings.length}个警告`);
      console.log(`报告文件: ${reportPath}`);
      console.log('结束时间:', new Date().toLocaleString());
    } else {
      console.error('无法读取结果文件');
    }
    
  } catch (error) {
    console.error('执行失败:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { mergeAdministrativeData };