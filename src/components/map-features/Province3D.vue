<template>
  <div ref="container" class="province-3d-container"></div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default {
  name: "Province3D",
  props: {
    chinaData: {
      type: Object,
      required: true
    },
    chinaBorderData: {
      type: Object,
      required: true
    },
    mapConfig: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const container = ref(null);
    let scene, camera, renderer, controls;
    
    // 初始化场景
    const initScene = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      // 创建场景
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a);

      // 创建相机
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

      // 创建渲染器
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

      // 设置控制器
      setupControls();

      // 开始渲染
      animate();
    };

    // 设置控制器
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

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controls) {
        controls.update();
        
        // 限制平移距离范围
        const targetDistance = controls.target.length();
        if (targetDistance > controls.maxPanDistance) {
          controls.target.normalize().multiplyScalar(controls.maxPanDistance);
        }
      }
      
      renderer.render(scene, camera);
    };

    // 窗口大小调整
    const onWindowResize = () => {
      const width = container.value.clientWidth;
      const height = container.value.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    // 添加事件监听器
    const addEventListeners = () => {
      window.addEventListener("resize", onWindowResize);
    };

    // 清理资源
    const cleanup = () => {
      if (controls) {
        controls.dispose();
      }
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
      addEventListeners();
    });

    onUnmounted(() => {
      cleanup();
    });

    return {
      container
    };
  }
};
</script>

<style scoped>
.province-3d-container {
  width: 100%;
  height: 100%;
}
</style>