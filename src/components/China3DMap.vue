<template>
  <div class="china-3d-wrapper">
    <div ref="container" class="china-3d-container"></div>
    <!-- 控制面板 -->
    <div class="control-panel">
      <div
        v-for="item in dataTypes"
        :key="item.value"
        class="control-item"
      >
        <!-- 光柱按钮左侧显示辉光单选框 -->
        <label
          v-if="item.value === 'pillar'"
          class="glow-checkbox"
          @click.stop
        >
          <input
            type="checkbox"
            v-model="pillarGlowEnabled"
            @change="togglePillarGlow"
          />
          <span class="checkbox-label">辉光</span>
        </label>

        <!-- 飞线按钮左侧显示辉光单选框 -->
        <label
          v-if="item.value === 'flyline'"
          class="glow-checkbox"
          @click.stop
        >
          <input
            type="checkbox"
            v-model="pulseGlowEnabled"
            @change="togglePulseGlow"
          />
          <span class="checkbox-label">辉光</span>
        </label>

        <div
          :class="['control-btn', {
            active: item.value === 'pillar' ? showPillars :
                    item.value === 'label' ? showLabels :
                    item.value === 'flyline' ? showFlylines :
                    showRipples
          }]"
          @click="switchDataType(item.value)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import chinaData from "@/assets/json/china.json";
import chinaBorderData from "@/assets/json/chinaBorder.json";
import {
  coordinatesToMercator,
  calculateBounds,
  normalizeCoordinates,
} from "@/utils/projection";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import FZLISHU_TYPEFACE_URL from "@/assets/fonts/FZLiShu-S01_Regular.json?url";
import FZWEIBEI_TYPEFACE_URL from "@/assets/fonts/FZWeiBei-S03_Regular.json?url";

// 导入新拆分的组件
import Province3D from "./map-features/Province3D.vue";
import LightPillars from "./map-features/LightPillars.vue";
import ProvinceLabels from "./map-features/ProvinceLabels.vue";
import FlyLines from "./map-features/FlyLines.vue";
import Ripples from "./map-features/Ripples.vue";


// 导入配置文件
import { MAP_CONFIG } from "@/config/mapConfig.js";

// 导入工具函数
import { mapUtils } from "@/utils/mapUtils.js";

export default {
  name: "China3DMap",
  components: {
    Province3D,
    LightPillars,
    ProvinceLabels,
    FlyLines,
    Ripples
  },
  setup() {
    const container = ref(null);
    let scene, camera, renderer, composer;
    let provinces = [];
    const animationId = ref(null);
    let bloomPass = null;

    // 射线拾取相关变量
    let raycaster = null;
    let mouse = new THREE.Vector2();
    let hoveredMesh = null;
    let hoveredProvinceName = null;

    // 3D文字标签相关变量
    let currentTextLabel = null;
    let cnFont = null;
    let lastLabelState = { text: "", position: null, baseHeight: 0 };

    // 省级图标和标签相关变量
    let provinceIconsArray = [];
    let provinceLabelsArray = [];
    let provinceDataArray = [];

    // 光柱相关变量
    let lightPillarsArray = [];
    let pillarLabelsArray = [];

    // 飞线相关变量
    let flylinesArray = [];
    let flylineRipplesArray = [];
    let flylinePulsesArray = [];

    // 数据类型切换
    const currentDataType = ref('pillar');
    const dataTypes = ref([
      { label: '光柱', value: 'pillar' },
      { label: '标牌', value: 'label' },
      { label: '飞线', value: 'flyline' },
      { label: '波纹', value: 'ripple' }
    ]);

    // 显示状态控制
    const showPillars = ref(false);
    const showLabels = ref(true);
    const showFlylines = ref(false);
    const showRipples = ref(false);

    // 辉光效果控制
    const pillarGlowEnabled = ref(false);
    const pulseGlowEnabled = ref(false);

    // 波纹相关变量
    let ripplesArray = [];
    let centerRipplesArray = [];
    let centerRippleTimer = null;

    // 字体配置
    const CN_TYPEFACE_CANDIDATES = [
      FZLISHU_TYPEFACE_URL,
      FZWEIBEI_TYPEFACE_URL,
    ];

    // 使用导入的配置
    const LABEL_CONFIG = MAP_CONFIG.LABEL_CONFIG;

    // 使用导入的配置
    const ICON_CONFIG = MAP_CONFIG.ICON_CONFIG;

    // 使用导入的配置
    const PILLAR_CONFIG = MAP_CONFIG.PILLAR_CONFIG;

    // 使用导入的配置
    const FLYLINE_CONFIG = MAP_CONFIG.FLYLINE_CONFIG;

    // 使用导入的配置
    const RIPPLE_CONFIG = MAP_CONFIG.RIPPLE_CONFIG;

    // 使用导入的配置
    const CENTER_RIPPLE_CONFIG = MAP_CONFIG.CENTER_RIPPLE_CONFIG;

    // 初始化场景
    const initScene = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a);

      camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000000);
      const initialPolarAngle = (5 * Math.PI) / 180;
      const distance = 160000;
      camera.position.set(
        0,
        distance * Math.cos(initialPolarAngle),
        distance * Math.sin(initialPolarAngle)
      );
      camera.lookAt(0, 0, 0);
      camera.target = new THREE.Vector3(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = false;
      renderer.setClearColor(0x0a0a0a, 1);
      renderer.sortObjects = true;

      container.value.appendChild(renderer.domElement);

      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width * 0.5, height * 0.5),
        0.5,
        0.2,
        0.88
      );
      composer.addPass(bloomPass);

      const outputPass = new OutputPass();
      composer.addPass(outputPass);

      // 添加光源
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 100000, 50000);
      directionalLight.target.position.set(0, 0, 0);
      scene.add(directionalLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(0, -50000, -30000);
      fillLight.target.position.set(0, 0, 0);
      scene.add(fillLight);

      // 添加背景图
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load("/src/assets/image/home/bg.jpg", (texture) => {
        const aspect = width / height;
        const distance = 1500000;
        const vFov = (camera.fov * Math.PI) / 180;
        const viewHeight = 2 * Math.tan(vFov / 2) * distance;
        const viewWidth = viewHeight * aspect;

        const geometry = new THREE.PlaneGeometry(
          viewWidth * 1.2,
          viewHeight * 1.2
        );
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
        });

        const backgroundPlane = new THREE.Mesh(geometry, material);
        backgroundPlane.renderOrder = -999;
        scene.userData.backgroundPlane = backgroundPlane;
        scene.add(backgroundPlane);
      });

      // 添加旋转精灵图
      textureLoader.load("/src/assets/image/home/bg-ring.png", (texture) => {
        const distance = 1400000;
        const vFov = (camera.fov * Math.PI) / 180;
        const viewHeight = 2 * Math.tan(vFov / 2) * distance;
        const ringSize = viewHeight * 0.6 * 1.8;

        const geometry = new THREE.PlaneGeometry(ringSize, ringSize);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthTest: true,
          depthWrite: false,
        });

        const ringPlane = new THREE.Mesh(geometry, material);
        ringPlane.renderOrder = -998;
        scene.userData.ringPlane = ringPlane;
        scene.add(ringPlane);
      });

      raycaster = new THREE.Raycaster();
      processGeoData();
      addEventListeners();
      setupControls();
      animate();
    };

    // 处理地理数据
    const processGeoData = () => {
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

      const bounds = calculateBounds(allCoords);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const center = { x: centerX, y: centerY };

      const scale =
        200000 / Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

      const textureLoader = new THREE.TextureLoader();
      const chinaTexture = textureLoader.load(
        "/src/assets/image/home/quanGuo.png"
      );

      chinaData.features.forEach((feature) => {
        createProvinceTopMesh(feature, center, scale, bounds, chinaTexture);
      });

      chinaBorderData.features.forEach((feature) => {
        createBorderSideMesh(feature, center, scale);
      });

      createChinaBorderLineAnimation(center, scale);
      createProvinceIconsWithSprite(center, scale);
    };

    // 创建省份顶面网格
    const createProvinceTopMesh = (
      feature,
      center,
      scale,
      bounds,
      chinaTexture
    ) => {
      const provinceGroup = new THREE.Group();
      const provinceName = feature.properties.name;
      const actualExtrudeHeight = 15000;

      let geometries = [];
      let borderCoordinates = [];

      if (feature.geometry.type === "Polygon") {
        geometries = feature.geometry.coordinates.map((polygon) => {
          const coords = coordinatesToMercator(polygon);
          const normalized = normalizeCoordinates(coords, center);
          borderCoordinates.push(normalized);
          return createShapeGeometry(normalized, scale);
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((multi) => {
          multi.forEach((polygon) => {
            const coords = coordinatesToMercator(polygon);
            const normalized = normalizeCoordinates(coords, center);
            borderCoordinates.push(normalized);
            geometries.push(createShapeGeometry(normalized, scale));
          });
        });
      }

      const mapWidth = (bounds.maxX - bounds.minX) * scale;
      const mapHeight = (bounds.maxY - bounds.minY) * scale;

      geometries.forEach((geometry) => {
        const shapeGeometry = new THREE.ShapeGeometry(geometry);

        const positions = shapeGeometry.attributes.position;
        const uvs = new Float32Array(positions.count * 2);

        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          uvs[i * 2] = (x + mapWidth / 2) / mapWidth;
          uvs[i * 2 + 1] = (y + mapHeight / 2) / mapHeight;
        }

        shapeGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

        const topMaterial = new THREE.MeshPhongMaterial({
          map: chinaTexture,
          color: 0xffffff,
          transparent: true,
          opacity: 1,
          depthWrite: true,
          depthTest: true,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(shapeGeometry, topMaterial);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.renderOrder = 2;
        mesh.userData = {
          name: provinceName,
          originalPosition: mesh.position.clone(),
          isHovered: false,
        };

        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = actualExtrudeHeight;

        provinceGroup.add(mesh);
      });

      borderCoordinates.forEach((coordinates) => {
        const positions = [];
        coordinates.forEach((coord) => {
          const x = coord[0] * scale;
          const y = coord[1] * scale;
          positions.push(x, y, 10);
        });

        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(positions);

        const lineMaterial = new LineMaterial({
          color: 0x70b2bd,
          linewidth: 2.2,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          depthTest: false,
        });

        lineMaterial.resolution.set(
          container.value.clientWidth,
          container.value.clientHeight
        );

        const line = new Line2(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        const originalY = actualExtrudeHeight + 10;
        line.position.y = originalY;
        line.renderOrder = 3;

        line.userData = {
          provinceName: provinceName,
          isProvinceBorder: true,
          originalColor: 0x70b2bd,
          originalLinewidth: 2.2,
          originalY: originalY,
        };

        if (!scene.userData.lineMaterials) {
          scene.userData.lineMaterials = [];
        }
        scene.userData.lineMaterials.push(lineMaterial);

        provinceGroup.add(line);
      });

      scene.add(provinceGroup);

      const provinceObj = {
        group: provinceGroup,
        meshes: provinceGroup.children.filter(
          (child) => child.type === "Mesh" && child.geometry
        ),
        name: provinceName,
      };

      provinces.push(provinceObj);
    };

    // 创建国界侧面网格
    const createBorderSideMesh = (feature, center, scale) => {
      const borderGroup = new THREE.Group();
      const borderName = feature.properties.name;

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

      geometries.forEach((geometry) => {
        const extrudeSettings = {
          depth: 15000,
          bevelEnabled: false,
        };

        const extrudeGeometry = new THREE.ExtrudeGeometry(
          geometry,
          extrudeSettings
        );

        const uvAttribute = extrudeGeometry.attributes.uv;
        const positionAttribute = extrudeGeometry.attributes.position;
        const normalAttribute = extrudeGeometry.attributes.normal;

        for (let i = 0; i < positionAttribute.count; i++) {
          const normal = new THREE.Vector3(
            normalAttribute.getX(i),
            normalAttribute.getY(i),
            normalAttribute.getZ(i)
          );

          if (Math.abs(normal.z) < 0.99) {
            const z = positionAttribute.getZ(i);
            const v = z / extrudeSettings.depth;
            uvAttribute.setY(i, v);
          }
        }

        uvAttribute.needsUpdate = true;

        const invisibleMaterial = new THREE.MeshBasicMaterial({
          visible: false,
        });

        const sideMaterial = new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          depthTest: false,
          uniforms: {
            time: { value: 0.0 },
            num: { value: 2.0 },
            color1: { value: new THREE.Color("#00FFFF") },
            brightness: { value: 0.5 },
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
            uniform float brightness;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
              if(vNormal.z == 1.0 || vNormal.z == -1.0) {
                discard;
              }

              float wave = fract(vUv.y + time);
              float bands = fract(wave * num);
              float alpha = (1.0 - bands) * 0.6;
              vec3 finalColor = color1 * brightness;

              gl_FragColor = vec4(finalColor, alpha);
            }`,
        });

        if (!borderGroup.userData.materials) {
          borderGroup.userData.materials = [];
        }
        borderGroup.userData.materials.push(sideMaterial);

        const materials = [invisibleMaterial, sideMaterial];
        const mesh = new THREE.Mesh(extrudeGeometry, materials);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0;

        mesh.userData = {
          name: borderName,
          originalPosition: mesh.position.clone(),
          isBorder: true,
        };

        borderGroup.add(mesh);
      });

      scene.add(borderGroup);

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

    // 创建中国边界线动画
    const createChinaBorderLineAnimation = (center, scale) => {
      const actualExtrudeHeight = 15000;
      const allBorderCoordinates = [];

      chinaBorderData.features.forEach((feature) => {
        const borderName = feature.properties.name;

        if (borderName && borderName.includes("台湾")) {
          return;
        }

        if (feature.geometry.type === "Polygon") {
          feature.geometry.coordinates.forEach((polygon) => {
            const coords = coordinatesToMercator(polygon);
            const normalized = normalizeCoordinates(coords, center);
            allBorderCoordinates.push(normalized);
          });
        } else if (feature.geometry.type === "MultiPolygon") {
          feature.geometry.coordinates.forEach((multi) => {
            multi.forEach((polygon) => {
              const coords = coordinatesToMercator(polygon);
              const normalized = normalizeCoordinates(coords, center);
              allBorderCoordinates.push(normalized);
            });
          });
        }
      });

      const borderLines = [];

      allBorderCoordinates.forEach((coordinates) => {
        const fullPositions = [];
        coordinates.forEach((coord) => {
          const x = coord[0] * scale;
          const y = coord[1] * scale;
          fullPositions.push(x, y, 15);
        });

        if (fullPositions.length < 6) {
          return;
        }

        const totalPoints = fullPositions.length / 3;
        const halfPoints = Math.floor(totalPoints / 3);

        const lineGeometry = new LineGeometry();
        const initialPositions = fullPositions.slice(0, halfPoints * 3);
        lineGeometry.setPositions(initialPositions);

        const lineMaterial = new LineMaterial({
          color: 0xe0f7fa,
          linewidth: 3,
          transparent: true,
          opacity: 1.0,
          depthWrite: false,
          depthTest: false,
        });

        lineMaterial.resolution.set(
          container.value.clientWidth,
          container.value.clientHeight
        );

        const line = new Line2(lineGeometry, lineMaterial);
        line.computeLineDistances();

        line.rotation.x = -Math.PI / 2;
        line.position.y = actualExtrudeHeight + 15;
        line.renderOrder = 4;

        scene.add(line);

        borderLines.push({
          line,
          geometry: lineGeometry,
          material: lineMaterial,
          fullPositions,
          totalPoints,
          halfPoints,
          startIndex: 0,
        });

        if (!scene.userData.lineMaterials) {
          scene.userData.lineMaterials = [];
        }
        scene.userData.lineMaterials.push(lineMaterial);
      });

      scene.userData.borderLines = borderLines;
    };

    // 创建省级图标和标签
    const createProvinceIconsWithSprite = (center, scale) => {
      provinceDataArray = [];
      provinceIconsArray = [];

      chinaData.features.forEach((feature) => {
        const provinceName = feature.properties.name;
        const provinceData = generateProvinceData();
        const provinceCenter = calculateProvinceCenterFromGeometry(
          feature.geometry,
          center,
          scale
        );

        provinceDataArray.push({
          name: provinceName,
          data: provinceData,
          position: provinceCenter,
        });
      });

      const textureLoader = new THREE.TextureLoader();
      const iconImageUrl = "/src/assets/image/home/icon.png";

      textureLoader.load(
        iconImageUrl,
        (texture) => {
          provinceDataArray.forEach((province) => {
            const spriteMaterial = new THREE.SpriteMaterial({
              map: texture,
              transparent: true,
              opacity: 1,
              depthTest: false,
              depthWrite: false,
              color: new THREE.Color(1, 1, 1),
              blending: THREE.NormalBlending,
            });

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(ICON_CONFIG.iconSize, ICON_CONFIG.iconSize, 1);
            sprite.position.copy(province.position);
            sprite.renderOrder = 100;
            sprite.visible = showLabels.value;

            scene.add(sprite);
            provinceIconsArray.push(sprite);
          });

          createProvinceLabels();
          createLightPillars();
        },
        undefined,
        (error) => {
          console.error("图标纹理加载失败:", error);
        }
      );
    };

    // 创建省级标签
    const createProvinceLabels = () => {
      provinceDataArray.forEach((province) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = 1024;
        canvas.height = 512;

        context.clearRect(0, 0, canvas.width, canvas.height);

        const fontSize = 80;
        context.font = `bold ${fontSize}px Arial, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";

        const provinceName = province.name;
        const provinceValue = province.data;
        const separator = ": ";

        const nameMetrics = context.measureText(provinceName);
        const separatorMetrics = context.measureText(separator);
        const valueMetrics = context.measureText(provinceValue);

        const totalWidth =
          nameMetrics.width + separatorMetrics.width + valueMetrics.width;
        const textHeight = fontSize;

        const padding = ICON_CONFIG.labelPadding / 10;
        const bgWidth = totalWidth + padding * 2;
        const bgHeight = textHeight + padding * 2;
        const bgX = (canvas.width - bgWidth) / 2;
        const bgY = (canvas.height - bgHeight) / 2;
        const borderRadius = ICON_CONFIG.labelBorderRadius / 10;

        context.fillStyle = ICON_CONFIG.labelBgColor;
        context.beginPath();
        context.moveTo(bgX + borderRadius, bgY);
        context.lineTo(bgX + bgWidth - borderRadius, bgY);
        context.quadraticCurveTo(
          bgX + bgWidth,
          bgY,
          bgX + bgWidth,
          bgY + borderRadius
        );
        context.lineTo(bgX + bgWidth, bgY + bgHeight - borderRadius);
        context.quadraticCurveTo(
          bgX + bgWidth,
          bgY + bgHeight,
          bgX + bgWidth - borderRadius,
          bgY + bgHeight
        );
        context.lineTo(bgX + borderRadius, bgY + bgHeight);
        context.quadraticCurveTo(
          bgX,
          bgY + bgHeight,
          bgX,
          bgY + bgHeight - borderRadius
        );
        context.lineTo(bgX, bgY + borderRadius);
        context.quadraticCurveTo(bgX, bgY, bgX + borderRadius, bgY);
        context.closePath();
        context.fill();

        const centerY = canvas.height / 2;
        const startX = (canvas.width - totalWidth) / 2;

        context.fillStyle = "#ffffff";
        context.textAlign = "left";
        context.fillText(provinceName, startX, centerY);

        const separatorX = startX + nameMetrics.width;
        context.fillText(separator, separatorX, centerY);

        context.fillStyle = "#e6d700";
        const valueX = separatorX + separatorMetrics.width;
        context.fillText(provinceValue, valueX, centerY);

        const labelTexture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
          opacity: 0.85,
          depthTest: true,
          depthWrite: true,
        });

        const labelSprite = new THREE.Sprite(labelMaterial);
        labelSprite.scale.set(
          ICON_CONFIG.labelFontSize * 3,
          ICON_CONFIG.labelFontSize * 1.5,
          1
        );
        labelSprite.position.set(
          province.position.x,
          province.position.y + ICON_CONFIG.labelOffsetY,
          province.position.z
        );
        labelSprite.renderOrder = 101;
        labelSprite.visible = showLabels.value;

        labelSprite.userData = {
          provinceName: province.name,
          isProvinceLabel: true,
        };

        scene.add(labelSprite);
        provinceLabelsArray.push(labelSprite);
      });
    };

    // 生成省级数据
    const generateProvinceData = () => {
      return Math.floor(Math.random() * 9900) + 100;
    };

    // 计算省份中心点
    const calculateProvinceCenterFromGeometry = (geometry, center, scale) => {
      let totalX = 0;
      let totalY = 0;
      let totalPoints = 0;

      const processCoordinates = (coords) => {
        coords.forEach((coord) => {
          const mercatorCoords = coordinatesToMercator([coord]);
          const normalized = normalizeCoordinates(mercatorCoords, center);
          normalized.forEach((point) => {
            totalX += point[0] * scale;
            totalY += point[1] * scale;
            totalPoints++;
          });
        });
      };

      if (geometry.type === "Polygon") {
        geometry.coordinates.forEach((polygon) => {
          processCoordinates(polygon);
        });
      } else if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach((multi) => {
          multi.forEach((polygon) => {
            processCoordinates(polygon);
          });
        });
      }

      if (totalPoints > 0) {
        return new THREE.Vector3(
          totalX / totalPoints,
          ICON_CONFIG.iconHeight,
          -(totalY / totalPoints)
        );
      }

      return new THREE.Vector3(0, ICON_CONFIG.iconHeight, 0);
    };

    // 创建3D文字标签
    const create3DTextLabel = (text, position, baseHeight) => {
      if (currentTextLabel) {
        scene.remove(currentTextLabel);

        if (currentTextLabel.dispose) {
          currentTextLabel.dispose();
        } else {
          if (currentTextLabel.geometry) currentTextLabel.geometry.dispose();
          if (currentTextLabel.material) {
            if (Array.isArray(currentTextLabel.material))
              currentTextLabel.material.forEach((m) => m.dispose());
            else currentTextLabel.material.dispose();
          }
        }
        currentTextLabel = null;
      }

      lastLabelState = {
        text,
        position: position && position.clone ? position.clone() : position,
        baseHeight,
      };

      if (!cnFont) {
        return;
      }

      const geometry = new TextGeometry(text, {
        font: cnFont,
        size: LABEL_CONFIG.fontSize,
        height: LABEL_CONFIG.textDepth,
        curveSegments: 12,
        bevelEnabled: LABEL_CONFIG.bevelEnabled,
        bevelThickness: LABEL_CONFIG.bevelThickness,
        bevelSize: LABEL_CONFIG.bevelSize,
        bevelSegments: 5,
      });
      geometry.computeBoundingBox();
      const centerOffset =
        -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

      const materials = [
        new THREE.MeshPhongMaterial({
          color: LABEL_CONFIG.textColor,
          flatShading: true,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 1.0,
          emissive: LABEL_CONFIG.textColor,
          emissiveIntensity: LABEL_CONFIG.emissiveIntensity,
          depthTest: false,
          depthWrite: false,
        }),
        new THREE.MeshPhongMaterial({
          color: LABEL_CONFIG.outlineColor,
          transparent: true,
          opacity: 1.0,
          emissive: LABEL_CONFIG.outlineColor,
          emissiveIntensity: LABEL_CONFIG.emissiveIntensity * 0.5,
          depthTest: false,
          depthWrite: false,
        }),
      ];

      const textMesh = new THREE.Mesh(geometry, materials);
      textMesh.position.set(
        position.x + centerOffset,
        baseHeight + LABEL_CONFIG.floatHeight,
        position.z
      );
      textMesh.rotation.set(0, 0, 0);
      textMesh.renderOrder = 999;
      textMesh.userData = {
        baseY: baseHeight + LABEL_CONFIG.floatHeight,
        floatOffset: 0,
        renderer: "textgeometry",
      };
      scene.add(textMesh);
      currentTextLabel = textMesh;
    };

    // 计算省份中心
    const calculateProvinceCenter = (province) => {
      if (!province || !province.meshes || province.meshes.length === 0) {
        return new THREE.Vector3(0, 0, 0);
      }

      let totalVertices = 0;
      const center = new THREE.Vector3(0, 0, 0);

      province.meshes.forEach((mesh) => {
        const geometry = mesh.geometry;
        const positionAttribute = geometry.attributes.position;

        if (!positionAttribute) return;

        const vertexCount = positionAttribute.count;

        for (let i = 0; i < vertexCount; i++) {
          const vertex = new THREE.Vector3(
            positionAttribute.getX(i),
            positionAttribute.getY(i),
            positionAttribute.getZ(i)
          );

          vertex.applyMatrix4(mesh.matrixWorld);

          center.x += vertex.x;
          center.y += vertex.y;
          center.z += vertex.z;
          totalVertices++;
        }
      });

      if (totalVertices > 0) {
        center.x /= totalVertices;
        center.y /= totalVertices;
        center.z /= totalVertices;
      }

      return center;
    };

    // 根据数据值获取颜色
    const getColorByValue = (value) => {
      return mapUtils.getColorByValue(value, PILLAR_CONFIG.colorRanges);
    };

    // 格式化数据值
    const formatDataValue = (value) => {
      return mapUtils.formatDataValue(value);
    };

    // 创建光柱
    const createLightPillars = () => {
      lightPillarsArray.forEach(pillar => {
        scene.remove(pillar);
        if (pillar.geometry) pillar.geometry.dispose();
        if (pillar.material) pillar.material.dispose();
      });
      pillarLabelsArray.forEach(label => {
        scene.remove(label);
        if (label.material && label.material.map) {
          label.material.map.dispose();
        }
        if (label.material) label.material.dispose();
      });
      lightPillarsArray = [];
      pillarLabelsArray = [];

      provinceDataArray.forEach((province) => {
        const dataValue = province.data;
        const heightRatio = Math.min(dataValue / 10000, 1);
        const pillarHeight = PILLAR_CONFIG.minHeight +
          (PILLAR_CONFIG.maxHeight - PILLAR_CONFIG.minHeight) * heightRatio;

        const color = getColorByValue(dataValue);
        const colorObj = new THREE.Color(color);

        const geometry = new THREE.CylinderGeometry(
          PILLAR_CONFIG.radius,
          PILLAR_CONFIG.radius,
          pillarHeight,
          PILLAR_CONFIG.segments
        );

        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthTest: false,
          depthWrite: false,
          uniforms: {
            color: { value: colorObj },
            pillarHeight: { value: pillarHeight },
            glowEnabled: { value: pillarGlowEnabled.value ? 1.0 : 0.0 } // 使用三元运算符设置辉光开关
          },
          vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;

            void main() {
              vPosition = position;
              vNormal = normal;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            uniform float pillarHeight;
            uniform float glowEnabled;
            varying vec3 vPosition;
            varying vec3 vNormal;

            void main() {
              float normalizedY = (vPosition.y + pillarHeight * 0.5) / pillarHeight;
              float alpha = 0.1 + normalizedY * 0.8;

              vec3 finalColor = color * 1.5;
              if (glowEnabled > 0.5) {
                float heightNormalized = pillarHeight / 30.0;
                heightNormalized = clamp(heightNormalized, 0.0, 1.0);
                float heightFactor = sqrt(heightNormalized);
                float glowIntensity = 1.6 + heightFactor * 0.4;
                float verticalGlow = 0.8 + normalizedY * 0.2;
                finalColor = color * glowIntensity * verticalGlow;
              }

              gl_FragColor = vec4(finalColor, alpha);
            }
          `
        });

        const pillar = new THREE.Mesh(geometry, material);
        const baseY = PILLAR_CONFIG.baseHeight;
        pillar.position.set(
          province.position.x,
          baseY + pillarHeight / 2,
          province.position.z
        );
        pillar.renderOrder = 999;
        pillar.visible = showPillars.value;

        pillar.userData = {
          provinceName: province.name,
          isLightPillar: true,
          dataValue: dataValue,
          pillarHeight: pillarHeight
        };

        scene.add(pillar);
        lightPillarsArray.push(pillar);

        const labelText = dataValue;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 512;

        const fontSize = 80;
        context.font = `bold ${fontSize}px Arial, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#ffffff';
        context.fillText(labelText, canvas.width / 2, canvas.height / 2);

        const labelTexture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
          opacity: 1,
          depthTest: false,
          depthWrite: false,
        });

        const labelSprite = new THREE.Sprite(labelMaterial);
        labelSprite.scale.set(
          PILLAR_CONFIG.labelFontSize * 4,
          PILLAR_CONFIG.labelFontSize * 2,
          1
        );
        labelSprite.position.set(
          province.position.x,
          baseY + pillarHeight + PILLAR_CONFIG.labelOffsetY,
          province.position.z
        );
        labelSprite.renderOrder = 1000;
        labelSprite.visible = showPillars.value;

        labelSprite.userData = {
          provinceName: province.name,
          isPillarLabel: true,
        };

        scene.add(labelSprite);
        pillarLabelsArray.push(labelSprite);
      });
    };

    // 创建飞线
    const createFlylines = () => {
      flylinesArray.forEach(flyline => {
        if (flyline.geometry) flyline.geometry.dispose();
        if (flyline.material) flyline.material.dispose();
        scene.remove(flyline);
      });
      flylineRipplesArray.forEach(ripple => {
        if (ripple.geometry) ripple.geometry.dispose();
        if (ripple.material) ripple.material.dispose();
        scene.remove(ripple);
      });
      flylinePulsesArray.forEach(pulse => {
        if (pulse.geometry) pulse.geometry.dispose();
        if (pulse.material) pulse.material.dispose();
        scene.remove(pulse);
      });
      flylinesArray = [];
      flylineRipplesArray = [];
      flylinePulsesArray = [];

      const beijing = provinceDataArray.find(p => p.name === '北京' || p.name === '北京市');
      if (!beijing) {
        console.warn('未找到北京数据');
        return;
      }

      const startPos = new THREE.Vector3(
        beijing.position.x,
        beijing.position.y + 1000,
        beijing.position.z
      );

      provinceDataArray.forEach(province => {
        if (province.name === '北京' || province.name === '北京市') {
          return;
        }

        const endPos = new THREE.Vector3(
          province.position.x,
          province.position.y + 1000,
          province.position.z
        );

        const midPoint = new THREE.Vector3(
          (startPos.x + endPos.x) / 2,
          Math.max(startPos.y, endPos.y) + FLYLINE_CONFIG.curveHeight,
          (startPos.z + endPos.z) / 2
        );

        const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineBasicMaterial({
          color: FLYLINE_CONFIG.color,
          transparent: true,
          opacity: 0.3,
          depthTest: false,
        });

        const line = new THREE.Line(geometry, material);
        line.renderOrder = 998;
        line.visible = showFlylines.value;
        line.userData = {
          isFlyline: true,
          curve: curve,
          startTime: Math.random() * 2,
        };

        scene.add(line);
        flylinesArray.push(line);

        createPulse(curve, line.userData.startTime);
        createFlylineRipples(endPos);
      });
    };

    // 创建脉冲
    const createPulse = (curve, startTime) => {
      const radiusFunction = (t) => {
        const intensity = Math.pow(t, 0.4);
        const radius = FLYLINE_CONFIG.pulseTailRadius +
                      (FLYLINE_CONFIG.pulseHeadRadius - FLYLINE_CONFIG.pulseTailRadius) * intensity;
        return radius;
      };

      const pulseSegments = 20;
      const tempPoints = curve.getPoints(100);
      const pulseStartIndex = 0;
      const pulseEndIndex = Math.floor(tempPoints.length * FLYLINE_CONFIG.pulseLength);
      const pulsePoints = tempPoints.slice(pulseStartIndex, pulseEndIndex);

      const pulsePath = new THREE.CatmullRomCurve3(pulsePoints);

      const tubeGeometry = new THREE.TubeGeometry(
        pulsePath,
        pulseSegments,
        1,
        FLYLINE_CONFIG.pulseTubeSegments,
        false
      );

      const positions = tubeGeometry.attributes.position;
      const normals = tubeGeometry.attributes.normal;

      for (let i = 0; i < positions.count; i++) {
        const segmentIndex = Math.floor(i / (FLYLINE_CONFIG.pulseTubeSegments + 1));
        const t = segmentIndex / pulseSegments;
        const radius = radiusFunction(t);

        const nx = normals.getX(i);
        const ny = normals.getY(i);
        const nz = normals.getZ(i);

        const centerPoint = pulsePath.getPoint(t);

        positions.setX(i, centerPoint.x + nx * radius);
        positions.setY(i, centerPoint.y + ny * radius);
        positions.setZ(i, centerPoint.z + nz * radius);
      }

      positions.needsUpdate = true;

      const pulseMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide,
        uniforms: {
          color: { value: new THREE.Color(FLYLINE_CONFIG.pulseColor) },
          glowEnabled: { value: pulseGlowEnabled.value ? 1.0 : 0.0 }, // 使用三元运算符设置辉光开关
        },
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float glowEnabled;
          varying vec2 vUv;

          void main() {
            float alpha = 0.3 + vUv.x * 0.7;
            float radialFade = 1.0 - abs(vUv.y - 0.5) * 2.0;
            alpha *= radialFade * 0.8 + 0.2;

            vec3 finalColor = color;
            if (glowEnabled > 0.5) {
              finalColor = color * 2.5;
            }

            gl_FragColor = vec4(finalColor, alpha);
          }
        `
      });

      const pulseMesh = new THREE.Mesh(tubeGeometry, pulseMaterial);
      pulseMesh.renderOrder = 999;
      pulseMesh.visible = showFlylines.value;
      pulseMesh.userData = {
        isPulse: true,
        curve: curve,
        pulsePath: pulsePath,
        startTime: startTime,
        progress: 0,
      };

      scene.add(pulseMesh);
      flylinePulsesArray.push(pulseMesh);
    };

    // 创建飞线波纹
    const createFlylineRipples = (position) => {
      for (let i = 0; i < FLYLINE_CONFIG.rippleCount; i++) {
        const geometry = new THREE.RingGeometry(500, 8000, 32);
        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthTest: false,
          side: THREE.DoubleSide,
          uniforms: {
            color: { value: new THREE.Color(FLYLINE_CONFIG.rippleColor) },
            time: { value: 0 },
            maxRadius: { value: FLYLINE_CONFIG.rippleMaxRadius },
            offset: { value: i * FLYLINE_CONFIG.rippleInterval },
          },
          vertexShader: `
            varying vec2 vUv;

            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            uniform float time;
            uniform float maxRadius;
            uniform float offset;
            varying vec2 vUv;

            void main() {
              float progress = mod(time + offset, 1.0);
              vec2 center = vec2(0.5, 0.5);
              float dist = distance(vUv, center) * 2.0;
              float ring = abs(dist - progress);
              float alpha = 1.0 - ring * 10.0;
              alpha *= (1.0 - progress);
              alpha = clamp(alpha, 0.0, 0.8);

              gl_FragColor = vec4(color, alpha);
            }
          `
        });

        const ripple = new THREE.Mesh(geometry, material);
        ripple.position.set(position.x, position.y, position.z);
        ripple.rotation.x = -Math.PI / 2;
        ripple.renderOrder = 997;
        ripple.visible = showFlylines.value;
        ripple.userData = {
          isRipple: true,
        };

        scene.add(ripple);
        flylineRipplesArray.push(ripple);
      }
    };

    // 加载中文字体
    const loadChineseTypeface = () => {
      const loader = new FontLoader();
      let idx = 0;
      const tryLoad = () => {
        if (idx >= CN_TYPEFACE_CANDIDATES.length) {
          console.warn("⚠️ 未找到可用的中文 typeface.json");
          return;
        }
        const url = CN_TYPEFACE_CANDIDATES[idx];
        loader.load(
          url,
          (loaded) => {
            cnFont = loaded;

            try {
              if (lastLabelState?.text && lastLabelState.position) {
                create3DTextLabel(
                  lastLabelState.text,
                  lastLabelState.position,
                  lastLabelState.baseHeight
                );
              }
            } catch (e) {
              console.warn("⚠️ 切换为TextGeometry失败（加载后重建）:", e);
            }
          },
          undefined,
          () => {
            idx++;
            tryLoad();
          }
        );
      };
      tryLoad();
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

      if (intersects.length > 0) {
        const mesh = intersects[0].object;

        if (hoveredMesh !== mesh) {
          restoreBorderLineStyle();
          hoveredMesh = mesh;
          const provinceName = mesh.userData.name;
          hoveredProvinceName = provinceName;
          setBorderLineHoverStyle(provinceName);

          const province = provinces.find((p) => p.name === provinceName);
          const provinceCenter = calculateProvinceCenter(province);
          const baseHeight = 15000;
          create3DTextLabel(provinceName, provinceCenter, baseHeight);
        }
      } else {
        restoreBorderLineStyle();
        hoveredMesh = null;
        hoveredProvinceName = null;

        if (currentTextLabel) {
          scene.remove(currentTextLabel);
          if (currentTextLabel.dispose) {
            currentTextLabel.dispose();
          }
          currentTextLabel = null;
        }
      }
    };

    // 鼠标离开事件
    const onMouseLeave = () => {
      restoreBorderLineStyle();
      hoveredMesh = null;
      hoveredProvinceName = null;

      if (currentTextLabel) {
        scene.remove(currentTextLabel);
        if (currentTextLabel.dispose) {
          currentTextLabel.dispose();
        }
        currentTextLabel = null;
      }
    };

    // 设置边界线悬停样式
    const setBorderLineHoverStyle = (provinceName) => {
      provinces.forEach((province) => {
        if (province.name === provinceName) {
          province.group.children.forEach((child) => {
            if (child.userData.isProvinceBorder) {
              child.material.color.setHex(0x94e7f5);
              child.material.linewidth = 4;
              child.renderOrder = 10;
              child.position.y = child.userData.originalY + 20;
            }
          });
        }
      });
    };

    // 恢复边界线样式
    const restoreBorderLineStyle = () => {
      if (hoveredProvinceName) {
        provinces.forEach((province) => {
          if (province.name === hoveredProvinceName) {
            province.group.children.forEach((child) => {
              if (child.userData.isProvinceBorder) {
                child.material.color.setHex(child.userData.originalColor);
                child.material.linewidth = child.userData.originalLinewidth;
                child.renderOrder = 3;
                child.position.y = child.userData.originalY;
              }
            });
          }
        });
      }
    };

    // 窗口大小调整
    const onWindowResize = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);

      const bloomPass = composer.passes.find(
        (pass) => pass instanceof UnrealBloomPass
      );
      if (bloomPass) {
        bloomPass.resolution.set(width, height);
      }

      if (scene.userData.lineMaterials) {
        scene.userData.lineMaterials.forEach((material) => {
          material.resolution.set(width, height);
        });
      }

      if (scene.userData.backgroundPlane) {
        const aspect = width / height;
        const distance = 1500000;
        const vFov = (camera.fov * Math.PI) / 180;
        const viewHeight = 2 * Math.tan(vFov / 2) * distance;
        const viewWidth = viewHeight * aspect;

        scene.userData.backgroundPlane.geometry.dispose();
        scene.userData.backgroundPlane.geometry = new THREE.PlaneGeometry(
          viewWidth * 1.2,
          viewHeight * 1.2
        );
      }
    };

    // 设置控制器
    let controls;
    const setupControls = () => {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.screenSpacePanning = true;
      controls.minDistance = 10000;
      controls.maxDistance = 200000;
      controls.maxPanDistance = 50000;
      controls.panSpeed = 1.0;
      controls.rotateSpeed = 0.3;
      controls.minPolarAngle = (0.5 * Math.PI) / 180;
      controls.maxPolarAngle = (60 * Math.PI) / 180;
      controls.target.set(0, 0, 0);
    };

    // 创建中心波纹
    const createCenterRipple = (height = CENTER_RIPPLE_CONFIG.heightOffset) => {
      const position = new THREE.Vector3(0, 0, 0);
      const out_radius = 5000

      const geometry = new THREE.RingGeometry(
        CENTER_RIPPLE_CONFIG.initialRadius,
        CENTER_RIPPLE_CONFIG.initialRadius + out_radius,
        CENTER_RIPPLE_CONFIG.segments
      );

      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          color: { value: new THREE.Color(CENTER_RIPPLE_CONFIG.color) },
          baseOpacity: { value: CENTER_RIPPLE_CONFIG.initialOpacity },
          time: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float baseOpacity;
          uniform float time;
          varying vec2 vUv;
          
          void main() {
            float gradient = vUv.y;
            float radialOpacity = pow(1.0 - gradient, 2.0);
            float flicker = 0.95 + 0.05 * sin(time * 2.0);
            float finalOpacity = baseOpacity * radialOpacity * flicker;
            finalOpacity = max(finalOpacity, 0.02);
            
            gl_FragColor = vec4(color, finalOpacity);
          }
        `
      });

      const ripple = new THREE.Mesh(geometry, material);
      ripple.position.set(position.x, height, position.z);
      ripple.rotation.x = -Math.PI / 2;

      ripple.userData = {
        radius: CENTER_RIPPLE_CONFIG.initialRadius,
        opacity: CENTER_RIPPLE_CONFIG.initialOpacity,
        active: true,
        type: 'center',
        startTime: Date.now(),
        outRadius: out_radius,
        time: 0
      };

      centerRipplesArray.push(ripple);
      scene.add(ripple);
    };

    // 创建中心波纹定时器
    const createCenterRippleAtInterval = () => {
      createCenterRipple();
    };

    // 启动中心波纹定时器
    const startCenterRippleTimer = () => {
      if (centerRippleTimer) {
        clearInterval(centerRippleTimer);
      }

      centerRippleTimer = setInterval(() => {
        createCenterRippleAtInterval();
      }, CENTER_RIPPLE_CONFIG.interval);
    };

    // 停止中心波纹定时器
    const stopCenterRippleTimer = () => {
      if (centerRippleTimer) {
        clearInterval(centerRippleTimer);
        centerRippleTimer = null;
      }
    };

    // 创建默认波纹
    const createDefaultRipples = () => {
      const geometry = new THREE.RingGeometry(
        RIPPLE_CONFIG.initialRadius,
        RIPPLE_CONFIG.initialRadius + 400,
        RIPPLE_CONFIG.segments
      );

      for (let i = 0; i < 5; i++) {
        const material = new THREE.MeshBasicMaterial({
          color: RIPPLE_CONFIG.color,
          transparent: true,
          opacity: RIPPLE_CONFIG.initialOpacity * (1 - i * 0.2),
          side: THREE.DoubleSide,
        });

        const ripple = new THREE.Mesh(geometry.clone(), material);
        ripple.userData = {
          radius: RIPPLE_CONFIG.initialRadius,
          opacity: RIPPLE_CONFIG.initialOpacity * (1 - i * 0.2),
          phase: i * 0.2,
          active: false,
        };

        ripple.position.set(0, 0, 0);
        ripple.rotation.x = -Math.PI / 2;
        ripple.visible = false;
        ripple.renderOrder = 10;

        ripplesArray.push(ripple);
        scene.add(ripple);
      }
    };

    // 动画循环
    let lastTime = Date.now();
    const animate = () => {
      animationId.value = requestAnimationFrame(animate);
      
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      const deltaSeconds = deltaTime / 1000;
      
      centerRipplesArray.forEach(ripple => {
        if (ripple.userData.active) {
          ripple.userData.radius += CENTER_RIPPLE_CONFIG.expansionSpeed * deltaSeconds;
          ripple.userData.time += deltaSeconds;
          if (ripple.material.uniforms.time) {
            ripple.material.uniforms.time.value = ripple.userData.time;
          }

          const innerRadius = ripple.userData.radius;
          const outerRadius = ripple.userData.radius + ripple.userData.outRadius;

          if (ripple.userData.radius > CENTER_RIPPLE_CONFIG.maxRadius) {
            ripple.userData.active = false;
            ripple.visible = false;
          } else {
            const newGeometry = new THREE.RingGeometry(
              innerRadius,
              outerRadius,
              CENTER_RIPPLE_CONFIG.segments
            );

            if (ripple.geometry) {
              ripple.geometry.dispose();
            }
            ripple.geometry = newGeometry;
          }
        }
      });

      centerRipplesArray = centerRipplesArray.filter(ripple => {
        if (!ripple.userData.active) {
          if (ripple.geometry) ripple.geometry.dispose();
          if (ripple.material) ripple.material.dispose();
          if (ripple.parent) ripple.parent.remove(ripple);
          return false;
        }
        return true;
      });

      if (controls) {
        controls.update();
        const targetDistance = controls.target.length();
        if (targetDistance > controls.maxPanDistance) {
          controls.target.normalize().multiplyScalar(controls.maxPanDistance);
        }
      }

      if (scene.userData.backgroundPlane) {
        const backgroundPlane = scene.userData.backgroundPlane;
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        const distance = 1500000;
        backgroundPlane.position
          .copy(camera.position)
          .add(cameraDirection.multiplyScalar(distance));
        backgroundPlane.lookAt(camera.position);
      }

      if (scene.userData.ringPlane) {
        const ringPlane = scene.userData.ringPlane;

        if (ringPlane.userData.rotationAngle === undefined) {
          ringPlane.userData.rotationAngle = 0;
        }

        ringPlane.userData.rotationAngle -= 0.01;

        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        const distance = 1400000;
        ringPlane.position
          .copy(camera.position)
          .add(cameraDirection.multiplyScalar(distance));

        const quaternion = new THREE.Quaternion();
        const matrix = new THREE.Matrix4();
        matrix.lookAt(ringPlane.position, camera.position, camera.up);
        quaternion.setFromRotationMatrix(matrix);

        const rotationQuaternion = new THREE.Quaternion();
        rotationQuaternion.setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          ringPlane.userData.rotationAngle
        );

        ringPlane.quaternion.copy(quaternion).multiply(rotationQuaternion);
      }

      if (scene.userData.borderGroups) {
        scene.userData.borderGroups.forEach((borderGroup) => {
          if (borderGroup.userData.materials) {
            borderGroup.userData.materials.forEach((material) => {
              if (material.uniforms && material.uniforms.time) {
                material.uniforms.time.value += 0.005;
              }
            });
          }
        });
      }

      if (scene.userData.borderLines) {
        if (!scene.userData.borderLineFrameCount) {
          scene.userData.borderLineFrameCount = 0;
        }

        scene.userData.borderLineFrameCount++;
        if (scene.userData.borderLineFrameCount % 3 === 0) {
          scene.userData.borderLines.forEach((borderLine) => {
            borderLine.startIndex += 2;

            if (borderLine.startIndex >= borderLine.totalPoints) {
              borderLine.startIndex = 0;
            }

            const currentPositions = [];

            for (let i = 0; i < borderLine.halfPoints; i++) {
              const pointIndex =
                (borderLine.startIndex + i) % borderLine.totalPoints;
              const posIndex = pointIndex * 3;

              currentPositions.push(
                borderLine.fullPositions[posIndex],
                borderLine.fullPositions[posIndex + 1],
                borderLine.fullPositions[posIndex + 2]
              );
            }

            borderLine.geometry.setPositions(currentPositions);
            borderLine.line.computeLineDistances();

            if (borderLine.geometry.attributes.instanceStart) {
              borderLine.geometry.attributes.instanceStart.needsUpdate = true;
              borderLine.geometry.attributes.instanceEnd.needsUpdate = true;
            }
          });
        }
      }

      if (currentTextLabel && currentTextLabel.userData) {
        currentTextLabel.userData.floatOffset += LABEL_CONFIG.floatSpeed;
        const floatY =
          Math.sin(currentTextLabel.userData.floatOffset) *
          LABEL_CONFIG.floatRange;
        currentTextLabel.position.y = currentTextLabel.userData.baseY + floatY;

        if (camera) {
          currentTextLabel.quaternion.copy(camera.quaternion);
        }
      }

      flylinePulsesArray.forEach(pulse => {
        if (!pulse.userData) return;

        pulse.userData.progress += FLYLINE_CONFIG.pulseSpeed;

        if (pulse.userData.progress > 1) {
          pulse.userData.progress = 0;
        }

        const curve = pulse.userData.curve;
        if (curve) {
          const progress = (pulse.userData.progress + pulse.userData.startTime) % 1;
          const pulseLength = FLYLINE_CONFIG.pulseLength;
          const startProgress = Math.max(0, progress - pulseLength);
          const endProgress = progress;

          const pulsePoints = [];
          const segments = 20;
          for (let i = 0; i <= segments; i++) {
            const t = startProgress + (endProgress - startProgress) * (i / segments);
            pulsePoints.push(curve.getPoint(t));
          }

          if (pulsePoints.length > 1) {
            const newPulsePath = new THREE.CatmullRomCurve3(pulsePoints);

            const radiusFunction = (t) => {
              const intensity = Math.pow(t, 0.4);
              return FLYLINE_CONFIG.pulseTailRadius +
                     (FLYLINE_CONFIG.pulseHeadRadius - FLYLINE_CONFIG.pulseTailRadius) * intensity;
            };

            const newTubeGeometry = new THREE.TubeGeometry(
              newPulsePath,
              segments,
              1,
              FLYLINE_CONFIG.pulseTubeSegments,
              false
            );

            const positions = newTubeGeometry.attributes.position;
            const normals = newTubeGeometry.attributes.normal;

            for (let i = 0; i < positions.count; i++) {
              const segmentIndex = Math.floor(i / (FLYLINE_CONFIG.pulseTubeSegments + 1));
              const t = segmentIndex / segments;
              const radius = radiusFunction(t);

              const nx = normals.getX(i);
              const ny = normals.getY(i);
              const nz = normals.getZ(i);

              const centerPoint = newPulsePath.getPoint(t);

              positions.setX(i, centerPoint.x + nx * radius);
              positions.setY(i, centerPoint.y + ny * radius);
              positions.setZ(i, centerPoint.z + nz * radius);
            }

            positions.needsUpdate = true;

            if (pulse.geometry) {
              pulse.geometry.dispose();
            }
            pulse.geometry = newTubeGeometry;
          }
        }
      });

      flylineRipplesArray.forEach(ripple => {
        if (ripple.material && ripple.material.uniforms && ripple.material.uniforms.time) {
          ripple.material.uniforms.time.value += FLYLINE_CONFIG.rippleSpeed;
        }
      });

      composer.render();
    };

    // 清理资源
    const cleanup = () => {
      if (animationId.value) {
        cancelAnimationFrame(animationId.value);
      }

      if (controls) {
        controls.dispose();
      }

      if (container.value) {
        container.value.removeEventListener("mousemove", onMouseMove);
        container.value.removeEventListener("mouseleave", onMouseLeave);
      }
      window.removeEventListener("resize", onWindowResize);

      hoveredMesh = null;
      hoveredProvinceName = null;

      if (currentTextLabel) {
        scene.remove(currentTextLabel);
        if (currentTextLabel.dispose) {
          currentTextLabel.dispose();
        }
        currentTextLabel = null;
      }

      provinceIconsArray.forEach((icon) => {
        scene.remove(icon);
        if (icon.material) {
          if (icon.material.map) icon.material.map.dispose();
          icon.material.dispose();
        }
      });
      provinceIconsArray = [];

      provinceLabelsArray.forEach((label) => {
        scene.remove(label);
        if (label.material) {
          if (label.material.map) label.material.map.dispose();
          label.material.dispose();
        }
      });
      provinceLabelsArray = [];
      provinceDataArray = [];

      flylinesArray.forEach((flyline) => {
        scene.remove(flyline);
        if (flyline.geometry) flyline.geometry.dispose();
        if (flyline.material) flyline.material.dispose();
      });
      flylinesArray = [];

      flylineRipplesArray.forEach((ripple) => {
        scene.remove(ripple);
        if (ripple.geometry) ripple.geometry.dispose();
        if (ripple.material) ripple.material.dispose();
      });
      flylineRipplesArray = [];

      centerRipplesArray.forEach((ripple) => {
        scene.remove(ripple);
        if (ripple.geometry) ripple.geometry.dispose();
        if (ripple.material) ripple.material.dispose();
      });
      centerRipplesArray = [];

      if (centerRippleTimer) {
        clearInterval(centerRippleTimer);
        centerRippleTimer = null;
      }

      if (renderer) {
        renderer.dispose();
      }
      if (container.value && renderer) {
        container.value.removeChild(renderer.domElement);
      }
    };

    // 切换数据类型
    const switchDataType = (type) => {
      currentDataType.value = type;

      if (type === 'pillar') {
        showPillars.value = !showPillars.value;
        mapUtils.toggleVisibility(lightPillarsArray, showPillars.value);
        mapUtils.toggleVisibility(pillarLabelsArray, showPillars.value);
      } else if (type === 'label') {
        showLabels.value = !showLabels.value;
        mapUtils.toggleVisibility(provinceLabelsArray, showLabels.value);
        mapUtils.toggleVisibility(provinceIconsArray, showLabels.value);
      } else if (type === 'flyline') {
        showFlylines.value = !showFlylines.value;
        if (showFlylines.value && flylinesArray.length === 0) {
          createFlylines();
        }
        mapUtils.toggleVisibility(flylinesArray, showFlylines.value);
        mapUtils.toggleVisibility(flylinePulsesArray, showFlylines.value);
        mapUtils.toggleVisibility(flylineRipplesArray, showFlylines.value);
      } else if (type === 'ripple') {
        showRipples.value = !showRipples.value;
        if (showRipples.value && centerRipplesArray.length === 0) {
          createDefaultRipples();
        }
        if (showRipples.value) {
          startCenterRippleTimer();
        } else {
          stopCenterRippleTimer();
        }
        mapUtils.toggleVisibility(centerRipplesArray, showRipples.value);
      }
    };

    // 切换光柱辉光
    const togglePillarGlow = () => {
      mapUtils.updateGlowEffect(lightPillarsArray, 'glowEnabled', pillarGlowEnabled.value);
    };

    // 切换脉冲辉光
    const togglePulseGlow = () => {
      mapUtils.updateGlowEffect(flylinePulsesArray, 'glowEnabled', pulseGlowEnabled.value);
    };

    onMounted(() => {
      initScene();
      loadChineseTypeface();
    });

    onUnmounted(() => {
      cleanup();
    });

    return {
      container,
      currentDataType,
      dataTypes,
      showPillars,
      showLabels,
      showFlylines,
      showRipples,
      pillarGlowEnabled,
      pulseGlowEnabled,
      switchDataType,
      togglePillarGlow,
      togglePulseGlow,
    };
  },
};
</script>

<style scoped>
.china-3d-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.china-3d-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a0a 100%);
}

.control-panel {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
}

.control-btn {
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  white-space: nowrap;
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateX(-2px);
}

.control-btn.active {
  background: rgba(41, 182, 246, 0.8);
  border-color: rgba(41, 182, 246, 1);
  color: #ffffff;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.glow-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
}

.glow-checkbox:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.4);
}

.glow-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: rgba(41, 182, 246, 1);
}

.checkbox-label {
  color: #ffffff;
  font-size: 12px;
  white-space: nowrap;
}
</style>