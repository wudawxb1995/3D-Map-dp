<template>
  <div ref="container" class="china-3d-container"></div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import chinaData from "@/assets/json/china.json";
import {
  lngLatToMercator,
  coordinatesToMercator,
  calculateBounds,
  normalizeCoordinates,
} from "@/utils/projection";
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 各省市海拔高度映射表（基于实际平均海拔，单位：米）
const ELEVATION_DATA = {
  // 西藏地区 - 最高
  '西藏': 4000, '拉萨': 3650, '日喀则': 3836, '林芝': 3000, '山南': 3700, '昌都': 3240, '那曲': 4500, '阿里': 4270,
  
  // 青海地区
  '青海': 3000, '西宁': 2275, '海东': 2125, '海北': 3100, '海南': 2850, '黄南': 2500, '果洛': 4200, '玉树': 3700, '海西': 2800,
  
  // 四川西部、云南北部
  '四川': 1500, '甘孜': 3500, '阿坝': 3300, '凉山': 1800, '攀枝花': 1200, '雅安': 1500, '乐山': 500, '绵阳': 500, '德阳': 500, '广元': 800, '南充': 300, '达州': 400, '广安': 300, '遂宁': 300, '内江': 350, '资阳': 400, '眉山': 500, '宜宾': 300, '泸州': 300, '自贡': 350,
  
  // 云南
  '云南': 2000, '昆明': 1892, '曲靖': 1900, '玉溪': 1630, '保山': 1650, '昭通': 1950, '丽江': 2400, '普洱': 1300, '临沧': 1500, '楚雄': 1800, '红河': 1300, '文山': 1250, '西双版纳': 550, '大理': 2000, '德宏': 900, '怒江': 1200, '迪庆': 3300,
  
  // 贵州
  '贵州': 1100, '贵阳': 1071, '六盘水': 1800, '遵义': 865, '安顺': 1390, '铜仁': 275, '毕节': 1510, '黔西南': 1250, '黔东南': 550, '黔南': 830,
  
  // 甘肃
  '甘肃': 1500, '兰州': 1520, '嘉峪关': 1600, '金昌': 1500, '白银': 1700, '天水': 1100, '武威': 1500, '张掖': 1400, '平凉': 1300, '酒泉': 1500, '庆阳': 1200, '定西': 1900, '陇南': 1000, '临夏': 1900, '甘南': 3000,
  
  // 新疆
  '新疆': 1000, '乌鲁木齐': 918, '克拉玛依': 470, '吐鲁番': 35, '哈密': 760, '昌吉': 580, '博尔塔拉': 500, '巴音郭楞': 1200, '阿克苏': 1100, '克孜勒苏': 3000, '喀什': 1300, '和田': 1400, '伊犁': 600, '塔城': 600, '阿勒泰': 800,
  
  // 陕西
  '陕西': 1000, '西安': 397, '铜川': 900, '宝鸡': 570, '咸阳': 400, '渭南': 350, '延安': 1200, '汉中': 500, '榆林': 1100, '安康': 290, '商洛': 700,
  
  // 山西
  '山西': 1000, '太原': 800, '大同': 1000, '阳泉': 700, '长治': 900, '晋城': 700, '朔州': 1000, '晋中': 800, '运城': 400, '忻州': 800, '临汾': 450, '吕梁': 1000,
  
  // 内蒙古
  '内蒙古': 1000, '呼和浩特': 1063, '包头': 1000, '乌海': 1100, '赤峰': 550, '通辽': 180, '鄂尔多斯': 1400, '呼伦贝尔': 650, '巴彦淖尔': 1000, '乌兰察布': 1300, '兴安': 300, '锡林郭勒': 1000, '阿拉善': 1200,
  
  // 宁夏
  '宁夏': 1200, '银川': 1111, '石嘴山': 1100, '吴忠': 1200, '固原': 1750, '中卫': 1200,
  
  // 河北
  '河北': 500, '石家庄': 80, '唐山': 50, '秦皇岛': 10, '邯郸': 60, '邢台': 60, '保定': 20, '张家口': 700, '承德': 400, '沧州': 10, '廊坊': 10, '衡水': 20,
  
  // 直辖市
  '北京': 50, '北京市': 50, '天津': 10, '天津市': 10, '上海': 5, '上海市': 5, '重庆': 400, '重庆市': 400,
  
  // 其他省份
  '山东': 100, '济南': 50, '青岛': 50, '江苏': 10, '南京': 20, '浙江': 100, '杭州': 40, '安徽': 50, '合肥': 30,
  '河南': 100, '郑州': 100, '湖北': 200, '武汉': 50, '湖南': 200, '长沙': 50, '江西': 100, '南昌': 50,
  '福建': 200, '福州': 50, '广东': 50, '广州': 20, '广西': 200, '南宁': 100, '海南': 100, '海口': 50,
  '台湾': 500, '台北': 50, '香港': 50, '澳门': 50,
  '吉林': 200, '长春': 200, '辽宁': 50, '沈阳': 50, '黑龙江': 200, '哈尔滨': 150
};

// 根据海拔计算体块高度
const calculateExtrudeHeight = (provinceName) => {
  // 获取海拔数据，如果没有匹配则使用默认值
  const elevation = ELEVATION_DATA[provinceName] || 500; // 默认500米
  
  // 将海拔映射到高度范围（20,000 - 150,000）
  // 最低海拔0米 -> 20,000
  // 最高海拔5000米 -> 150,000
  const minHeight = 20000;
  const maxHeight = 150000;
  const minElevation = 0;
  const maxElevation = 5000;
  
  // 线性映射公式
  const normalizedElevation = Math.max(minElevation, Math.min(maxElevation, elevation));
  const height = minHeight + ((normalizedElevation - minElevation) / (maxElevation - minElevation)) * (maxHeight - minHeight);
  
  return height;
};

export default {
  name: "China3DMap",
  setup() {
    const container = ref(null);
    let scene, camera, renderer, labelRenderer, raycaster, mouse;
    let provinces = [];
    let hoveredProvince = null;
    const animationId = ref(null);

    // 3D配置参数 - 基于Three.js官方示例优化
    const CONFIG = {
      extrudeHeight: 20000,
      hoverHeight: 10000,
      animationSpeed: 0.1,
      colors: {
        base: [
          0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c,
          0xe67e22, 0x34495e, 0x16a085, 0x27ae60, 0x8e44ad, 0xc0392b,
          0xd35400, 0x2980b9, 0x7d3c98, 0x239b56, 0xbdc3c7, 0x95a5a6,
          0xf1c40f, 0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6,
          0x1abc9c, 0xe67e22, 0x34495e, 0x16a085, 0x27ae60, 0x8e44ad,
          0xc0392b, 0xd35400, 0x2980b9, 0x7d3c98
        ],
        side: 0x2c3e50, // 统一的深石板灰侧面色
        text: 0xffffff,
      },
      // 光照配置 - 基于Three.js官方最佳实践
      lighting: {
        ambient: { color: 0xffffff, intensity: 0.4 },
        directional: { color: 0xffffff, intensity: 0.8, position: [1, 1, 0.5] },
        hemisphere: { skyColor: 0xffffff, groundColor: 0x080820, intensity: 0.5 }
      }
    };

    // 动画配置
    const ANIMATION_CONFIG = {
      duration: 300, // 动画持续时间(ms)
      easing: 'ease-out',
      debounceDelay: 100, // 防抖延迟(ms)
    };

    // 防抖函数
    const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    };

    // 平滑动画函数
    const animateMesh = (mesh, targetY, duration = ANIMATION_CONFIG.duration) => {
      const startY = mesh.position.y;
      const deltaY = targetY - startY;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out
        
        mesh.position.y = startY + deltaY * easedProgress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    };

    // 防抖处理hover事件
    let lastHoveredProvince = null;

    const debouncedHover = debounce((province) => {
      if (province !== lastHoveredProvince) {
        // 处理新的悬停
        if (province) {
          province.meshes.forEach(mesh => {
            animateMesh(mesh, mesh.userData.originalPosition.y + CONFIG.hoverHeight);
          });
        }
        
        // 处理离开
        if (lastHoveredProvince && lastHoveredProvince !== province) {
          lastHoveredProvince.meshes.forEach(mesh => {
            animateMesh(mesh, mesh.userData.originalPosition.y);
          });
        }
        
        lastHoveredProvince = province;
      }
    }, ANIMATION_CONFIG.debounceDelay);

    // 初始化Three.js场景
    const initScene = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      // 创建场景
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a);

      // 创建相机 - 调整视角确保背景精灵图始终可见
      camera = new THREE.PerspectiveCamera(35, width / height, 1, 2000000)
      camera.position.set(0, 150000, 500000)  // 提高视角，确保背景覆盖
      camera.lookAt(0, 0, 0)
      // 设置相机控制目标点
      camera.target = new THREE.Vector3(0, 0, 0)

      // 创建渲染器 - 确保不透明渲染
      renderer = new THREE.WebGLRenderer({ 
        antialias: false,
        alpha: false // 禁用alpha通道确保不透明背景
      });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = false;
      renderer.setClearColor(0x0a0a0a, 1); // 设置完全不透明的背景色
      container.value.appendChild(renderer.domElement);

      // 创建CSS2D渲染器
      labelRenderer = new CSS2DRenderer();
      labelRenderer.setSize(width, height);
      labelRenderer.domElement.style.position = 'absolute';
      labelRenderer.domElement.style.top = '0px';
      labelRenderer.domElement.style.pointerEvents = 'none';
      container.value.appendChild(labelRenderer.domElement);

      // 添加光源 - 简化光源，防止闪烁
      // 添加光源 - 增强光照以显示颜色
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 环境光
      scene.add(ambientLight);
      
      // 添加方向光 - 从上方照射，突出颜色
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 100000, 50000); // 从上方和前方照射
      directionalLight.target.position.set(0, 0, 0);
      scene.add(directionalLight);
      
      // 添加补光 - 从下方补光，避免阴影过暗
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(0, -50000, -30000);
      fillLight.target.position.set(0, 0, 0);
      scene.add(fillLight);
      
      // 添加背景精灵图 - 优化尺寸和位置确保完全覆盖
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load('/src/assets/image/bg.jpeg', (texture) => {
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          color: 0xffffff,
          transparent: true,
          opacity: 0.6, // 降低透明度让体块更突出
          depthTest: false, // 确保始终在最底层
          depthWrite: false
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2000000, 2000000, 1); // 增大尺寸确保完全覆盖
        sprite.position.set(0, 0, -1000000); // 放在更远的后方
        sprite.renderOrder = -1; // 确保最先渲染作为背景
        scene.add(sprite);
      });

      // 射线检测器
      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();

      // 处理数据
      processGeoData();

      // 添加事件监听
      addEventListeners();

      // 设置轨道控制器
      setupControls();

      // 开始渲染
      animate();
    };

    // 处理地理数据
    const processGeoData = () => {
      // 收集所有坐标进行边界计算
      const allCoords = [];
      chinaData.features.forEach((feature) => {
        if (feature.geometry.type === "Polygon") {
          feature.geometry.coordinates.forEach((polygon) => {
            allCoords.push(...coordinatesToMercator(polygon));
          });
        } else if (feature.geometry.type === "MultiPolygon") {
          feature.geometry.coordinates.forEach((multi) => {
            multi.forEach((polygon) => {
              allCoords.push(...coordinatesToMercator(polygon));
            });
          });
        }
      });

      // 计算边界和中心点
      const bounds = calculateBounds(allCoords);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const center = { x: centerX, y: centerY };

      // 缩放因子
      const scale =
        200000 / Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

      // 创建每个省的3D体块
      chinaData.features.forEach((feature, index) => {
        createProvinceMesh(feature, center, scale, index);
      });
    };

    // 创建省的3D网格 - 优化版本（根据海拔高度）
    const createProvinceMesh = (feature, center, scale, index) => {
      const baseColor = new THREE.Color(
        CONFIG.colors.base[index % CONFIG.colors.base.length]
      );
      const topColor = new THREE.Color(baseColor); // 顶面使用原色
      const sideColor = new THREE.Color(0x4a4a4a); // 侧面使用深灰色
      const provinceGroup = new THREE.Group();

      // 获取省份名称
      const provinceName = feature.properties.name;
      
      // 根据海拔计算实际高度
      const actualExtrudeHeight = calculateExtrudeHeight(provinceName);

      // 处理几何数据
      let geometries = [];

      if (feature.geometry.type === "Polygon") {
        geometries = feature.geometry.coordinates.map((polygon) => {
          const coords = coordinatesToMercator(polygon);
          const normalized = normalizeCoordinates(coords, center);
          return createShapeGeometry(normalized, scale);
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((multi) => {
          multi.forEach((polygon) => {
            const coords = coordinatesToMercator(polygon);
            const normalized = normalizeCoordinates(coords, center);
            geometries.push(createShapeGeometry(normalized, scale));
          });
        });
      }

      // 创建3D体块
      geometries.forEach((geometry) => {
        const extrudeSettings = {
          steps: 1,
          depth: actualExtrudeHeight, // 使用实际计算的高度
          bevelEnabled: true,
          bevelThickness: 0.5,
          bevelSize: 0.5,
          bevelOffset: 0,
          bevelSegments: 3
        };

        const extrudeGeometry = new THREE.ExtrudeGeometry(
          geometry,
          extrudeSettings
        );

        // 创建顶部材质 - 使用MeshPhongMaterial
        const topMaterial = new THREE.MeshPhongMaterial({
          color: topColor,
          transparent: true,
          opacity: 1.0,
        });

        // 创建侧面材质 - 使用MeshPhongMaterial
        const sideMaterial = new THREE.MeshPhongMaterial({
          color: sideColor,
          transparent: true,
          opacity: 0.7,
        });

        // 创建材质数组 - 简化为2个材质：侧面和顶面
        const materials = [ topMaterial, sideMaterial];

        // 创建主网格
        const mesh = new THREE.Mesh(extrudeGeometry, materials);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.userData = {
          name: provinceName,
          originalPosition: mesh.position.clone(),
          isHovered: false,
        };
        
        // 旋转体块使其面向用户视角
        mesh.rotation.x = -Math.PI / 3;

        provinceGroup.add(mesh);

        // 添加文字标签 - 根据实际高度调整标签位置
        const textPosition = lngLatToMercator(
          feature.properties.cp[0],
          feature.properties.cp[1]
        );
        const normalizedText = [
          (textPosition.x - center.x) * scale,
          actualExtrudeHeight + 2000, // 使用实际高度调整标签位置
          (textPosition.y - center.y) * scale,
        ];

        // 使用 CSS2DObject 创建省份名称标签
        const labelDiv = document.createElement('div');
        labelDiv.className = 'province-label';
        labelDiv.textContent = provinceName;
        labelDiv.style.cssText = `
          position: absolute;
          color: #ffffff;
          font-family: Arial, sans-serif;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          pointer-events: none;
          background: rgba(0, 0, 0, 0.4);
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
          transform-origin: center;
          transition: transform 0.1s ease;
        `;

        const label = new CSS2DObject(labelDiv);
        
        // 计算体块的中心位置
        const meshBounds = new THREE.Box3().setFromObject(mesh);
        const labelCenter = new THREE.Vector3();
        meshBounds.getCenter(labelCenter);
        
        label.position.set(
          labelCenter.x,
          labelCenter.y + actualExtrudeHeight / 2, // 使用实际高度调整标签位置
          labelCenter.z
        );
        provinceGroup.add(label);
        scene.add(provinceGroup);

        provinces.push({
          group: provinceGroup,
          meshes: provinceGroup.children.filter((child) => child.type === "Mesh" && child.geometry),
          name: provinceName,
        });
      });
    };

    // 创建形状几何体
    const createShapeGeometry = (coordinates, scale) => {
      const shape = new THREE.Shape();

      coordinates.forEach((coord, index) => {
        const x = coord[0] * scale;
        const y = coord[1] * scale;

        if (index === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      });

      return shape;
    };

    // 添加事件监听器
    const addEventListeners = () => {
      container.value.addEventListener("mousemove", onMouseMove);
      container.value.addEventListener("mouseleave", onMouseLeave);
      window.addEventListener("resize", onWindowResize);
    };

    // 鼠标移动事件 - 使用防抖版本
    const onMouseMove = (event) => {
      const rect = container.value.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const allMeshes = provinces.flatMap((p) => p.meshes);
      const intersects = raycaster.intersectObjects(allMeshes);

      // 查找当前悬停的省份
      let currentProvince = null;
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        currentProvince = provinces.find((p) => p.meshes.includes(mesh));
      }

      // 使用防抖处理悬停变化
      debouncedHover(currentProvince);
    };

    // 鼠标离开事件 - 使用平滑动画
    const onMouseLeave = () => {
      debouncedHover(null);
    };

    // 窗口大小调整
    const onWindowResize = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (labelRenderer) {
        labelRenderer.setSize(width, height);
      }
    };

    // 轨道控制器
    let controls;

    // 设置轨道控制器
    const setupControls = () => {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; // 启用阻尼效果，使运动更平滑
      controls.dampingFactor = 0.05; // 阻尼系数
      controls.enableRotate = false; // 禁用旋转
      controls.enablePan = false; // 禁用平移
      controls.enableZoom = true; // 启用缩放
      controls.screenSpacePanning = false; // 禁用屏幕空间平移
      controls.minDistance = 200000; // 最小缩放距离，确保背景可见
      controls.maxDistance = 600000; // 最大缩放距离，防止过度缩小
      controls.minPolarAngle = Math.PI / 6; // 限制最低视角，确保背景可见
      controls.maxPolarAngle = Math.PI / 3; // 限制最高视角，防止俯视过度
      controls.target.set(0, 0, 0); // 设置目标点为场景中心
    };

    // 动画循环
    const animate = () => {
      animationId.value = requestAnimationFrame(animate);
      
      // 更新轨道控制器
      if (controls) {
        controls.update();
        
        // 根据相机距离调整标签大小
        const distance = camera.position.distanceTo(controls.target);
        const scaleFactor = Math.max(0.5, Math.min(2, 300000 / distance));
        
        // 更新所有标签的缩放
        document.querySelectorAll('.province-label').forEach(label => {
          label.style.transform = `scale(${scaleFactor})`;
        });
      }
      
      renderer.render(scene, camera);
      if (labelRenderer) {
        labelRenderer.render(scene, camera);
      }
    };

    // 清理资源
    const cleanup = () => {
      if (animationId.value) {
        cancelAnimationFrame(animationId.value);
      }

      if (controls) {
        controls.dispose();
      }

      container.value.removeEventListener("mousemove", onMouseMove);
      container.value.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onWindowResize);

      if (renderer) {
        renderer.dispose();
      }
      if (container.value && renderer) {
        container.value.removeChild(renderer.domElement);
      }
      if (container.value && labelRenderer) {
        container.value.removeChild(labelRenderer.domElement);
      }
    };

    onMounted(() => {
      initScene();
    });

    onUnmounted(() => {
      cleanup();
    });

    return {
      container,
    };
  },
};
</script>

<style scoped>
.china-3d-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a0a 100%);
}
</style>