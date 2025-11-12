<template>
  <div ref="container" class="china-3d-container">
    <!-- 右上角显示旋转角度和坐标轴说明 -->
    <div class="rotation-info">
      <div class="axis-legend">
        <div class="legend-title">坐标轴说明</div>
        <div class="legend-item">
          <span class="axis-color x-axis"></span>
          <span class="axis-name">X轴（红色）</span>
        </div>
        <div class="legend-item">
          <span class="axis-color y-axis"></span>
          <span class="axis-name">Y轴（绿色）</span>
        </div>
        <div class="legend-item">
          <span class="axis-color z-axis"></span>
          <span class="axis-name">Z轴（蓝色）</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="rotation-angles">
        <div class="angles-title">旋转角度</div>
        <div class="rotation-item">
          <span class="label">X轴旋转:</span>
          <span class="value">{{ rotationAngles.x }}°</span>
        </div>
        <div class="rotation-item">
          <span class="label">Y轴旋转:</span>
          <span class="value">{{ rotationAngles.y }}°</span>
        </div>
        <div class="rotation-item">
          <span class="label">Z轴旋转:</span>
          <span class="value">{{ rotationAngles.z }}°</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import chinaData from "@/assets/json/china.json"; // 省份数据，用于渲染顶面
import chinaBorderData from "@/assets/json/chinaBorder.json"; // 国界线数据，用于渲染侧面
import {
  coordinatesToMercator,
  calculateBounds,
  normalizeCoordinates,
} from "@/utils/projection";
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
    let scene, camera, renderer;
    let provinces = [];
    const animationId = ref(null);

    // 旋转角度显示（响应式数据）
    const rotationAngles = ref({
      x: 0,
      y: 0,
      z: 0
    });

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

    // 禁用鼠标悬停效果 - 注释掉动画配置
    // const ANIMATION_CONFIG = {
    //   duration: 300, // 动画持续时间(ms)
    //   easing: 'ease-out',
    //   debounceDelay: 100, // 防抖延迟(ms)
    // };

    // 禁用鼠标悬停效果 - 注释掉相关函数
    // const debounce = (func, delay) => {
    //   let timeoutId;
    //   return (...args) => {
    //     clearTimeout(timeoutId);
    //     timeoutId = setTimeout(() => func.apply(this, args), delay);
    //   };
    // };

    // const animateMesh = (mesh, targetY, duration = ANIMATION_CONFIG.duration) => {
    //   const startY = mesh.position.y;
    //   const deltaY = targetY - startY;
    //   const startTime = Date.now();

    //   const animate = () => {
    //     const elapsed = Date.now() - startTime;
    //     const progress = Math.min(elapsed / duration, 1);
    //
    //     // 使用缓动函数
    //     const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out
    //
    //     mesh.position.y = startY + deltaY * easedProgress;
    //
    //     if (progress < 1) {
    //       requestAnimationFrame(animate);
    //     }
    //   };
    //
    //   animate();
    // };

    // 禁用鼠标悬停效果 - 注释掉相关函数
    // let lastHoveredProvince = null;

    // const debouncedHover = debounce((province) => {
    //   if (province !== lastHoveredProvince) {
    //     // 处理新的悬停
    //     if (province) {
    //       province.meshes.forEach(mesh => {
    //         animateMesh(mesh, mesh.userData.originalPosition.y + CONFIG.hoverHeight);
    //       });
    //     }
    //
    //     // 处理离开
    //     if (lastHoveredProvince && lastHoveredProvince !== province) {
    //       lastHoveredProvince.meshes.forEach(mesh => {
    //         animateMesh(mesh, mesh.userData.originalPosition.y);
    //       });
    //     }
    //
    //     lastHoveredProvince = province;
    //   }
    // }, ANIMATION_CONFIG.debounceDelay);

    // 初始化Three.js场景
    const initScene = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      // 创建场景
      scene = new THREE.Scene();
      // 先设置默认背景色，等待纹理加载
      scene.background = new THREE.Color(0x0a0a0a);

      // 创建相机 - 稍微倾斜的俯视角度，让3D体块占据屏幕的2/3
      camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000000) // FOV为60
      // 设置相机位置：稍微倾斜，不是完全垂直
      // 使用极角约5度的位置作为初始位置
      const initialPolarAngle = 5 * Math.PI / 180; // 5度
      const distance = 160000;
      camera.position.set(
        0,
        distance * Math.cos(initialPolarAngle), // Y坐标
        distance * Math.sin(initialPolarAngle)  // Z坐标
      );
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

      // 启用深度测试，确保正确的遮挡关系
      renderer.sortObjects = true; // 启用对象排序

      container.value.appendChild(renderer.domElement);

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
      
      // 添加背景图 - 使用平面几何体，始终面向相机
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load('/src/assets/image/home/bg.jpg', (texture) => {
        // 计算背景平面尺寸以完全覆盖视野
        const aspect = width / height;
        const distance = 1500000; // 固定距离
        const vFov = camera.fov * Math.PI / 180;
        const viewHeight = 2 * Math.tan(vFov / 2) * distance;
        const viewWidth = viewHeight * aspect;

        // 创建平面几何体 - 缩小尺寸
        const geometry = new THREE.PlaneGeometry(viewWidth * 1.2, viewHeight * 1.2);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          depthTest: true,
          depthWrite: false
        });

        const backgroundPlane = new THREE.Mesh(geometry, material);
        backgroundPlane.renderOrder = -999; // 设置最低的渲染顺序

        // 保存背景平面引用，用于窗口调整和相机跟随
        scene.userData.backgroundPlane = backgroundPlane;
        scene.add(backgroundPlane);
      });

      // 添加旋转精灵图 - 在背景图上层
      textureLoader.load('/src/assets/image/home/bg-ring.png', (texture) => {
        // 计算精灵图平面尺寸 - 保持正方形，不拉伸
        const distance = 1400000; // 比背景图稍近一些
        const vFov = camera.fov * Math.PI / 180;
        const viewHeight = 2 * Math.tan(vFov / 2) * distance;

        // 使用较小的尺寸作为正方形的边长，保持环形图不变形
        const ringSize = viewHeight * 0.6 * 1.8; // 扩大三倍

        // 创建正方形平面几何体 - 保持环形图不变形
        const geometry = new THREE.PlaneGeometry(ringSize, ringSize);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthTest: true,
          depthWrite: false
        });

        const ringPlane = new THREE.Mesh(geometry, material);
        ringPlane.renderOrder = -998; // 比背景图高一层

        // 保存旋转精灵图引用，用于窗口调整、相机跟随和旋转动画
        scene.userData.ringPlane = ringPlane;
        scene.add(ringPlane);
      });

      // 禁用鼠标悬停效果 - 不再需要射线检测器
      // raycaster = new THREE.Raycaster();
      // mouse = new THREE.Vector2();

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
      // 收集所有坐标进行边界计算（使用省份数据）
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

      // 1. 创建省份顶面（使用 chinaData）
      chinaData.features.forEach((feature) => {
        createProvinceTopMesh(feature, center, scale);
      });

      // 2. 创建国界侧面（使用 chinaBorderData）
      chinaBorderData.features.forEach((feature) => {
        createBorderSideMesh(feature, center, scale);
      });
    };

    /**
     * 创建省份顶面网格（使用 chinaData）
     * 只渲染顶面，不渲染侧面
     */
    const createProvinceTopMesh = (feature, center, scale) => {
      const provinceGroup = new THREE.Group();
      const provinceName = feature.properties.name;
      const actualExtrudeHeight = 15000; // 统一高度

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

      // 创建3D体块 - 只渲染顶面（不渲染底面和侧面）
      // 顶面位置在侧面之上
      geometries.forEach((geometry) => {
        // 创建顶面材质（可见）
        const topMaterial = new THREE.MeshPhongMaterial({
          color: 0x3370ff, // rgb(51, 112, 255)
          transparent: true,
          opacity: 0.5,
          depthWrite: true,
          depthTest: true,
          side: THREE.DoubleSide, // 双面渲染
        });

        // 使用 createShapeGeometry 创建平面几何体
        // 这个函数返回的是 THREE.Shape，需要转换为 ShapeGeometry
        const shapeGeometry = new THREE.ShapeGeometry(geometry);

        // 创建网格
        const mesh = new THREE.Mesh(shapeGeometry, topMaterial);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.renderOrder = 2; // 顶面后渲染，确保遮挡侧面
        mesh.userData = {
          name: provinceName,
          originalPosition: mesh.position.clone(),
          isHovered: false,
        };

        // 旋转体块，让顶面朝向+Y方向（向上）
        // ShapeGeometry 默认在 XY 平面，需要绕 X 轴旋转 -90 度
        mesh.rotation.x = -Math.PI / 2;

        // 设置位置：将顶面放置在侧面之上
        // 旋转后，Y 轴是向上的方向
        mesh.position.y = actualExtrudeHeight;

        provinceGroup.add(mesh);
      });

      scene.add(provinceGroup);

      provinces.push({
        group: provinceGroup,
        meshes: provinceGroup.children.filter((child) => child.type === "Mesh" && child.geometry),
        name: provinceName,
      });
    };

    /**
     * 创建国界侧面网格（使用 chinaBorderData）
     * 只渲染侧面，使用 ShaderMaterial 创建反光围栏效果
     */
    const createBorderSideMesh = (feature, center, scale) => {
      const borderGroup = new THREE.Group();
      const borderName = feature.properties.name;

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

      // 创建3D体块 - 修复UV坐标，使用光带效果
      geometries.forEach((geometry) => {
        // extrudeSettings - 使用适合当前场景的高度
        const extrudeSettings = {
          depth: 15000, // 与省份顶面高度一致
          bevelEnabled: false
        };

        const extrudeGeometry = new THREE.ExtrudeGeometry(geometry, extrudeSettings);

        // 🔧 修复UV坐标 - 让光带垂直流动（从底到顶）
        const uvAttribute = extrudeGeometry.attributes.uv;
        const positionAttribute = extrudeGeometry.attributes.position;
        const normalAttribute = extrudeGeometry.attributes.normal;

        // 遍历所有顶点，为侧面顶点重新分配UV
        for (let i = 0; i < positionAttribute.count; i++) {
          const normal = new THREE.Vector3(
            normalAttribute.getX(i),
            normalAttribute.getY(i),
            normalAttribute.getZ(i)
          );

          // 只处理侧面顶点（法线Z不为±1）
          if (Math.abs(normal.z) < 0.99) {
            // ExtrudeGeometry 挤出方向是 Z 轴
            // 旋转后，Z 轴变成世界空间的 Y 轴（向上）
            const z = positionAttribute.getZ(i);

            // UV.y 根据挤出深度归一化（0=底部，1=顶部）
            const v = z / extrudeSettings.depth;

            // 只修改 V 坐标，U 坐标保持 Three.js 自动生成的值
            uvAttribute.setY(i, v);
          }
        }

        uvAttribute.needsUpdate = true;

        // 顶面和底面材质（完全不可见）
        const invisibleMaterial = new THREE.MeshBasicMaterial({
          visible: false,
        });

        // 侧面材质 - 垂直流动光带效果
        const sideMaterial = new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          depthTest: false,
          uniforms: {
            time: { value: 0.0 },
            num: { value: 3.0 }, // 光带数量
            color1: { value: new THREE.Color('#00FFFF') }
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
              vUv = uv;
              vNormal = normal;
              vPosition = position;

              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`,
          fragmentShader: `uniform vec3 color1;
            uniform float time;
            uniform float num;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
              // 丢弃顶面和底面
              if(vNormal.z == 1.0 || vNormal.z == -1.0) {
                discard;
              }

              // 垂直流动光带：使用 vUv.y（垂直方向）
              // vUv.y: 0=底部，1=顶部
              // time 增加时，光带从底部向顶部流动
              float wave = fract(vUv.y - time);

              // 创建多条光带
              float bands = fract(wave * num);

              // 光带效果：接近0时亮，接近1时暗
              float alpha = 1.0 - bands;

              gl_FragColor = vec4(color1, alpha);
            }`
        });

        // 保存材质引用，用于动画更新
        if (!borderGroup.userData.materials) {
          borderGroup.userData.materials = [];
        }
        borderGroup.userData.materials.push(sideMaterial);

        // 材质数组：[0] = 顶面和底面（不可见）, [1] = 侧面（光带）
        const materials = [invisibleMaterial, sideMaterial];

        // 创建网格
        const mesh = new THREE.Mesh(extrudeGeometry, materials);

        // 旋转和位置 - 适配当前场景的坐标系统
        mesh.rotation.x = -Math.PI / 2; // 使用负角度，与省份顶面一致
        mesh.position.y = 0; // 从底部开始

        mesh.userData = {
          name: borderName,
          originalPosition: mesh.position.clone(),
          isBorder: true,
        };

        borderGroup.add(mesh);
      });

      scene.add(borderGroup);

      // 保存 borderGroup 引用，用于动画更新
      if (!scene.userData.borderGroups) {
        scene.userData.borderGroups = [];
      }
      scene.userData.borderGroups.push(borderGroup);
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
      // 禁用鼠标悬停效果，不再监听鼠标移动和离开事件
      // container.value.addEventListener("mousemove", onMouseMove);
      // container.value.addEventListener("mouseleave", onMouseLeave);
      window.addEventListener("resize", onWindowResize);
    };

    // 禁用鼠标悬停效果 - 注释掉相关函数
    // const onMouseMove = (event) => {
    //   const rect = container.value.getBoundingClientRect();
    //   mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    //   mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    //   raycaster.setFromCamera(mouse, camera);

    //   const allMeshes = provinces.flatMap((p) => p.meshes);
    //   const intersects = raycaster.intersectObjects(allMeshes);

    //   // 查找当前悬停的省份
    //   let currentProvince = null;
    //   if (intersects.length > 0) {
    //     const mesh = intersects[0].object;
    //     currentProvince = provinces.find((p) => p.meshes.includes(mesh));
    //   }

    //   // 使用防抖处理悬停变化
    //   debouncedHover(currentProvince);
    // };

    // const onMouseLeave = () => {
    //   debouncedHover(null);
    // };

    // 窗口大小调整
    const onWindowResize = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      // 更新背景平面尺寸以适配新的屏幕尺寸
      if (scene.userData.backgroundPlane) {
        const aspect = width / height;
        const distance = 1500000; // 固定距离
        const vFov = camera.fov * Math.PI / 180;
        const viewHeight = 2 * Math.tan(vFov / 2) * distance;
        const viewWidth = viewHeight * aspect;

        // 更新几何体 - 缩小尺寸
        scene.userData.backgroundPlane.geometry.dispose();
        scene.userData.backgroundPlane.geometry = new THREE.PlaneGeometry(viewWidth * 1.2, viewHeight * 1.2);
      }
    };

    // 轨道控制器
    let controls;

    // 设置轨道控制器 - 类似高德地图的操作模式
    const setupControls = () => {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; // 启用阻尼效果，使运动更平滑
      controls.dampingFactor = 0.1; // 增加阻尼系数，使运动更平滑，减少边界跳跃

      // 启用左键拖动平移，右键旋转，滚轮缩放
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,      // 左键平移
        MIDDLE: THREE.MOUSE.DOLLY,  // 中键缩放
        RIGHT: THREE.MOUSE.ROTATE   // 右键旋转
      };

      controls.enableRotate = true; // 启用旋转
      controls.enablePan = true; // 启用平移
      controls.enableZoom = true; // 启用缩放
      controls.screenSpacePanning = true; // 启用屏幕空间平移（平移时保持在屏幕平面）
      controls.minDistance = 10000; // 最小缩放距离（更近）
      controls.maxDistance = 200000; // 最大缩放距离

      // 限制平移距离范围（避免拖动太远）
      // OrbitControls 没有内置的 maxPan 属性，需要在动画循环中手动限制
      controls.maxPanDistance = 50000; // 最大平移距离（缩小到50000）

      // 禁止平移时旋转：设置平移速度，降低旋转灵敏度
      controls.panSpeed = 1.0; // 平移速度
      controls.rotateSpeed = 0.3; // 进一步降低旋转速度，避免边界跳跃

      // 限制上下旋转范围为 0~20°
      // 注意：极角是从+Y轴向下测量的角度
      // 0度 = 正上方（+Y轴，垂直俯视），90度 = 水平，180度 = 正下方（-Y轴）
      // 当前相机初始位置在极角5度
      // 允许从接近垂直（0.5度）到倾斜20度，避免完全到达0度边界
      controls.minPolarAngle = 0.5 * Math.PI / 180; // 0.5度（接近垂直，但不完全到达边界）
      controls.maxPolarAngle = 60 * Math.PI / 180; // 20度（允许向下倾斜20度）

      controls.target.set(0, 0, 0); // 设置目标点为场景中心
    };

    // 动画循环
    const animate = () => {
      animationId.value = requestAnimationFrame(animate);

      // 更新轨道控制器
      if (controls) {
        controls.update();

        // 限制平移距离范围
        // 计算 target 到原点的距离
        const targetDistance = controls.target.length();
        if (targetDistance > controls.maxPanDistance) {
          // 如果超出最大平移距离，将 target 拉回到允许范围内
          controls.target.normalize().multiplyScalar(controls.maxPanDistance);
        }
      }

      // 更新背景平面位置和旋转，使其始终面向相机
      if (scene.userData.backgroundPlane) {
        const backgroundPlane = scene.userData.backgroundPlane;

        // 计算相机方向向量
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        // 将背景平面放置在相机视线方向的远处
        const distance = 1500000;
        backgroundPlane.position.copy(camera.position).add(cameraDirection.multiplyScalar(distance));

        // 使背景平面始终面向相机
        backgroundPlane.lookAt(camera.position);
      }

      // 更新旋转精灵图位置、旋转和动画
      if (scene.userData.ringPlane) {
        const ringPlane = scene.userData.ringPlane;

        // 初始化旋转角度
        if (ringPlane.userData.rotationAngle === undefined) {
          ringPlane.userData.rotationAngle = 0;
        }

        // 每帧累加旋转角度（顺时针）
        ringPlane.userData.rotationAngle -= 0.01;

        // 计算相机方向向量
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        // 将旋转精灵图放置在相机视线方向的远处（比背景图稍近）
        const distance = 1400000;
        ringPlane.position.copy(camera.position).add(cameraDirection.multiplyScalar(distance));

        // 创建一个临时四元数来保存面向相机的旋转
        const quaternion = new THREE.Quaternion();

        // 创建旋转矩阵使平面面向相机
        const matrix = new THREE.Matrix4();
        matrix.lookAt(ringPlane.position, camera.position, camera.up);
        quaternion.setFromRotationMatrix(matrix);

        // 创建绕Z轴旋转的四元数（自转）
        const rotationQuaternion = new THREE.Quaternion();
        rotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), ringPlane.userData.rotationAngle);

        // 组合两个旋转：先面向相机，再自转
        ringPlane.quaternion.copy(quaternion).multiply(rotationQuaternion);
      }

      // 体块保持固定朝向，不需要动态旋转
      // ExtrudeGeometry的顶面在+Z方向，我们需要让它朝向+Y方向（向上）
      // 这样当相机从上方俯视时，可以看到顶面
      // 旋转在创建时已经设置好了

      // 更新字节流围栏的动画效果
      if (scene.userData.borderGroups) {
        scene.userData.borderGroups.forEach((borderGroup) => {
          if (borderGroup.userData.materials) {
            borderGroup.userData.materials.forEach((material) => {
              if (material.uniforms && material.uniforms.time) {
                // 更新 time uniform，持续增加（降低速度）
                material.uniforms.time.value += 0.002;
              }
            });
          }
        });
      }

      // 更新角度显示（用于调试）
      if (controls) {
        // 显示OrbitControls的极角和方位角
        const polarAngle = controls.getPolarAngle();
        const azimuthalAngle = controls.getAzimuthalAngle();

        rotationAngles.value.x = Math.round(polarAngle * 180 / Math.PI * 100) / 100; // 极角（俯仰）
        rotationAngles.value.y = Math.round(azimuthalAngle * 180 / Math.PI * 100) / 100; // 方位角（水平旋转）
        rotationAngles.value.z = 0;
      }

      renderer.render(scene, camera);
    };

    // 清理资源
    const cleanup = () => {
      if (animationId.value) {
        cancelAnimationFrame(animationId.value);
      }

      if (controls) {
        controls.dispose();
      }

      // 禁用鼠标悬停效果，不再移除相关事件监听器
      // container.value.removeEventListener("mousemove", onMouseMove);
      // container.value.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onWindowResize);

      if (renderer) {
        renderer.dispose();
      }
      if (container.value && renderer) {
        container.value.removeChild(renderer.domElement);
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
      rotationAngles,
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

/* 右上角信息面板 */
.rotation-info {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 10px;
  color: #fff;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  min-width: 220px;
}

/* 坐标轴图例 */
.axis-legend {
  margin-bottom: 15px;
}

.legend-title {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.axis-color {
  width: 30px;
  height: 4px;
  border-radius: 2px;
  margin-right: 10px;
  display: inline-block;
}

.axis-color.x-axis {
  background-color: #ff0000; /* 红色 - X轴 */
}

.axis-color.y-axis {
  background-color: #00ff00; /* 绿色 - Y轴 */
}

.axis-color.z-axis {
  background-color: #0000ff; /* 蓝色 - Z轴 */
}

.axis-name {
  color: #ccc;
  font-size: 13px;
}

/* 分割线 */
.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 15px 0;
}

/* 旋转角度标题 */
.angles-title {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.rotation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.rotation-item:last-child {
  margin-bottom: 0;
}

.rotation-item .label {
  color: #888;
  margin-right: 15px;
  font-weight: 500;
  font-size: 13px;
}

.rotation-item .value {
  color: #00ff88;
  font-weight: bold;
  min-width: 80px;
  text-align: right;
  font-size: 16px;
}
</style>