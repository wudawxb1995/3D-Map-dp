<template>
  <div ref="container" class="china-3d-container"></div>
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
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import * as dat from "dat.gui";

import FZLISHU_TYPEFACE_URL from "@/assets/fonts/FZLiShu-S01_Regular.json?url";
import FZWEIBEI_TYPEFACE_URL from "@/assets/fonts/FZWeiBei-S03_Regular.json?url";

export default {
  name: "China3DMap",
  setup() {
    const container = ref(null);
    let scene, camera, renderer, composer;
    let provinces = [];
    const animationId = ref(null);
    let gui = null; // dat.GUI实例
    let bloomPass = null; // Bloom通道引用

    // 射线拾取相关变量
    let raycaster = null;
    let mouse = new THREE.Vector2();
    let hoveredMesh = null; // 当前悬停的网格
    const originalColors = new Map(); // 保存原始颜色

    // 3D文字标签相关变量
    let currentTextLabel = null; // 当前显示的3D文字标签

    let cnFont = null; // 中文 typeface.json 字体对象（TextGeometry 使用）
    // 最近一次标签状态（用于在中文字体JSON加载后自动创建文字）
    let lastLabelState = { text: "", position: null, baseHeight: 0 };

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
      textColor: 0xffff00, // 文字颜色（金黄色）
      outlineColor: 0xffd700, // 边缘颜色（金黄色）
      textDepth: 500, // 文字厚度 - 加深厚度
      bevelEnabled: true, // 启用斜角
      bevelThickness: 50, // 斜角厚度
      bevelSize: 30, // 斜角大小
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

      // 创建渲染器 - 确保不透明渲染
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false, // 禁用alpha通道确保不透明背景
      });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = false;
      renderer.setClearColor(0x0a0a0a, 1); // 设置完全不透明的背景色

      // 启用深度测试，确保正确的遮挡关系
      renderer.sortObjects = true; // 启用对象排序

      container.value.appendChild(renderer.domElement);

      // 初始化后处理效果
      composer = new EffectComposer(renderer);

      // 添加渲染通道
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      // 添加UnrealBloom通道（针对3D文字和边缘流线）- 降低强度避免过亮
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height), // 降低分辨率提升性能
        // new THREE.Vector2(width * 0.5, height * 0.5), // 降低分辨率提升性能
        0.5, // 强度（从1.5降低到0.6）
        0.3, // 半径（从0.4降低到0.3）
        0.9 // 阈值（从0.85提高到0.9，减少发光对象）
      );
      composer.addPass(bloomPass);

      // 添加FXAA抗锯齿通道
      const fxaaPass = new ShaderPass(FXAAShader);
      fxaaPass.material.uniforms["resolution"].value.x = 1 / width;
      fxaaPass.material.uniforms["resolution"].value.y = 1 / height;
      composer.addPass(fxaaPass);

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

      // 3D文字材质：确保始终显示在最上层，并添加Bloom发光效果
      const materials = [
        new THREE.MeshPhongMaterial({
          color: LABEL_CONFIG.textColor,
          flatShading: true,
          side: THREE.DoubleSide,
          transparent: true, // 启用透明以支持renderOrder排序
          opacity: 1.0, // 完全不透明
          emissive: LABEL_CONFIG.textColor, // 自发光颜色（用于Bloom效果）
          emissiveIntensity: 0.5, // 低自发光强度，减少辉光效果
          depthTest: false, // 禁用深度测试，始终显示在最前面
          depthWrite: false, // 禁用深度写入，不被其他物体遮挡
        }), // front/back
        new THREE.MeshPhongMaterial({
          color: LABEL_CONFIG.outlineColor,
          transparent: true, // 启用透明以支持renderOrder排序
          opacity: 1.0, // 完全不透明
          emissive: LABEL_CONFIG.outlineColor, // 自发光颜色（用于Bloom效果）
          emissiveIntensity: 0, // 边缘不发光
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

      // 1. 创建省份顶面（使用 chinaData）
      chinaData.features.forEach((feature) => {
        createProvinceTopMesh(feature, center, scale);
      });

      // 2. 创建国界侧面（使用 chinaBorderData）
      chinaBorderData.features.forEach((feature) => {
        createBorderSideMesh(feature, center, scale);
      });

      // 3. 创建中国边界线动画（基于 chinaBorderData，排除台湾）
      createChinaBorderLineAnimation(center, scale);
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
          color: 0x118cbc, // #118cbc
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
        line.position.y = actualExtrudeHeight + 10;

        // 设置渲染顺序，确保边界线在顶面之上
        line.renderOrder = 3;

        // 保存 LineMaterial 引用，用于窗口调整时更新分辨率
        if (!scene.userData.lineMaterials) {
          scene.userData.lineMaterials = [];
        }
        scene.userData.lineMaterials.push(lineMaterial);

        provinceGroup.add(line);
      });

      scene.add(provinceGroup);

      provinces.push({
        group: provinceGroup,
        meshes: provinceGroup.children.filter(
          (child) => child.type === "Mesh" && child.geometry
        ),
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

        // 侧面材质 - 垂直流动光带效果
        const sideMaterial = new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          depthTest: false,
          uniforms: {
            time: { value: 0.0 },
            num: { value: 3.0 }, // 光带数量
            color1: { value: new THREE.Color("#00FFFF") },
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

              // 增强发光效果以触发Bloom后处理 - 提高亮度以产生强烈辉光
              // vec3 glowColor = color1 * (1.5 + alpha * 2.0); // 大幅增强亮度

              gl_FragColor = vec4(color1, alpha);
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

        // 创建 LineMaterial - 高亮度以产生强烈辉光效果
        const lineMaterial = new LineMaterial({
          color: 0xffffff, // 纯白色，最高亮度
          linewidth: 4, // 恢复线宽到4px
          transparent: true,
          opacity: 1, // 完全不透明
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
          // 恢复之前悬停网格的颜色
          restoreMeshColor();

          // 保存新网格的原始颜色
          saveOriginalColor(mesh);

          // 设置新网格为橘色
          setMeshHoverColor(mesh);

          // 更新当前悬停的网格
          hoveredMesh = mesh;

          // 创建3D文字标签
          const provinceName = mesh.userData.name;
          // 找到该省份的所有mesh，计算整体中心
          const province = provinces.find((p) => p.name === provinceName);
          const provinceCenter = calculateProvinceCenter(province);
          const baseHeight = 15000; // 地块顶面高度
          create3DTextLabel(provinceName, provinceCenter, baseHeight);
        }
      } else {
        // 鼠标没有悬停在任何网格上，恢复颜色并移除文字标签
        restoreMeshColor();

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
      restoreMeshColor();

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
     * 保存网格的原始颜色
     * @param {THREE.Mesh} mesh - 要保存颜色的网格
     */
    const saveOriginalColor = (mesh) => {
      if (!originalColors.has(mesh)) {
        // 保存原始颜色和透明度
        originalColors.set(mesh, {
          color: mesh.material.color.getHex(),
          opacity: mesh.material.opacity,
        });
      }
    };

    /**
     * 设置网格的悬停颜色（橘色）
     * @param {THREE.Mesh} mesh - 要设置颜色的网格
     */
    const setMeshHoverColor = (mesh) => {
      // 设置为金黄色/橙黄色，与文字的黄色保持和谐
      mesh.material.color.setHex(0xd4a017); // 金黄色，与文字的黄色形成和谐对比
    };

    /**
     * 恢复网格的原始颜色
     */
    const restoreMeshColor = () => {
      if (hoveredMesh && originalColors.has(hoveredMesh)) {
        const original = originalColors.get(hoveredMesh);
        // 恢复原始颜色，保持透明度不变
        hoveredMesh.material.color.setHex(original.color);
        // 清除悬停状态
        hoveredMesh = null;
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

      // 更新FXAA分辨率
      const fxaaPass = composer.passes.find(
        (pass) => pass.material && pass.material.uniforms.resolution
      );
      if (fxaaPass) {
        fxaaPass.material.uniforms["resolution"].value.x = 1 / width;
        fxaaPass.material.uniforms["resolution"].value.y = 1 / height;
      }

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
                material.uniforms.time.value += 0.002;
              }
            });
          }
        });
      }

      // 更新中国边界线动画 - 滚动显示一半的点（头尾连贯）
      if (scene.userData.borderLines) {
        scene.userData.borderLines.forEach((borderLine) => {
          // 每帧移动起始索引（控制动画速度）
          borderLine.startIndex += 2; // 每帧前进2个点

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
      originalColors.clear();

      // 清理3D文字标签（Troika Text对象）
      if (currentTextLabel) {
        scene.remove(currentTextLabel);
        if (currentTextLabel.dispose) {
          currentTextLabel.dispose();
        }
        currentTextLabel = null;
      }

      if (renderer) {
        renderer.dispose();
      }
      if (container.value && renderer) {
        container.value.removeChild(renderer.domElement);
      }

      // 清理GUI
      if (gui) {
        gui.destroy();
        gui = null;
      }
    };

    /**
     * 初始化GUI控制面板
     */
    const initGUI = () => {
      // 创建GUI实例
      gui = new dat.GUI({ autoPlace: false });
      gui.domElement.style.position = "absolute";
      gui.domElement.style.left = "20px";
      gui.domElement.style.bottom = "20px";
      gui.domElement.style.zIndex = "1000";
      container.value.appendChild(gui.domElement);

      // Bloom效果参数
      const bloomParams = {
        enabled: true,
        strength: 0.5,
        radius: 0.3,
        threshold: 0.9,
      };

      // 添加Bloom控制文件夹
      const bloomFolder = gui.addFolder("Bloom效果");

      bloomFolder
        .add(bloomParams, "enabled")
        .name("启用Bloom")
        .onChange((value) => {
          if (bloomPass) {
            bloomPass.enabled = value;
          }
        });

      bloomFolder
        .add(bloomParams, "strength", 0, 3, 0.1)
        .name("强度")
        .onChange((value) => {
          if (bloomPass) {
            bloomPass.strength = value;
          }
        });

      bloomFolder
        .add(bloomParams, "radius", 0, 1, 0.05)
        .name("半径")
        .onChange((value) => {
          if (bloomPass) {
            bloomPass.radius = value;
          }
        });

      bloomFolder
        .add(bloomParams, "threshold", 0, 1, 0.05)
        .name("阈值")
        .onChange((value) => {
          if (bloomPass) {
            bloomPass.threshold = value;
          }
        });

      bloomFolder.open();
    };

    onMounted(() => {
      initScene();
      loadChineseTypeface(); // 预加载中文typeface.json（若存在）
      initGUI(); // 初始化GUI控制面板
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
