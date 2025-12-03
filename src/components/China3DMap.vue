<template>
  <div class="china-3d-wrapper">
    <div ref="container" class="china-3d-container"></div>
    <!-- 右侧按钮组 -->
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
import chinaData from "@/assets/json/china.json"; // 省份数据，用于渲染顶面
import chinaBorderData from "@/assets/json/chinaBorder.json"; // 国界线数据，用于渲染侧面
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

export default {
  name: "China3DMap",
  setup() {
    const container = ref(null);
    let scene, camera, renderer, composer;
    let provinces = [];
    const animationId = ref(null);
    let bloomPass = null; // Bloom通道引用

    // 射线拾取相关变量
    let raycaster = null;
    let mouse = new THREE.Vector2();
    let hoveredMesh = null; // 当前悬停的网格
    let hoveredProvinceName = null; // 当前悬停的省份名称

    // 3D文字标签相关变量
    let currentTextLabel = null; // 当前显示的3D文字标签

    let cnFont = null; // 中文 typeface.json 字体对象（TextGeometry 使用）
    // 最近一次标签状态（用于在中文字体JSON加载后自动创建文字）
    let lastLabelState = { text: "", position: null, baseHeight: 0 };

    // 省级图标和标签相关变量
    let provinceIconsArray = []; // 存储所有省级图标Sprite
    let provinceLabelsArray = []; // 存储所有省级标签
    let provinceDataArray = []; // 存储省份数据（名称、位置等）

    // 光柱相关变量
    let lightPillarsArray = []; // 存储所有光柱
    let pillarLabelsArray = []; // 存储光柱顶部的数据标签

    // 飞线相关变量
    let flylinesArray = []; // 存储所有飞线
    let flylineRipplesArray = []; // 存储所有波纹
    let flylinePulsesArray = []; // 存储所有脉冲对象

    // 数据类型切换
    const currentDataType = ref('pillar'); // 当前数据类型
    const dataTypes = ref([
      { label: '光柱', value: 'pillar' },
      { label: '标牌', value: 'label' },
      { label: '飞线', value: 'flyline' },
      { label: '波纹', value: 'ripple' }
    ]);

    // 光柱显示状态控制
    const showPillars = ref(false); // 是否显示光柱（默认不显示）

    // 标牌显示状态控制
    const showLabels = ref(true); // 是否显示标牌（默认显示）

    // 飞线显示状态控制
    const showFlylines = ref(false); // 是否显示飞线（默认不显示）

    // 光柱辉光效果控制
    const pillarGlowEnabled = ref(false); // 是否启用光柱辉光效果（默认不启用）

    // 脉冲辉光效果控制
    const pulseGlowEnabled = ref(false); // 是否启用脉冲辉光效果（默认不启用）

    // 波纹相关变量
    let ripplesArray = []; // 存储所有波纹
    let rippleTimer = null; // 波纹定时器
    
    // 存储3D体块波纹的数组
    let centerRipplesArray = []; // 存储中国地图中心波纹
    let centerRippleTimer = null; // 中国地图中心波纹定时器
    const showRipples = ref(false); // 是否显示波纹（默认不显示）

    // 本地 assets 下提供的中文 typeface.json 候选列表（存在其一即可）
    const CN_TYPEFACE_CANDIDATES = [
      FZLISHU_TYPEFACE_URL,
      FZWEIBEI_TYPEFACE_URL,
    ];

    const LABEL_CONFIG = {
      floatHeight: 2000, // 基础浮动高度（米）- 提高文字顶面高度
      floatRange: 20, // 浮动范围（10-30米）
      floatSpeed: 0.001, // 浮动速度
      fontSize: 3000, // 字体大小
      textColor: 0xffd700, // 文字颜色（亮金黄色）
      outlineColor: 0xffaa00, // 边缘颜色（橙金色）
      textDepth: 500, // 文字厚度 - 加深厚度
      bevelEnabled: true, // 启用斜角
      bevelThickness: 50, // 斜角厚度
      bevelSize: 30, // 斜角大小
      emissiveIntensity: 0.8, // 自发光强度（提高亮度）
    };

    // 省级图标配置
    const ICON_CONFIG = {
      iconSize: 3000, // 图标大小
      iconHeight: 18000, // 图标基础高度
      labelOffsetY: 8000, // 标签相对图标的Y轴偏移（从6000增加到8000，避免压盖icon）
      labelFontSize: 8000, // 标签字体大小（缩小一半：从10000到5000）
      labelPadding: 400, // 标签内边距（相应缩小）
      labelBorderRadius: 200, // 标签圆角（相应缩小）
      labelColor: 0x333333, // 标签文字颜色（深灰色）
      labelBgColor: "#000000", // 标签背景颜色（深蓝色）
      emissiveIntensity: 1.5, // 自发光强度（用于Bloom效果）
    };

    // 光柱配置
    const PILLAR_CONFIG = {
      radius: 750, // 光柱半径（从1500降低到750，减少一半）
      baseHeight: 15000, // 光柱基础高度（在地块顶面上）
      maxHeight: 25000, // 光柱最大高度
      minHeight: 3000, // 光柱最小高度
      segments: 32, // 圆柱体分段数
      labelOffsetY: 2000, // 标签相对光柱顶部的Y轴偏移
      labelFontSize: 3000, // 标签字体大小
      // 颜色映射（根据数据值分段）- 调亮颜色
      colorRanges: [
        { min: 0, max: 2000, color: 0x80d8ff }, // 亮浅蓝色
        { min: 2000, max: 4000, color: 0x40c4ff }, // 亮中蓝色
        { min: 4000, max: 6000, color: 0x00b0ff }, // 亮深蓝色
        { min: 6000, max: 8000, color: 0x0091ea }, // 亮更深蓝色
        { min: 8000, max: Infinity, color: 0x0277bd } // 亮最深蓝色
      ]
    };

    // 飞线配置
    const FLYLINE_CONFIG = {
      color: 0x00ffff, // 飞线颜色（青色）
      pulseColor: 0xff9900, // 脉冲颜色（橙色，更明显）
      lineWidth: 2, // 飞线宽度
      pulseSpeed: 0.008, // 脉冲速度（降低速度，更慢）
      pulseLength: 0.15, // 脉冲长度（增加到35%，更明显）
      curveHeight: 8000, // 飞线弧度高度
      rippleColor: 0x00ffff, // 波纹颜色（青色）
      rippleMaxRadius: 3000, // 波纹最大半径
      rippleSpeed: 0.005, // 波纹扩散速度
      rippleCount: 3, // 波纹数量（3圈）
      rippleInterval: 0.33, // 波纹间隔（1/3，确保3圈均匀分布）
      pulseHeadRadius: 120, // 脉冲头部半径（冲向目标的前端，粗头）
      pulseTailRadius: 20, // 脉冲尾部半径（后端，细尾）
      pulseTubeSegments: 16, // 管道圆周分段数
      pulseRadialSegments: 32, // 管道径向分段数
    };

    // 波纹配置
    const RIPPLE_CONFIG = {
      maxRadius: 50000, // 波纹最大半径（覆盖整个地图）
      initialRadius: 100, // 初始半径
      expansionSpeed: 800, // 扩散速度（单位/秒）
      opacityDecay: 0.01, // 透明度衰减速度
      color: 0x00bfff, // 波纹颜色（亮蓝色）
      segments: 64, // 环形分段数
      initialOpacity: 0.8, // 初始透明度
      minOpacity: 0, // 最小透明度
      interval: 3000, // 波纹触发间隔（毫秒）
    };

    // 基于中国地图中心的波纹配置
    const CENTER_RIPPLE_CONFIG = {
      maxRadius: 500000, // 中国地图中心波纹最大半径（覆盖整个地图）
      initialRadius: 1000, // 初始半径
      expansionSpeed: 100000, // 扩散速度（覆盖整个地图约5秒）
      opacityDecay: 0.003, // 透明度衰减速度
      color: 0x00ff88, // 中国地图中心波纹颜色（青绿色）
      segments: 64, // 环形分段数（更平滑）
      initialOpacity: 0.8, // 初始透明度
      minOpacity: 0, // 最小透明度
      interval: 3000, // 每3秒触发一次
      heightOffset: 100, // 在地图上方100单位
    };

    // 初始化Three.js场景
    const initScene = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      // 创建场景
      scene = new THREE.Scene();
      // 先设置默认背景色，等待纹理加载
      scene.background = new THREE.Color(0x0a0a0a);

      // 创建相机 - 稍微倾斜的俯视角度，让3D体块占据屏幕的2/3
      camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000000); // FOV为60
      // 设置相机位置：稍微倾斜，不是完全垂直
      // 使用极角约5度的位置作为初始位置
      const initialPolarAngle = (5 * Math.PI) / 180; // 5度
      const distance = 160000;
      camera.position.set(
        0,
        distance * Math.cos(initialPolarAngle), // Y坐标
        distance * Math.sin(initialPolarAngle) // Z坐标
      );
      camera.lookAt(0, 0, 0);
      // 设置相机控制目标点
      camera.target = new THREE.Vector3(0, 0, 0);

      // 创建渲染器 - 启用原生抗锯齿，提升性能
      renderer = new THREE.WebGLRenderer({
        antialias: true, // 启用原生抗锯齿（比后处理FXAA性能更好）
        alpha: false, // 禁用alpha通道确保不透明背景
        powerPreference: "high-performance", // 优先使用高性能GPU
      });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = false; // 禁用阴影以提升性能
      renderer.setClearColor(0x0a0a0a, 1); // 设置完全不透明的背景色

      // 启用深度测试，确保正确的遮挡关系
      renderer.sortObjects = true; // 启用对象排序

      container.value.appendChild(renderer.domElement);

      // 初始化后处理效果
      composer = new EffectComposer(renderer);

      // 添加渲染通道
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      // 添加UnrealBloom通道（边缘流线强辉光效果）
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width * 0.5, height * 0.5), // 降低分辨率提升性能
        0.5, // 强度（大幅提高到1.2，强烈辉光）
        0.2, // 半径（提高到0.8，大范围辉光）
        0.88 // 阈值（降低到0.88，让极亮青蓝色能触发强辉光）
      );
      composer.addPass(bloomPass);

      // 移除FXAA抗锯齿通道以提升性能
      // const fxaaPass = new ShaderPass(FXAAShader);
      // fxaaPass.material.uniforms["resolution"].value.x = 1 / width;
      // fxaaPass.material.uniforms["resolution"].value.y = 1 / height;
      // composer.addPass(fxaaPass);

      // 添加输出通道
      const outputPass = new OutputPass();
      composer.addPass(outputPass);

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
      textureLoader.load("/src/assets/image/home/bg.jpg", (texture) => {
        // 计算背景平面尺寸以完全覆盖视野
        const aspect = width / height;
        const distance = 1500000; // 固定距离
        const vFov = (camera.fov * Math.PI) / 180;
        const viewHeight = 2 * Math.tan(vFov / 2) * distance;
        const viewWidth = viewHeight * aspect;

        // 创建平面几何体 - 缩小尺寸
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
        backgroundPlane.renderOrder = -999; // 设置最低的渲染顺序

        // 保存背景平面引用，用于窗口调整和相机跟随
        scene.userData.backgroundPlane = backgroundPlane;
        scene.add(backgroundPlane);
      });

      // 添加旋转精灵图 - 在背景图上层
      textureLoader.load("/src/assets/image/home/bg-ring.png", (texture) => {
        // 计算精灵图平面尺寸 - 保持正方形，不拉伸
        const distance = 1400000; // 比背景图稍近一些
        const vFov = (camera.fov * Math.PI) / 180;
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
          depthWrite: false,
        });

        const ringPlane = new THREE.Mesh(geometry, material);
        ringPlane.renderOrder = -998; // 比背景图高一层

        // 保存旋转精灵图引用，用于窗口调整、相机跟随和旋转动画
        scene.userData.ringPlane = ringPlane;
        scene.add(ringPlane);
      });

      // 初始化射线检测器
      raycaster = new THREE.Raycaster();

      // 处理数据
      processGeoData();

      // 添加事件监听
      addEventListeners();

      // 设置轨道控制器
      setupControls();

      // 开始渲染
      animate();
    };

    /**
     * 加载字体
     */

    /**
     * 创建3D文字标签（TextGeometry 挤出中文）
     * @param {string} text - 要显示的文字
     * @param {THREE.Vector3} position - 文字位置
     * @param {number} baseHeight - 地块顶面高度
     */
    const create3DTextLabel = (text, position, baseHeight) => {
      // 清理上一份
      if (currentTextLabel) {
        scene.remove(currentTextLabel);

        if (currentTextLabel.dispose) {
          // Troika Text 对象
          currentTextLabel.dispose();
        } else {
          // 普通Mesh/Group
          if (currentTextLabel.geometry) currentTextLabel.geometry.dispose();
          if (currentTextLabel.material) {
            if (Array.isArray(currentTextLabel.material))
              currentTextLabel.material.forEach((m) => m.dispose());
            else currentTextLabel.material.dispose();
          }
        }
        currentTextLabel = null;
      }

      // 记录最近一次标签状态，用于字体JSON加载后自动创建文字
      lastLabelState = {
        text,
        position: position && position.clone ? position.clone() : position,
        baseHeight,
      };

      // 字体未就绪则等待 loadChineseTypeface 成功后再创建
      if (!cnFont) {
        return;
      }

      // 使用 TextGeometry 挤出中文
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

      // 3D文字材质：正常显示，无反光效果
      // 3D文字材质：金黄色高亮效果
      const materials = [
        new THREE.MeshPhongMaterial({
          color: LABEL_CONFIG.textColor,
          flatShading: true,
          side: THREE.DoubleSide,
          transparent: true, // 启用透明以支持renderOrder排序
          opacity: 1.0, // 完全不透明
          emissive: LABEL_CONFIG.textColor, // 自发光颜色（金黄色）
          emissiveIntensity: LABEL_CONFIG.emissiveIntensity, // 自发光强度
          depthTest: false, // 禁用深度测试，始终显示在最前面
          depthWrite: false, // 禁用深度写入，不被其他物体遮挡
        }), // front/back
        new THREE.MeshPhongMaterial({
          color: LABEL_CONFIG.outlineColor,
          transparent: true, // 启用透明以支持renderOrder排序
          opacity: 1.0, // 完全不透明
          emissive: LABEL_CONFIG.outlineColor, // 自发光颜色（橙金色）
          emissiveIntensity: LABEL_CONFIG.emissiveIntensity * 0.5, // 边缘稍弱的自发光
          depthTest: false, // 禁用深度测试，始终显示在最前面
          depthWrite: false, // 禁用深度写入，不被其他物体遮挡
        }), // side
      ];

      const textMesh = new THREE.Mesh(geometry, materials);
      // 文字与顶面垂直：Y轴为高度方向，文字竖立在顶面上
      textMesh.position.set(
        position.x + centerOffset,
        baseHeight + LABEL_CONFIG.floatHeight,
        position.z
      );
      // 初始旋转设置为0，后续在动画循环中始终面向相机
      textMesh.rotation.set(0, 0, 0);
      // 设置渲染顺序为最高，确保3D文字始终显示在最上层
      textMesh.renderOrder = 999;
      textMesh.userData = {
        baseY: baseHeight + LABEL_CONFIG.floatHeight,
        floatOffset: 0,
        renderer: "textgeometry",
      };
      scene.add(textMesh);
      currentTextLabel = textMesh;
      return;
    };

    /**
     * 计算省份的中心点（考虑所有mesh，适用于MultiPolygon）
     * @param {Object} province - 省份对象，包含meshes数组
     * @returns {THREE.Vector3} 中心点坐标
     */
    const calculateProvinceCenter = (province) => {
      if (!province || !province.meshes || province.meshes.length === 0) {
        return new THREE.Vector3(0, 0, 0);
      }

      // 收集所有mesh的所有顶点
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

          // 应用mesh的变换矩阵
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

    /**
     * 生成省级Mock数据
     * @returns {number} 随机生成的数据值
     */
    const generateProvinceData = () => {
      // 生成100-9999之间的随机整数
      return Math.floor(Math.random() * 9900) + 100;
    };

    /**
     * 计算省份几何中心点（从GeoJSON数据）
     * @param {Object} geometry - GeoJSON几何对象
     * @param {Object} center - 地图中心点
     * @param {number} scale - 缩放因子
     * @returns {THREE.Vector3} 中心点坐标
     */
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
        // 地图绕X轴旋转了-90度，所以坐标系统是：
        // X轴：东西方向（不变）
        // Y轴：高度方向（向上）
        // Z轴：南北方向（原来的Y坐标取负值）
        return new THREE.Vector3(
          totalX / totalPoints, // X坐标（东西）
          ICON_CONFIG.iconHeight, // Y坐标（高度）
          -(totalY / totalPoints) // Z坐标（南北，取负值）
        );
      }

      return new THREE.Vector3(0, ICON_CONFIG.iconHeight, 0);
    };

    /**
     * 使用Sprite创建所有省级图标
     * @param {Object} center - 地图中心点
     * @param {number} scale - 缩放因子
     */
    const createProvinceIconsWithSprite = (center, scale) => {
      // 收集所有省份的位置和数据
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

      // 加载图标纹理
      const textureLoader = new THREE.TextureLoader();
      const iconImageUrl = "/src/assets/image/home/icon.png";

      textureLoader.load(
        iconImageUrl,
        (texture) => {
          // 为每个省份创建一个Sprite
          provinceDataArray.forEach((province) => {
            // 创建Sprite材质 - 正常亮度，不参与Bloom
            const spriteMaterial = new THREE.SpriteMaterial({
              map: texture,
              transparent: true,
              opacity: 1,
              depthTest: false,
              depthWrite: false,
              // 正常亮度，不触发Bloom
              color: new THREE.Color(1, 1, 1), // 正常亮度
              blending: THREE.NormalBlending, // 正常混合模式
            });

            // 创建Sprite
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(ICON_CONFIG.iconSize, ICON_CONFIG.iconSize, 1);
            sprite.position.copy(province.position);
            sprite.renderOrder = 100;

            // 初始状态：受标牌状态控制
            sprite.visible = showLabels.value;

            // 添加到场景和数组
            scene.add(sprite);
            provinceIconsArray.push(sprite);
          });

          // 创建标签
          createProvinceLabels();

          // 创建光柱
          createLightPillars();
        },
        undefined,
        (error) => {
          console.error("图标纹理加载失败:", error);
        }
      );
    };

    /**
     * 创建所有省级标签
     */
    const createProvinceLabels = () => {
      provinceDataArray.forEach((province) => {
        // 创建Canvas绘制标签文字
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = 1024;
        canvas.height = 512;

        // 清空画布
        context.clearRect(0, 0, canvas.width, canvas.height);

        // 设置文字样式
        const fontSize = 80;
        context.font = `bold ${fontSize}px Arial, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";

        // 分别测量省名和数值的宽度
        const provinceName = province.name;
        const provinceValue = province.data;
        const separator = ": ";

        const nameMetrics = context.measureText(provinceName);
        const separatorMetrics = context.measureText(separator);
        const valueMetrics = context.measureText(provinceValue);

        const totalWidth =
          nameMetrics.width + separatorMetrics.width + valueMetrics.width;
        const textHeight = fontSize;

        // 计算背景矩形的尺寸和位置（带内边距）
        const padding = ICON_CONFIG.labelPadding / 10; // 缩放到canvas尺寸
        const bgWidth = totalWidth + padding * 2;
        const bgHeight = textHeight + padding * 2;
        const bgX = (canvas.width - bgWidth) / 2;
        const bgY = (canvas.height - bgHeight) / 2;
        const borderRadius = ICON_CONFIG.labelBorderRadius / 10; // 圆角

        // 绘制圆角矩形背景
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

        // 计算文字起始位置（居中）
        const centerY = canvas.height / 2;
        const startX = (canvas.width - totalWidth) / 2;

        // 绘制省名（白色）
        context.fillStyle = "#ffffff";
        context.textAlign = "left";
        context.fillText(provinceName, startX, centerY);

        // 绘制分隔符（白色）
        const separatorX = startX + nameMetrics.width;
        context.fillText(separator, separatorX, centerY);

        // 绘制数值（柔和的黄色，避免触发Bloom）
        context.fillStyle = "#e6d700"; // 降低亮度的黄色
        const valueX = separatorX + separatorMetrics.width;
        context.fillText(provinceValue, valueX, centerY);

        // 创建标签精灵
        const labelTexture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
          opacity: 0.85, // 降低不透明度，避免过亮和触发Bloom
          depthTest: true,
          depthWrite: true,
          // 不设置color和blending，避免参与Bloom后处理
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
        labelSprite.renderOrder = 101; // 标签在图标之上

        // 初始状态：受标牌状态控制
        labelSprite.visible = showLabels.value;

        // 添加userData用于标识
        labelSprite.userData = {
          provinceName: province.name,
          isProvinceLabel: true,
        };

        scene.add(labelSprite);
        provinceLabelsArray.push(labelSprite);
      });
    };

    /**
     * 根据数据值获取对应的颜色
     * @param {number} value - 数据值
     * @returns {number} 颜色值
     */
    const getColorByValue = (value) => {
      for (let i = 0; i < PILLAR_CONFIG.colorRanges.length; i++) {
        const range = PILLAR_CONFIG.colorRanges[i];
        if (value >= range.min && value < range.max) {
          return range.color;
        }
      }
      return PILLAR_CONFIG.colorRanges[PILLAR_CONFIG.colorRanges.length - 1].color;
    };

    /**
     * 格式化数据值为显示文本（如"122万"）
     * @param {number} value - 数据值
     * @returns {string} 格式化后的文本
     */
    const formatDataValue = (value) => {
      if (value >= 10000) {
        return (value / 10000).toFixed(0) + '万';
      }
      return value.toString();
    };

    /**
     * 创建所有省级光柱
     */
    const createLightPillars = () => {
      // 清除旧的光柱和标签
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

        // 计算光柱高度（根据数据值映射）
        const heightRatio = Math.min(dataValue / 10000, 1); // 归一化到0-1
        const pillarHeight = PILLAR_CONFIG.minHeight +
          (PILLAR_CONFIG.maxHeight - PILLAR_CONFIG.minHeight) * heightRatio;

        // 获取颜色
        const color = getColorByValue(dataValue);
        const colorObj = new THREE.Color(color);

        // 创建圆柱体几何体
        const geometry = new THREE.CylinderGeometry(
          PILLAR_CONFIG.radius,
          PILLAR_CONFIG.radius,
          pillarHeight,
          PILLAR_CONFIG.segments
        );

        // 创建自定义着色器材质，实现从下到上的透明度渐变
        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthTest: false, // 禁用深度测试，确保不被遮挡
          depthWrite: false,
          uniforms: {
            color: { value: colorObj },
            pillarHeight: { value: pillarHeight },
            glowEnabled: { value: pillarGlowEnabled.value ? 1.0 : 0.0 } // 辉光开关
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
              // 计算透明度：从底部（0.9）到顶部（0.1）
              // vPosition.y 范围是 [-pillarHeight/2, pillarHeight/2]
              float normalizedY = (vPosition.y + pillarHeight * 0.5) / pillarHeight;
              float alpha = 0.1 + normalizedY * 0.8; // 底部0.9，顶部0.1

              // 根据辉光开关调整颜色亮度
              vec3 finalColor = color * 1.5; // 基础提亮
              if (glowEnabled > 0.5) {
                // 启用辉光时，使用更平滑的算法
                // 使用平方根函数，让短柱子和高柱子的辉光更均匀
                float heightNormalized = pillarHeight / 30.0; // 假设最大高度约30
                heightNormalized = clamp(heightNormalized, 0.0, 1.0);

                // 使用平方根函数，让辉光强度增长更平缓
                float heightFactor = sqrt(heightNormalized);

                // 辉光强度在1.6-2.0倍之间，整体更柔和
                // 短柱子约1.6倍，高柱子约2.0倍
                float glowIntensity = 1.6 + heightFactor * 0.4;

                // 添加垂直方向的辉光渐变，顶部更亮
                float verticalGlow = 0.8 + normalizedY * 0.2; // 底部0.8，顶部1.0

                finalColor = color * glowIntensity * verticalGlow;
              }

              gl_FragColor = vec4(finalColor, alpha);
            }
          `
        });

        // 创建光柱网格
        const pillar = new THREE.Mesh(geometry, material);

        // 设置位置：在省份中心，Y轴位置在地块顶面上
        const baseY = PILLAR_CONFIG.baseHeight; // 地块顶面高度
        pillar.position.set(
          province.position.x,
          baseY + pillarHeight / 2, // 圆柱体中心点
          province.position.z
        );

        // 设置渲染顺序，确保光柱在最上层渲染
        pillar.renderOrder = 999;

        // 初始状态：隐藏光柱
        pillar.visible = showPillars.value;

        pillar.userData = {
          provinceName: province.name,
          isLightPillar: true,
          dataValue: dataValue,
          pillarHeight: pillarHeight
        };

        scene.add(pillar);
        lightPillarsArray.push(pillar);

        // 创建光柱顶部的数据标签
        const labelText = dataValue;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 512;

        // 设置文字样式
        const fontSize = 80;
        context.font = `bold ${fontSize}px Arial, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#ffffff';

        // 绘制文字
        context.fillText(labelText, canvas.width / 2, canvas.height / 2);

        // 创建标签精灵
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
        labelSprite.renderOrder = 1000; // 设置更高的渲染顺序

        // 初始状态：与光柱绑定，光柱显示时才显示
        labelSprite.visible = showPillars.value;

        labelSprite.userData = {
          provinceName: province.name,
          isPillarLabel: true,
        };

        scene.add(labelSprite);
        pillarLabelsArray.push(labelSprite);
      });
    };

    /**
     * 创建飞线（从北京到各省）
     */
    const createFlylines = () => {
      // 清除旧的飞线、波纹和脉冲
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

      // 找到北京的位置
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

      // 为每个省份创建飞线
      provinceDataArray.forEach(province => {
        // 跳过北京自己
        if (province.name === '北京' || province.name === '北京市') {
          return;
        }

        const endPos = new THREE.Vector3(
          province.position.x,
          province.position.y + 1000,
          province.position.z
        );

        // 创建飞线曲线（贝塞尔曲线）
        const midPoint = new THREE.Vector3(
          (startPos.x + endPos.x) / 2,
          Math.max(startPos.y, endPos.y) + FLYLINE_CONFIG.curveHeight,
          (startPos.z + endPos.z) / 2
        );

        const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // 创建基础飞线材质（简单的线条，半透明）
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
          curve: curve, // 保存曲线用于脉冲动画
          startTime: Math.random() * 2, // 随机起始时间，让飞线不同步
        };

        scene.add(line);
        flylinesArray.push(line);

        // 创建脉冲对象（使用TubeGeometry实现头大尾细）
        createPulse(curve, line.userData.startTime);

        // 创建目标点的波纹效果
        createFlylineRipples(endPos);
      });
    };

    /**
     * 创建脉冲对象（头粗尾细的管道）
     * @param {THREE.Curve} curve - 飞线曲线
     * @param {number} startTime - 起始时间偏移
     */
    const createPulse = (curve, startTime) => {
      // 自定义半径函数：头粗尾细
      // t: 0-1，表示沿着管道的位置
      // t=0 是脉冲的后端（尾部），t=1 是脉冲的前端（头部，冲向目标）
      const radiusFunction = (t) => {
        // 使用指数函数实现头粗尾细的效果
        // t 越大（越接近前端），半径越大
        const intensity = Math.pow(t, 0.4); // 使用0.4次方，让头部更粗

        // 从尾部半径过渡到头部半径
        const radius = FLYLINE_CONFIG.pulseTailRadius +
                      (FLYLINE_CONFIG.pulseHeadRadius - FLYLINE_CONFIG.pulseTailRadius) * intensity;

        return radius;
      };

      // 创建管道几何体
      // 注意：这里创建一个短的管道段，代表脉冲的长度
      const pulseSegments = 20; // 脉冲的分段数

      // 创建一个临时的短曲线段用于脉冲
      const tempPoints = curve.getPoints(100);
      const pulseStartIndex = 0;
      const pulseEndIndex = Math.floor(tempPoints.length * FLYLINE_CONFIG.pulseLength);
      const pulsePoints = tempPoints.slice(pulseStartIndex, pulseEndIndex);

      // 使用CatmullRomCurve3创建平滑的脉冲曲线
      const pulsePath = new THREE.CatmullRomCurve3(pulsePoints);

      const tubeGeometry = new THREE.TubeGeometry(
        pulsePath,
        pulseSegments,
        1, // 基础半径（会被radiusFunction覆盖）
        FLYLINE_CONFIG.pulseTubeSegments,
        false
      );

      // 手动修改几何体的顶点，应用自定义半径函数
      const positions = tubeGeometry.attributes.position;
      const normals = tubeGeometry.attributes.normal;

      for (let i = 0; i < positions.count; i++) {
        // 计算当前顶点在管道上的位置（0-1）
        const segmentIndex = Math.floor(i / (FLYLINE_CONFIG.pulseTubeSegments + 1));
        const t = segmentIndex / pulseSegments;

        // 获取自定义半径
        const radius = radiusFunction(t);

        // 获取法线方向
        const nx = normals.getX(i);
        const ny = normals.getY(i);
        const nz = normals.getZ(i);

        // 获取中心点位置
        const centerPoint = pulsePath.getPoint(t);

        // 应用半径到顶点位置
        positions.setX(i, centerPoint.x + nx * radius);
        positions.setY(i, centerPoint.y + ny * radius);
        positions.setZ(i, centerPoint.z + nz * radius);
      }

      positions.needsUpdate = true;

      // 创建脉冲材质（使用ShaderMaterial实现渐变效果）
      const pulseMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide,
        uniforms: {
          color: { value: new THREE.Color(FLYLINE_CONFIG.pulseColor) },
          glowEnabled: { value: pulseGlowEnabled.value ? 1.0 : 0.0 }, // 辉光开关
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
            // 沿着管道方向（vUv.x）实现透明度渐变
            // vUv.x=0 是尾部（后端），vUv.x=1 是头部（前端，冲向目标）
            // 头部（vUv.x=1）：高透明度，更亮
            // 尾部（vUv.x=0）：低透明度，更暗
            float alpha = 0.3 + vUv.x * 0.7; // 尾部0.3，头部1.0

            // 添加径向渐变，让边缘更透明
            float radialFade = 1.0 - abs(vUv.y - 0.5) * 2.0;
            alpha *= radialFade * 0.8 + 0.2;

            // 根据辉光开关调整颜色亮度
            vec3 finalColor = color;
            if (glowEnabled > 0.5) {
              // 启用辉光时，增加颜色亮度以触发Bloom效果
              finalColor = color * 2.5; // 提高亮度2.5倍
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
        curve: curve, // 完整的飞线曲线
        pulsePath: pulsePath, // 脉冲的路径
        startTime: startTime,
        progress: 0, // 当前进度（0-1）
      };

      scene.add(pulseMesh);
      flylinePulsesArray.push(pulseMesh);
    };

    /**
     * 创建波纹效果
     * @param {THREE.Vector3} position - 波纹位置
     */
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
            offset: { value: i * FLYLINE_CONFIG.rippleInterval }, // 波纹偏移
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
              // 计算波纹扩散
              float progress = mod(time + offset, 1.0);

              // 计算当前像素到中心的距离
              vec2 center = vec2(0.5, 0.5);
              float dist = distance(vUv, center) * 2.0;

              // 波纹效果
              float ring = abs(dist - progress);
              float alpha = 1.0 - ring * 10.0;
              alpha *= (1.0 - progress); // 随着扩散逐渐消失
              alpha = clamp(alpha, 0.0, 0.8);

              gl_FragColor = vec4(color, alpha);
            }
          `
        });

        const ripple = new THREE.Mesh(geometry, material);
        // 创建独立的位置，不跟随原位置移动
        ripple.position.set(position.x, position.y, position.z);
        ripple.rotation.x = -Math.PI / 2; // 水平放置
        ripple.renderOrder = 997;
        ripple.visible = showFlylines.value;
        ripple.userData = {
          isRipple: true,
        };

        scene.add(ripple);
        flylineRipplesArray.push(ripple);
      }
    };

    /**
     * 预加载中文 typeface.json（顺序尝试 public/fonts 下的候选文件）
     * 成功后赋值 cnFont，用于 TextGeometry 挤出中文
     */
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

            // 字体加载完毕后，如有上一次悬停记录则创建
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

      // 加载中国地图纹理（整体贴图）
      const textureLoader = new THREE.TextureLoader();
      const chinaTexture = textureLoader.load(
        "/src/assets/image/home/quanGuo.png"
      );

      // 1. 创建省份顶面（使用 chinaData）
      chinaData.features.forEach((feature) => {
        createProvinceTopMesh(feature, center, scale, bounds, chinaTexture);
      });

      // 2. 创建国界侧面（使用 chinaBorderData）
      chinaBorderData.features.forEach((feature) => {
        createBorderSideMesh(feature, center, scale);
      });

      // 3. 创建中国边界线动画（基于 chinaBorderData，排除台湾）
      createChinaBorderLineAnimation(center, scale);

      // 4. 创建省级图标和标签（使用Sprite保持方向一致）
      createProvinceIconsWithSprite(center, scale);
    };

    /**
     * 创建省份顶面网格（使用 chinaData）
     * 只渲染顶面，不渲染侧面
     */
    const createProvinceTopMesh = (
      feature,
      center,
      scale,
      bounds,
      chinaTexture
    ) => {
      const provinceGroup = new THREE.Group();
      const provinceName = feature.properties.name;
      const actualExtrudeHeight = 15000; // 统一高度

      // 处理几何数据
      let geometries = [];
      let borderCoordinates = []; // 存储边界坐标用于绘制边界线

      if (feature.geometry.type === "Polygon") {
        geometries = feature.geometry.coordinates.map((polygon) => {
          const coords = coordinatesToMercator(polygon);
          const normalized = normalizeCoordinates(coords, center);
          borderCoordinates.push(normalized); // 保存边界坐标
          return createShapeGeometry(normalized, scale);
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((multi) => {
          multi.forEach((polygon) => {
            const coords = coordinatesToMercator(polygon);
            const normalized = normalizeCoordinates(coords, center);
            borderCoordinates.push(normalized); // 保存边界坐标
            geometries.push(createShapeGeometry(normalized, scale));
          });
        });
      }

      // 计算中国地图的整体尺寸（用于UV映射）
      const mapWidth = (bounds.maxX - bounds.minX) * scale;
      const mapHeight = (bounds.maxY - bounds.minY) * scale;

      // 创建3D体块 - 只渲染顶面（不渲染底面和侧面）
      // 顶面位置在侧面之上
      geometries.forEach((geometry) => {
        // 使用 createShapeGeometry 创建平面几何体
        // 这个函数返回的是 THREE.Shape，需要转换为 ShapeGeometry
        const shapeGeometry = new THREE.ShapeGeometry(geometry);

        // 计算UV坐标映射 - 将每个省份映射到纹理的对应位置
        const positions = shapeGeometry.attributes.position;
        const uvs = new Float32Array(positions.count * 2);

        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);

          // 将顶点坐标归一化到 [0, 1] 范围
          // 注意：需要将坐标从中心对齐转换为左下角对齐
          uvs[i * 2] = (x + mapWidth / 2) / mapWidth; // U坐标
          uvs[i * 2 + 1] = (y + mapHeight / 2) / mapHeight; // V坐标
        }

        // 设置UV属性
        shapeGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

        // 创建顶面材质（带纹理贴图，使用UV映射）
        const topMaterial = new THREE.MeshPhongMaterial({
          map: chinaTexture, // 使用纹理贴图
          color: 0xffffff, // 白色以显示原始纹理颜色
          transparent: true,
          opacity: 1, // 可调整透明度
          depthWrite: true,
          depthTest: true,
          side: THREE.DoubleSide, // 双面渲染
        });

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

      // 创建边界线 - 基于各省的边界经纬度
      borderCoordinates.forEach((coordinates) => {
        // 创建边界线的点数组
        // 边界线需要在XY平面上创建（与ShapeGeometry相同），然后一起旋转
        const positions = [];
        coordinates.forEach((coord) => {
          const x = coord[0] * scale;
          const y = coord[1] * scale;
          // 在XY平面上创建点，Z坐标为10（稍微抬高避免z-fighting）
          positions.push(x, y, 10);
        });

        // 使用 LineGeometry 创建支持线宽的几何体
        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(positions);

        // 使用 LineMaterial 创建支持线宽的材质
        const lineMaterial = new LineMaterial({
          color: 0x70b2bd, // #70b2bd
          linewidth: 2.2, // 线宽（单位：像素）
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          depthTest: false,
        });

        // 设置材质分辨率（必须设置才能正确显示线宽）
        lineMaterial.resolution.set(
          container.value.clientWidth,
          container.value.clientHeight
        );

        // 创建 Line2 对象（支持线宽）
        const line = new Line2(lineGeometry, lineMaterial);

        // 旋转线条，与顶面保持一致（绕X轴旋转-90度）
        line.rotation.x = -Math.PI / 2;

        // 设置位置：将边界线放置在顶面的Y坐标上（稍微抬高避免z-fighting）
        const originalY = actualExtrudeHeight + 10;
        line.position.y = originalY;

        // 设置渲染顺序，确保边界线在顶面之上
        line.renderOrder = 3;

        // 保存边界线引用到userData，用于hover效果
        line.userData = {
          provinceName: provinceName,
          isProvinceBorder: true,
          originalColor: 0x70b2bd,
          originalLinewidth: 2.2,
          originalY: originalY, // 保存原始Y轴位置
        };

        // 保存 LineMaterial 引用，用于窗口调整时更新分辨率
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
          bevelEnabled: false,
        };

        const extrudeGeometry = new THREE.ExtrudeGeometry(
          geometry,
          extrudeSettings
        );

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

        // 侧面材质 - 垂直流动光带效果（降低亮度）
        const sideMaterial = new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          depthTest: false,
          uniforms: {
            time: { value: 0.0 },
            num: { value: 2.0 }, // 光带数量
            color1: { value: new THREE.Color("#00FFFF") },
            brightness: { value: 0.5 }, // 亮度系数（降低亮度）
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
              // 丢弃顶面和底面
              if(vNormal.z == 1.0 || vNormal.z == -1.0) {
                discard;
              }

              // 垂直流动光带：使用 vUv.y（垂直方向）
              // vUv.y: 0=底部，1=顶部
              // time 增加时，光带从顶部向底部流动
              float wave = fract(vUv.y + time);

              // 创建多条光带
              float bands = fract(wave * num);

              // 光带效果：接近0时亮，接近1时暗
              float alpha = (1.0 - bands) * 0.6; // 降低透明度，减少整体亮度

              // 降低颜色亮度，避免触发过强的Bloom效果
              vec3 finalColor = color1 * brightness;

              gl_FragColor = vec4(finalColor, alpha);
            }`,
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

    /**
     * 创建中国边界线动画（基于 chinaBorderData）
     * 排除台湾省，添加动画效果
     */
    const createChinaBorderLineAnimation = (center, scale) => {
      const actualExtrudeHeight = 15000; // 与省份高度一致

      // 收集所有边界坐标（排除台湾）
      const allBorderCoordinates = [];

      chinaBorderData.features.forEach((feature) => {
        const borderName = feature.properties.name;

        // 排除台湾省
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

      // 为每个边界创建动画线条
      const borderLines = [];

      allBorderCoordinates.forEach((coordinates) => {
        // 准备完整的点位数据
        const fullPositions = [];
        coordinates.forEach((coord) => {
          const x = coord[0] * scale;
          const y = coord[1] * scale;
          fullPositions.push(x, y, 15); // Z=15 避免z-fighting
        });

        // 跳过点数太少的边界（至少需要2个点才能绘制线段）
        if (fullPositions.length < 6) {
          return;
        }

        const totalPoints = fullPositions.length / 3; // 总点数
        const halfPoints = Math.floor(totalPoints / 3); // 一半的点数

        // 创建 LineGeometry - 初始显示前一半的点
        const lineGeometry = new LineGeometry();
        const initialPositions = fullPositions.slice(0, halfPoints * 3);
        lineGeometry.setPositions(initialPositions);

        // 创建 LineMaterial - 极亮青蓝色强辉光效果
        const lineMaterial = new LineMaterial({
          color: 0xe0f7fa, // 极亮青蓝色（接近白色的青蓝，强烈辉光）
          linewidth: 3, // 线宽5px，更明显
          transparent: true,
          opacity: 1.0, // 完全不透明，增强辉光
          depthWrite: false,
          depthTest: false,
        });

        // 设置材质分辨率
        lineMaterial.resolution.set(
          container.value.clientWidth,
          container.value.clientHeight
        );

        // 创建 Line2
        const line = new Line2(lineGeometry, lineMaterial);
        line.computeLineDistances(); // 计算线段距离

        // 旋转和位置设置
        line.rotation.x = -Math.PI / 2;
        line.position.y = actualExtrudeHeight + 15;
        line.renderOrder = 4; // 确保在省份边界线之上

        scene.add(line);

        // 保存线条信息用于动画
        borderLines.push({
          line,
          geometry: lineGeometry,
          material: lineMaterial,
          fullPositions,
          totalPoints,
          halfPoints,
          startIndex: 0, // 当前显示的起始点索引
        });

        // 保存 LineMaterial 引用
        if (!scene.userData.lineMaterials) {
          scene.userData.lineMaterials = [];
        }
        scene.userData.lineMaterials.push(lineMaterial);
      });

      // 保存边界线数组到 scene.userData
      scene.userData.borderLines = borderLines;
    };

    // 添加事件监听器
    const addEventListeners = () => {
      // 监听鼠标移动事件
      container.value.addEventListener("mousemove", onMouseMove);
      container.value.addEventListener("mouseleave", onMouseLeave);
      window.addEventListener("resize", onWindowResize);
    };

    /**
     * 鼠标移动事件处理函数
     * 实现射线拾取，检测鼠标悬停的区市表面
     */
    const onMouseMove = (event) => {
      // 计算鼠标在容器中的相对位置
      const rect = container.value.getBoundingClientRect();

      // 将鼠标屏幕坐标转换为标准化设备坐标（NDC）
      // NDC范围：x和y都在[-1, 1]之间
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 使用射线检测器从相机位置发射射线
      raycaster.setFromCamera(mouse, camera);

      // 获取所有省份的顶面网格
      const allMeshes = provinces.flatMap((p) => p.meshes);

      // 检测射线与网格的交点
      const intersects = raycaster.intersectObjects(allMeshes);

      // 处理悬停效果
      if (intersects.length > 0) {
        // 获取第一个相交的网格（最近的）
        const mesh = intersects[0].object;

        // 如果悬停的是新的网格
        if (hoveredMesh !== mesh) {
          // 恢复之前悬停省份的边界线样式
          restoreBorderLineStyle();

          // 更新当前悬停的网格
          hoveredMesh = mesh;

          // 创建3D文字标签
          const provinceName = mesh.userData.name;
          hoveredProvinceName = provinceName;

          // 设置当前省份的边界线高亮
          setBorderLineHoverStyle(provinceName);

          // 找到该省份的所有mesh，计算整体中心
          const province = provinces.find((p) => p.name === provinceName);
          const provinceCenter = calculateProvinceCenter(province);
          const baseHeight = 15000; // 地块顶面高度
          create3DTextLabel(provinceName, provinceCenter, baseHeight);
        }
      } else {
        // 鼠标没有悬停在任何网格上，恢复边界线样式并移除文字标签
        restoreBorderLineStyle();
        hoveredMesh = null;
        hoveredProvinceName = null;

        // 移除3D文字标签（Troika Text对象）
        if (currentTextLabel) {
          scene.remove(currentTextLabel);
          if (currentTextLabel.dispose) {
            currentTextLabel.dispose();
          }
          currentTextLabel = null;
        }
      }
    };

    /**
     * 鼠标离开容器事件处理函数
     * 恢复所有网格的原始颜色并移除文字标签
     */
    const onMouseLeave = () => {
      restoreBorderLineStyle();
      hoveredMesh = null;
      hoveredProvinceName = null;

      // 移除3D文字标签（Troika Text对象）
      if (currentTextLabel) {
        scene.remove(currentTextLabel);
        if (currentTextLabel.dispose) {
          currentTextLabel.dispose();
        }
        currentTextLabel = null;
      }
    };

    /**
     * 设置省份边界线的hover样式
     * @param {string} provinceName - 省份名称
     */
    const setBorderLineHoverStyle = (provinceName) => {
      provinces.forEach((province) => {
        if (province.name === provinceName) {
          // 找到该省份的所有边界线
          province.group.children.forEach((child) => {
            if (child.userData.isProvinceBorder) {
              // 设置hover样式：加粗到4，颜色改成#94e7f5
              child.material.color.setHex(0x94e7f5);
              child.material.linewidth = 4;
              // 提升渲染顺序，确保不被其他边界线压盖
              child.renderOrder = 10;
              // 稍微抬高Y轴位置，避免z-fighting
              child.position.y = child.userData.originalY + 20;
            }
          });
        }
      });
    };

    /**
     * 恢复省份边界线的原始样式
     */
    const restoreBorderLineStyle = () => {
      if (hoveredProvinceName) {
        provinces.forEach((province) => {
          if (province.name === hoveredProvinceName) {
            // 找到该省份的所有边界线
            province.group.children.forEach((child) => {
              if (child.userData.isProvinceBorder) {
                // 恢复原始样式
                child.material.color.setHex(child.userData.originalColor);
                child.material.linewidth = child.userData.originalLinewidth;
                // 恢复原始渲染顺序
                child.renderOrder = 3;
                // 恢复原始Y轴位置
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

      // 更新后处理composer尺寸（使用降低的分辨率提升性能）
      composer.setSize(width, height);

      // 更新Bloom Pass分辨率（降低分辨率提升性能）
      const bloomPass = composer.passes.find(
        (pass) => pass instanceof UnrealBloomPass
      );
      if (bloomPass) {
        bloomPass.resolution.set(width, height);
        // bloomPass.resolution.set(width * 0.5, height * 0.5);
      }

      // 移除FXAA分辨率更新（已禁用FXAA以提升性能）
      // const fxaaPass = composer.passes.find(
      //   (pass) => pass.material && pass.material.uniforms.resolution
      // );
      // if (fxaaPass) {
      //   fxaaPass.material.uniforms["resolution"].value.x = 1 / width;
      //   fxaaPass.material.uniforms["resolution"].value.y = 1 / height;
      // }

      // 更新所有 LineMaterial 的分辨率
      if (scene.userData.lineMaterials) {
        scene.userData.lineMaterials.forEach((material) => {
          material.resolution.set(width, height);
        });
      }

      // 更新背景平面尺寸以适配新的屏幕尺寸
      if (scene.userData.backgroundPlane) {
        const aspect = width / height;
        const distance = 1500000; // 固定距离
        const vFov = (camera.fov * Math.PI) / 180;
        const viewHeight = 2 * Math.tan(vFov / 2) * distance;
        const viewWidth = viewHeight * aspect;

        // 更新几何体 - 缩小尺寸
        scene.userData.backgroundPlane.geometry.dispose();
        scene.userData.backgroundPlane.geometry = new THREE.PlaneGeometry(
          viewWidth * 1.2,
          viewHeight * 1.2
        );
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
        LEFT: THREE.MOUSE.PAN, // 左键平移
        MIDDLE: THREE.MOUSE.DOLLY, // 中键缩放
        RIGHT: THREE.MOUSE.ROTATE, // 右键旋转
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
      controls.minPolarAngle = (0.5 * Math.PI) / 180; // 0.5度（接近垂直，但不完全到达边界）
      controls.maxPolarAngle = (60 * Math.PI) / 180; // 20度（允许向下倾斜20度）

      controls.target.set(0, 0, 0); // 设置目标点为场景中心
    };

    /**
     * 创建基于中国地图中心的波纹效果
     */
    const createCenterRipple = (height = CENTER_RIPPLE_CONFIG.heightOffset) => {
      // 创建中国地图中心位置的波纹
      const position = new THREE.Vector3(0, 0, 0); // 中国地图中心坐标

      const out_radius = 5000
      // 创建单个波纹环
      const geometry = new THREE.RingGeometry(
        CENTER_RIPPLE_CONFIG.initialRadius,
        CENTER_RIPPLE_CONFIG.initialRadius + out_radius, // 更粗的环线
        CENTER_RIPPLE_CONFIG.segments
      );

      // 使用自定义着色器材质实现径向渐变透明效果
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          color: { value: new THREE.Color(CENTER_RIPPLE_CONFIG.color) },
          baseOpacity: { value: CENTER_RIPPLE_CONFIG.initialOpacity },
          time: { value: 0 }, // 时间
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
            // 使用径向坐标计算渐变
            // vUv.y 表示从内径(0)到外径(1)的渐变
            float gradient = vUv.y;
            
            // 实现径向渐变透明效果
            // 内径透明度高，外径透明度低
            float radialOpacity = pow(1.0 - gradient, 2.0); // 使用平方函数让渐变更自然
            
            // 添加微妙的闪烁效果
            float flicker = 0.95 + 0.05 * sin(time * 2.0);
            
            // 最终透明度 = 基础透明度 * 径向渐变 * 闪烁效果
            float finalOpacity = baseOpacity * radialOpacity * flicker;
            
            // 确保透明度不会过低
            finalOpacity = max(finalOpacity, 0.02);
            
            gl_FragColor = vec4(color, finalOpacity);
          }
        `
      });

      const ripple = new THREE.Mesh(geometry, material);

      // 设置位置在中国地图中心的上方
      ripple.position.set(position.x, height, position.z);
      
      // 设置波纹水平放置，与3D体块保持同样旋转方向
      ripple.rotation.x = -Math.PI / 2;

      // 波纹数据
      ripple.userData = {
        radius: CENTER_RIPPLE_CONFIG.initialRadius,
        opacity: CENTER_RIPPLE_CONFIG.initialOpacity,
        active: true,
        type: 'center', // 标识为中心波纹
        startTime: Date.now(),
        outRadius: out_radius,
        time: 0 // 记录时间用于着色器动画
      };

      centerRipplesArray.push(ripple);
      scene.add(ripple);
    };

    /**
     * 启动中国地图中心波纹定时器
     */
    const createCenterRippleAtInterval = () => {
      createCenterRipple();
    };

    /**
     * 启动中国地图中心波纹定时器
     */
    const startCenterRippleTimer = () => {
      if (centerRippleTimer) {
        clearInterval(centerRippleTimer);
      }

      // 每3秒触发一次波纹
      centerRippleTimer = setInterval(() => {
        createCenterRippleAtInterval();
      }, CENTER_RIPPLE_CONFIG.interval);
    };

    /**
     * 停止中国地图中心波纹定时器
     */
    const stopCenterRippleTimer = () => {
      if (centerRippleTimer) {
        clearInterval(centerRippleTimer);
        centerRippleTimer = null;
      }
    };

    /**
     * 创建波纹效果
     */
    const createDefaultRipples = () => {
      // 创建一个环形几何体作为波纹模板
      const geometry = new THREE.RingGeometry(
        RIPPLE_CONFIG.initialRadius,
        RIPPLE_CONFIG.initialRadius + 400,
        RIPPLE_CONFIG.segments
      );

      // 创建多个波纹（每个波纹在不同相位）
      for (let i = 0; i < 5; i++) {
        const material = new THREE.MeshBasicMaterial({
          color: RIPPLE_CONFIG.color,
          transparent: true,
          opacity: RIPPLE_CONFIG.initialOpacity * (1 - i * 0.2), // 每个波纹透明度递减
          side: THREE.DoubleSide,
        });

        const ripple = new THREE.Mesh(geometry.clone(), material);
        
        // 波纹数据
        ripple.userData = {
          radius: RIPPLE_CONFIG.initialRadius,
          opacity: RIPPLE_CONFIG.initialOpacity * (1 - i * 0.2),
          phase: i * 0.2, // 相位偏移，每个波纹有不同相位
          active: false, // 是否活跃
        };

        // 设置波纹在地面（Y=0）？
        ripple.position.set(0, 0, 0);
        
        // 设置波纹水平放置，与3D体块保持同样旋转方向
        ripple.rotation.x = -Math.PI / 2;
        
        ripple.visible = false;
        ripple.renderOrder = 10; // 确保在其他元素之上

        ripplesArray.push(ripple);
        scene.add(ripple);
      }
    };

    // 动画循环
    let lastTime = Date.now(); // 用于计算deltaTime
    const animate = () => {
      animationId.value = requestAnimationFrame(animate);
      
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // 更新中国地图中心波纹动画
      const deltaSeconds = deltaTime / 1000; // 转换为秒
      
      centerRipplesArray.forEach(ripple => {
        if (ripple.userData.active) {
          // 更新半径
          ripple.userData.radius += CENTER_RIPPLE_CONFIG.expansionSpeed * deltaSeconds;

          // 更新着色器时间，用于闪烁动画
          ripple.userData.time += deltaSeconds;
          if (ripple.material.uniforms.time) {
            ripple.material.uniforms.time.value = ripple.userData.time;
          }

          // 更新几何体
          const innerRadius = ripple.userData.radius;
          const outerRadius = ripple.userData.radius + ripple.userData.outRadius;

          // 如果波纹超出最大范围，停止该波纹
          if (ripple.userData.radius > CENTER_RIPPLE_CONFIG.maxRadius) {
            ripple.userData.active = false;
            ripple.visible = false;
          } else {
            // 重新创建几何体以更新半径
            const newGeometry = new THREE.RingGeometry(
              innerRadius,
              outerRadius,
              CENTER_RIPPLE_CONFIG.segments
            );

            // 替换几何体
            if (ripple.geometry) {
              ripple.geometry.dispose();
            }
            ripple.geometry = newGeometry;
          }
        }
      });

      // 清理无效的波纹
      centerRipplesArray = centerRipplesArray.filter(ripple => {
        if (!ripple.userData.active) {
          if (ripple.geometry) ripple.geometry.dispose();
          if (ripple.material) ripple.material.dispose();
          if (ripple.parent) ripple.parent.remove(ripple);
          return false;
        }
        return true;
      });

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
        backgroundPlane.position
          .copy(camera.position)
          .add(cameraDirection.multiplyScalar(distance));

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
        ringPlane.position
          .copy(camera.position)
          .add(cameraDirection.multiplyScalar(distance));

        // 创建一个临时四元数来保存面向相机的旋转
        const quaternion = new THREE.Quaternion();

        // 创建旋转矩阵使平面面向相机
        const matrix = new THREE.Matrix4();
        matrix.lookAt(ringPlane.position, camera.position, camera.up);
        quaternion.setFromRotationMatrix(matrix);

        // 创建绕Z轴旋转的四元数（自转）
        const rotationQuaternion = new THREE.Quaternion();
        rotationQuaternion.setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          ringPlane.userData.rotationAngle
        );

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
                material.uniforms.time.value += 0.005;
              }
            });
          }
        });
      }

      // 更新中国边界线动画 - 降低更新频率以提升性能
      if (scene.userData.borderLines) {
        // 初始化帧计数器
        if (!scene.userData.borderLineFrameCount) {
          scene.userData.borderLineFrameCount = 0;
        }

        // 每3帧更新一次边界线动画（降低更新频率）
        scene.userData.borderLineFrameCount++;
        if (scene.userData.borderLineFrameCount % 3 === 0) {
          scene.userData.borderLines.forEach((borderLine) => {
            // 每次更新移动起始索引（控制动画速度）
            borderLine.startIndex += 2; // 每次前进2个点

            // 循环播放：当起始索引超出总点数时重置
            if (borderLine.startIndex >= borderLine.totalPoints) {
              borderLine.startIndex = 0;
            }

            // 构建当前应该显示的点位数组（头尾连贯）
            const currentPositions = [];

            for (let i = 0; i < borderLine.halfPoints; i++) {
              // 计算当前点的索引（循环取模）
              const pointIndex =
                (borderLine.startIndex + i) % borderLine.totalPoints;
              const posIndex = pointIndex * 3;

              // 添加该点的x, y, z坐标
              currentPositions.push(
                borderLine.fullPositions[posIndex],
                borderLine.fullPositions[posIndex + 1],
                borderLine.fullPositions[posIndex + 2]
              );
            }

            // 更新Line2
            borderLine.geometry.setPositions(currentPositions);
            borderLine.line.computeLineDistances();

            // 标记geometry需要更新
            if (borderLine.geometry.attributes.instanceStart) {
              borderLine.geometry.attributes.instanceStart.needsUpdate = true;
              borderLine.geometry.attributes.instanceEnd.needsUpdate = true;
            }
          });
        }
      }

      // 更新3D文字标签的浮动动画
      if (currentTextLabel && currentTextLabel.userData) {
        // 更新浮动偏移量（使用正弦波实现上下浮动）
        currentTextLabel.userData.floatOffset += LABEL_CONFIG.floatSpeed;

        // 计算当前Y位置：基础高度 + 正弦波浮动（范围：0到floatRange）
        const floatY =
          Math.sin(currentTextLabel.userData.floatOffset) *
          LABEL_CONFIG.floatRange;
        currentTextLabel.position.y = currentTextLabel.userData.baseY + floatY;

        // 文字始终面向相机（Billboard效果 - 广告牌效果）
        if (camera) {
          // 直接复制相机的旋转四元数，实现完美的Billboard效果
          // 这样文字会始终正面朝向相机，无论相机从哪个角度观察
          currentTextLabel.quaternion.copy(camera.quaternion);
        }
      }

      // Sprite会自动面向相机，无需手动更新Billboard效果

      // 更新脉冲位置动画
      flylinePulsesArray.forEach(pulse => {
        if (!pulse.userData) return;

        // 更新进度
        pulse.userData.progress += FLYLINE_CONFIG.pulseSpeed;

        // 循环播放
        if (pulse.userData.progress > 1) {
          pulse.userData.progress = 0;
        }

        // 根据进度更新脉冲位置
        const curve = pulse.userData.curve;
        if (curve) {
          // 计算脉冲在曲线上的位置
          const progress = (pulse.userData.progress + pulse.userData.startTime) % 1;

          // 更新脉冲的位置和方向
          // 需要重新创建脉冲的路径
          const pulseLength = FLYLINE_CONFIG.pulseLength;
          const startProgress = Math.max(0, progress - pulseLength);
          const endProgress = progress;

          // 获取脉冲路径的点
          const pulsePoints = [];
          const segments = 20;
          for (let i = 0; i <= segments; i++) {
            const t = startProgress + (endProgress - startProgress) * (i / segments);
            pulsePoints.push(curve.getPoint(t));
          }

          // 更新脉冲路径
          if (pulsePoints.length > 1) {
            const newPulsePath = new THREE.CatmullRomCurve3(pulsePoints);

            // 重新创建管道几何体
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

            // 应用自定义半径
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

            // 替换几何体
            if (pulse.geometry) {
              pulse.geometry.dispose();
            }
            pulse.geometry = newTubeGeometry;
          }
        }
      });

      // 更新波纹扩散动画
      flylineRipplesArray.forEach(ripple => {
        if (ripple.material && ripple.material.uniforms && ripple.material.uniforms.time) {
          ripple.material.uniforms.time.value += FLYLINE_CONFIG.rippleSpeed;
        }
      });

      // 更新角度显示（用于调试）
      // 使用后处理渲染
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

      // 移除事件监听器
      if (container.value) {
        container.value.removeEventListener("mousemove", onMouseMove);
        container.value.removeEventListener("mouseleave", onMouseLeave);
      }
      window.removeEventListener("resize", onWindowResize);

      // 清理射线拾取相关资源
      hoveredMesh = null;
      hoveredProvinceName = null;

      // 清理3D文字标签（Troika Text对象）
      if (currentTextLabel) {
        scene.remove(currentTextLabel);
        if (currentTextLabel.dispose) {
          currentTextLabel.dispose();
        }
        currentTextLabel = null;
      }

      // 清理省级图标Sprite
      provinceIconsArray.forEach((icon) => {
        scene.remove(icon);
        if (icon.material) {
          if (icon.material.map) icon.material.map.dispose();
          icon.material.dispose();
        }
      });
      provinceIconsArray = [];

      // 清理省级标签
      provinceLabelsArray.forEach((label) => {
        scene.remove(label);
        if (label.material) {
          if (label.material.map) label.material.map.dispose();
          label.material.dispose();
        }
      });
      provinceLabelsArray = [];
      provinceDataArray = [];

      // 清理飞线
      flylinesArray.forEach((flyline) => {
        scene.remove(flyline);
        if (flyline.geometry) flyline.geometry.dispose();
        if (flyline.material) flyline.material.dispose();
      });
      flylinesArray = [];

      // 清理波纹
      flylineRipplesArray.forEach((ripple) => {
        scene.remove(ripple);
        if (ripple.geometry) ripple.geometry.dispose();
        if (ripple.material) ripple.material.dispose();
      });
      flylineRipplesArray = [];

      // 清理中国地图中心波纹
      centerRipplesArray.forEach((ripple) => {
        scene.remove(ripple);
        if (ripple.geometry) ripple.geometry.dispose();
        if (ripple.material) ripple.material.dispose();
      });
      centerRipplesArray = [];

      // 停止中国地图中心波纹定时器
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

    /**
     * 切换数据类型（切换光柱、标牌、飞线或波纹显示/隐藏）
     * @param {string} type - 数据类型（'pillar'、'label'、'flyline' 或 'ripple'）
     */
    const switchDataType = (type) => {
      currentDataType.value = type;

      if (type === 'pillar') {
        // 切换光柱显示状态
        showPillars.value = !showPillars.value;

        // 更新光柱可见性
        lightPillarsArray.forEach(pillar => {
          pillar.visible = showPillars.value;
        });

        // 更新光柱顶部标签可见性（与光柱绑定，同步显示/隐藏）
        pillarLabelsArray.forEach(label => {
          label.visible = showPillars.value;
        });
      } else if (type === 'label') {
        // 切换标牌显示状态
        showLabels.value = !showLabels.value;

        // 更新省份标签可见性
        provinceLabelsArray.forEach(label => {
          label.visible = showLabels.value;
        });

        // 更新省份图标可见性
        provinceIconsArray.forEach(icon => {
          icon.visible = showLabels.value;
        });
      } else if (type === 'flyline') {
        // 切换飞线显示状态
        showFlylines.value = !showFlylines.value;

        // 如果是第一次显示飞线，需要创建飞线
        if (showFlylines.value && flylinesArray.length === 0) {
          createFlylines();
        }

        // 更新飞线可见性
        flylinesArray.forEach(flyline => {
          flyline.visible = showFlylines.value;
        });

        // 更新脉冲可见性
        flylinePulsesArray.forEach(pulse => {
          pulse.visible = showFlylines.value;
        });

        // 更新波纹可见性
        flylineRipplesArray.forEach(ripple => {
          ripple.visible = showFlylines.value;
        });
      } else if (type === 'ripple') {
        // 切换波纹显示状态
        showRipples.value = !showRipples.value;

        // 如果是第一次显示波纹，需要创建波纹效果    
        if (showRipples.value && centerRipplesArray.length === 0) {        
          createDefaultRipples();
        }

        // 启动或停止波纹效果
        if (showRipples.value) {
          startCenterRippleTimer();
        } else {
          stopCenterRippleTimer();
        }

        // 更新波纹可见性
        centerRipplesArray.forEach(ripple => {
          ripple.visible = showRipples.value;
        });
      }
    };

    /**
     * 切换光柱辉光效果
     */
    const togglePillarGlow = () => {
      // 更新所有光柱材质的辉光开关
      lightPillarsArray.forEach(pillar => {
        if (pillar.material && pillar.material.uniforms && pillar.material.uniforms.glowEnabled) {
          pillar.material.uniforms.glowEnabled.value = pillarGlowEnabled.value ? 1.0 : 0.0;
        }
      });
    };

    /**
     * 切换脉冲辉光效果
     */
    const togglePulseGlow = () => {
      // 更新所有脉冲材质的辉光开关
      flylinePulsesArray.forEach(pulse => {
        if (pulse.material && pulse.material.uniforms && pulse.material.uniforms.glowEnabled) {
          pulse.material.uniforms.glowEnabled.value = pulseGlowEnabled.value ? 1.0 : 0.0;
        }
      });
    };

    onMounted(() => {
      initScene();
      loadChineseTypeface(); // 预加载中文typeface.json（若存在）
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
