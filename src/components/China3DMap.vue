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

export default {
  name: "China3DMap",
  setup() {
    const container = ref(null);
    let scene, camera, renderer, labelRenderer, raycaster, mouse;
    let provinces = [];
    let hoveredProvince = null;
    const animationId = ref(null);

    // 3D配置参数
    const CONFIG = {
      extrudeHeight: 20000,
      hoverHeight: 10000,
      animationSpeed: 0.1,
      colors: {
        // 优化的省市颜色方案，确保高辨识度
        base: [
          0x3498db, // 北京 - 蓝色
          0xe74c3c, // 上海 - 红色
          0x2ecc71, // 广东 - 绿色
          0xf39c12, // 浙江 - 橙色
          0x9b59b6, // 江苏 - 紫色
          0x1abc9c, // 山东 - 青绿
          0xe67e22, // 河南 - 深橙
          0x34495e, // 四川 - 深蓝灰
          0x16a085, // 湖北 - 青蓝
          0x27ae60, // 湖南 - 深绿
          0x8e44ad, // 河北 - 深紫
          0xc0392b, // 福建 - 深红
          0xd35400, // 安徽 - 棕色
          0x2980b9, // 江西 - 天蓝
          0x7d3c98, // 陕西 - 紫罗兰
          0x239b56, // 辽宁 - 森林绿
          0xbdc3c7, // 黑龙江 - 银灰
          0x95a5a6, // 吉林 - 浅灰
          0xf1c40f, // 云南 - 金黄
          0xe74c3c, // 贵州 - 珊瑚红
          0x3498db, // 广西 - 亮蓝
          0x2ecc71, // 甘肃 - 薄荷绿
          0xf39c12, // 山西 - 琥珀色
          0x9b59b6, // 内蒙古 - 薰衣草紫
          0x1abc9c, // 新疆 - 绿松石
          0xe67e22, // 西藏 - 赤陶
          0x34495e, // 青海 - 石板灰
          0x16a085, // 宁夏 - 孔雀绿
          0x27ae60, // 海南 - 翡翠绿
          0x8e44ad, // 台湾 - 紫水晶
          0xc0392b, // 香港 - 石榴红
          0xd35400, // 澳门 - 赤褐色
          0x2980b9, // 重庆 - 矢车菊蓝
          0x7d3c98, // 天津 - 紫水晶
        ],
        edge: 0xffffff,
        text: 0xffffff,
      },
    };

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
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);

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

    // 创建省的3D网格
    const createProvinceMesh = (feature, center, scale, index) => {
      const color = new THREE.Color(
        CONFIG.colors.base[index % CONFIG.colors.base.length]
      );
      const provinceGroup = new THREE.Group();

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
          depth: CONFIG.extrudeHeight,
          bevelEnabled: true,
          bevelThickness: 100,
          bevelSize: 100,
          bevelSegments: 1,
        };

        const extrudeGeometry = new THREE.ExtrudeGeometry(
          geometry,
          extrudeSettings
        );

        // 创建材质 - 确保完全不透明
        const material = new THREE.MeshLambertMaterial({
          color: color,
          transparent: true, // 禁用透明度
          opacity: 1.0,
        });

        // 创建主网格 - 调整朝向面向用户视角
        const mesh = new THREE.Mesh(extrudeGeometry, material);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.userData = {
          name: feature.properties.name,
          originalPosition: mesh.position.clone(),
          isHovered: false,
        };
        
        // 旋转体块使其面向用户视角（绕X轴旋转-15度）
        mesh.rotation.x = -Math.PI / 3;

        provinceGroup.add(mesh);

        // 添加文字标签 - 与体块放在一起
        const textPosition = lngLatToMercator(
          feature.properties.cp[0],
          feature.properties.cp[1]
        );
        const normalizedText = [
          (textPosition.x - center.x) * scale,
          CONFIG.extrudeHeight + 2000, // 放在体块上方
          (textPosition.y - center.y) * scale,
        ];

        // 使用 CSS2DObject 创建省份名称标签
        const labelDiv = document.createElement('div');
        labelDiv.className = 'province-label';
        labelDiv.textContent = feature.properties.name;
        labelDiv.style.cssText = `
          position: absolute;
          color: #ffffff;
          font-family: Arial, sans-serif;
          font-size: 12px; /* 缩小字号 */
          font-weight: 500; /* 减轻字重 */
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
        
        // 计算体块的中心位置 - 使用mesh的中心点
        const meshBounds = new THREE.Box3().setFromObject(mesh);
        const labelCenter = new THREE.Vector3();
        meshBounds.getCenter(labelCenter);
        
        // 将label放置在体块的几何中心
        label.position.set(
          labelCenter.x,
          labelCenter.y + CONFIG.extrudeHeight / 2, // 体块垂直中心
          labelCenter.z
        );
        provinceGroup.add(label);
        scene.add(provinceGroup);

        provinces.push({
          group: provinceGroup,
          meshes: provinceGroup.children.filter((child) => child.type === "Mesh"),
          name: feature.properties.name,
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

    // 鼠标移动事件
    const onMouseMove = (event) => {
      const rect = container.value.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const allMeshes = provinces.flatMap((p) => p.meshes);
      const intersects = raycaster.intersectObjects(allMeshes);

      // 重置之前悬停的省份
      if (hoveredProvince) {
        hoveredProvince.meshes.forEach((mesh) => {
          if (mesh.userData.isHovered) {
            mesh.position.y = mesh.userData.originalPosition.y;
            mesh.userData.isHovered = false;
          }
        });
        hoveredProvince = null;
      }

      // 处理新的悬停
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const province = provinces.find((p) => p.meshes.includes(mesh));

        if (province) {
          hoveredProvince = province;
          province.meshes.forEach((mesh) => {
            mesh.position.y =
              mesh.userData.originalPosition.y + CONFIG.hoverHeight;
            mesh.userData.isHovered = true;
          });
        }
      }
    };

    // 鼠标离开事件
    const onMouseLeave = () => {
      if (hoveredProvince) {
        hoveredProvince.meshes.forEach((mesh) => {
          mesh.position.y = mesh.userData.originalPosition.y;
          mesh.userData.isHovered = false;
        });
        hoveredProvince = null;
      }
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