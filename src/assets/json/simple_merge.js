/**
 * 简化的中国行政区划数据整合脚本
 * 用于测试和验证数据结构
 */

const fs = require('fs');
const path = require('path');

// 读取JSON文件
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

// 主函数
async function main() {
  console.log('=== 简化版数据整合测试 ===');
  
  const baseDir = __dirname;
  const chinaPath = path.join(baseDir, 'china.json');
  
  // 读取全国数据
  const chinaData = readJsonFile(chinaPath);
  if (!chinaData) {
    console.error('无法读取china.json文件');
    return;
  }
  
  console.log('china.json 基本信息:');
  console.log('- 类型:', chinaData.type);
  console.log('- 名称:', chinaData.name);
  console.log('- 要素数量:', chinaData.features?.length || 0);
  
  if (chinaData.features && chinaData.features.length > 0) {
    console.log('\n前3个省份示例:');
    chinaData.features.slice(0, 3).forEach((feature, index) => {
      console.log(`${index + 1}. ID: ${feature.properties?.id}, 名称: ${feature.properties?.name}`);
    });
  }
  
  // 测试读取一个省份数据
  const provinceDir = path.join(baseDir, 'geometryProvince');
  const testProvince = '11.json'; // 北京市
  const provincePath = path.join(provinceDir, testProvince);
  
  const provinceData = readJsonFile(provincePath);
  if (provinceData) {
    console.log(`\n${testProvince} 数据:`);
    console.log('- 类型:', provinceData.type);
    console.log('- 要素数量:', provinceData.features?.length || 0);
    
    if (provinceData.features && provinceData.features.length > 0) {
      console.log('\n前3个区县示例:');
      provinceData.features.slice(0, 3).forEach((feature, index) => {
        console.log(`${index + 1}. ID: ${feature.properties?.id}, 名称: ${feature.properties?.name}`);
      });
    }
  }
  
  // 测试读取县级数据
  const countyDir = path.join(baseDir, 'geometryCouties');
  const testCounty = '110100.json'; // 北京市市辖区
  const countyPath = path.join(countyDir, testCounty);
  
  const countyData = readJsonFile(countyPath);
  if (countyData) {
    console.log(`\n${testCounty} 数据:`);
    console.log('- 类型:', countyData.type);
    console.log('- 要素数量:', countyData.features?.length || 0);
    
    if (countyData.features && countyData.features.length > 0) {
      console.log('\n前3个乡镇示例:');
      countyData.features.slice(0, 3).forEach((feature, index) => {
        console.log(`${index + 1}. ID: ${feature.properties?.id}, 名称: ${feature.properties?.name}`);
      });
    }
  }
  
  console.log('\n=== 测试完成 ===');
}

// 执行
main().catch(console.error);