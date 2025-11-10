/**
 * 简化的中国行政区划数据整合脚本
 * 生成省-市-县层级结构
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filenaem);

// 主函数
function main() {
  console.log('开始整合行政区划数据...');
  
  const baseDir = __dirname;
  
  // 读取全国数据
  const chinaData = JSON.parse(fs.readFileSync(path.join(baseDir, 'china.json'), 'utf8'));
  console.log(`读取全国数据: ${chinaData.features.length} 个省份`);
  
  const result = {
    type: 'FeatureCollection',
    name: '中国行政区划层级数据',
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
  chinaData.features.forEach((provinceFeature, index) => {
    const provinceCode = provinceFeature.properties.id;
    const provinceName = provinceFeature.properties.name;
    
    console.log(`处理第 ${index + 1} 个省份: ${provinceName} (${provinceCode})`);
    
    const provinceData = {
      type: 'Feature',
      properties: {
        code: provinceCode,
        name: provinceName,
        level: 'province',
        childNum: provinceFeature.properties.childNum,
        cities: []
      },
      geometry: provinceFeature.geometry
    };
    
    // 尝试读取该省的地级市数据
    const provinceFile = path.join(baseDir, 'geometryProvince', `${provinceCode}.json`);
    if (fs.existsSync(provinceFile)) {
      let cityData;
      try {
        cityData = JSON.parse(fs.readFileSync(provinceFile, 'utf8'));
      } catch (parseError) {
        console.error(`解析省份文件失败: ${provinceFile}`, parseError.message);
        return;
      }
      console.log(`  找到 ${cityData.features.length} 个地级市`);
      
      // 处理每个地级市
      cityData.features.forEach(cityFeature => {
        const cityCode = cityFeature.properties.id;
        const cityName = cityFeature.properties.name;
        
        const cityData = {
          type: 'Feature',
          properties: {
            code: cityCode,
            name: cityName,
            level: 'city',
            provinceCode: provinceCode,
            childNum: cityFeature.properties.childNum,
            counties: []
          },
          geometry: cityFeature.geometry
        };
        
        // 尝试读取该市的县级数据
        const countyFile = path.join(baseDir, 'geometryCouties', `${cityCode}.json`);
        if (fs.existsSync(countyFile)) {
          let countyData;
          try {
            countyData = JSON.parse(fs.readFileSync(countyFile, 'utf8'));
          } catch (parseError) {
            console.error(`解析县级文件失败: ${countyFile}`, parseError.message);
            return;
          }
          
          // 处理每个县
          countyData.features.forEach(countyFeature => {
            const countyCode = countyFeature.properties.id;
            const countyName = countyFeature.properties.name;
            
            const countyItem = {
              type: 'Feature',
              properties: {
                code: countyCode,
                name: countyName,
                level: 'county',
                cityCode: cityCode,
                provinceCode: provinceCode,
                childNum: countyFeature.properties.childNum
              },
              geometry: countyFeature.geometry
            };
            
            cityData.properties.counties.push(countyItem);
          });
          
          console.log(`    ${cityName}: ${countyData.features.length} 个县`);
        } else {
          console.log(`    ${cityName}: 未找到县级数据文件 ${countyFile}`);
        }
        
        provinceData.properties.cities.push(cityData);
        result.metadata.totalCities++;
        result.metadata.totalCounties += cityData.properties.counties.length;
        
        // 更新进度显示
        if (result.metadata.totalCities % 50 === 0) {
          console.log(`  已处理 ${result.metadata.totalCities} 个地级市`);
        }
      });
    } else {
      console.log(`  未找到地级市数据文件: ${provinceFile}`);
    }
    
    result.features.push(provinceData);
    result.metadata.totalProvinces++;
    
    // 每处理5个省份就显示进度
    if ((index + 1) % 5 === 0) {
      console.log(`进度: ${index + 1}/${chinaData.features.length}`);
    }
  });
  
  // 保存结果
  const outputPath = path.join(baseDir, 'china_administrative_hierarchy.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log('\n=== 数据整合完成 ===');
  console.log(`省份数量: ${result.metadata.totalProvinces}`);
  console.log(`城市数量: ${result.metadata.totalCities}`);
  console.log(`区县数量: ${result.metadata.totalCounties}`);
  console.log(`输出文件: ${outputPath}`);
  console.log(`文件大小: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

// 执行
main();