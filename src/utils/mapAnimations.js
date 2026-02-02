import * as THREE from 'three';

/**
 * 缓动函数 - easeInOutCubic
 * @param {number} t - 进度值 (0-1)
 * @returns {number} 缓动后的值
 */
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 地图切换动画工具集
 */
export const mapAnimations = {
  /**
   * 淡出动画 - 将对象透明度从1降到0
   * @param {Array} objects - 要淡出的对象数组
   * @param {number} duration - 动画时长（毫秒）
   * @returns {Promise} 动画完成的Promise
   */
  fadeOut(objects, duration = 300) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const opacity = 1 - progress;

        // 更新所有对象的透明度
        objects.forEach(obj => {
          if (obj && obj.material) {
            obj.material.opacity = opacity;
            obj.material.transparent = true;
          }
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  },

  /**
   * 淡入动画 - 将对象透明度从0升到1
   * @param {Array} objects - 要淡入的对象数组
   * @param {number} duration - 动画时长（毫秒）
   * @returns {Promise} 动画完成的Promise
   */
  fadeIn(objects, duration = 400) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const opacity = progress;

        // 更新所有对象的透明度
        objects.forEach(obj => {
          if (obj && obj.material) {
            obj.material.opacity = opacity;
            obj.material.transparent = true;
          }
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // 动画结束后，恢复完全不透明的材质
          objects.forEach(obj => {
            if (obj && obj.material) {
              obj.material.opacity = 1;
            }
          });
          resolve();
        }
      };

      animate();
    });
  },

  /**
   * 相机移动动画
   * @param {THREE.Camera} camera - 相机对象
   * @param {Object} targetPosition - 目标位置 {x, y, z}
   * @param {Object} lookAtPosition - 相机朝向位置 {x, y, z}
   * @param {number} duration - 动画时长（毫秒）
   * @returns {Promise} 动画完成的Promise
   */
  moveCamera(camera, targetPosition, lookAtPosition, duration = 800) {
    return new Promise((resolve) => {
      const startPos = camera.position.clone();
      const targetPos = new THREE.Vector3(
        targetPosition.x,
        targetPosition.y,
        targetPosition.z
      );
      const lookAt = new THREE.Vector3(
        lookAtPosition.x,
        lookAtPosition.y,
        lookAtPosition.z
      );

      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        // 平滑插值相机位置
        camera.position.lerpVectors(startPos, targetPos, eased);
        camera.lookAt(lookAt);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  },

  /**
   * 相机缩放动画（调整视野距离）
   * @param {THREE.Camera} camera - 相机对象
   * @param {number} targetDistance - 目标距离
   * @param {Object} center - 缩放中心点 {x, y, z}
   * @param {number} duration - 动画时长（毫秒）
   * @returns {Promise} 动画完成的Promise
   */
  zoomCamera(camera, targetDistance, center, duration = 500) {
    return new Promise((resolve) => {
      const startPos = camera.position.clone();
      const centerVec = new THREE.Vector3(center.x, center.y, center.z);
      
      // 计算当前相机到中心的方向
      const direction = new THREE.Vector3()
        .subVectors(startPos, centerVec)
        .normalize();
      
      // 计算目标位置
      const targetPos = new THREE.Vector3()
        .copy(centerVec)
        .add(direction.multiplyScalar(targetDistance));

      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        camera.position.lerpVectors(startPos, targetPos, eased);
        camera.lookAt(centerVec);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  },

  /**
   * 组合动画 - 同时执行淡出和相机移动
   * @param {Object} params - 动画参数
   * @param {Array} params.fadeOutObjects - 要淡出的对象
   * @param {THREE.Camera} params.camera - 相机
   * @param {Object} params.targetPosition - 目标位置
   * @param {Object} params.lookAtPosition - 朝向位置
   * @returns {Promise} 动画完成的Promise
   */
  async combinedTransition({
    fadeOutObjects,
    camera,
    targetPosition,
    lookAtPosition
  }) {
    // 同时执行淡出和相机移动
    await Promise.all([
      this.fadeOut(fadeOutObjects, 300),
      this.moveCamera(camera, targetPosition, lookAtPosition, 800)
    ]);
  }
};
