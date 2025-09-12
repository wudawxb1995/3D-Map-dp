<template>
  <div class="demo-container">
    <h2>飞线效果</h2>
    <div class="demo-content">
      <div class="canvas-placeholder">
        <p>飞线效果三维展示区域</p>
        <small>这里将展示动态的飞线三维效果</small>
      </div>
      
      <div class="controls">
        <h3>飞线控制</h3>
        <div class="control-group">
          <label>飞线速度:</label>
          <input type="range" min="1" max="10" value="3" />
        </div>
        <div class="control-group">
          <label>飞线颜色:</label>
          <input type="color" value="#4ecdc4" />
        </div>
        <div class="control-group">
          <label>飞线宽度:</label>
          <input type="range" min="1" max="10" value="2" />
        </div>
        <div class="control-group">
          <label>轨迹长度:</label>
          <input type="range" min="10" max="100" value="50" />
        </div>
        <button class="control-button" @click="toggleAnimation">
          {{ isAnimating ? '暂停' : '播放' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FlyLines',
  data() {
    return {
      isAnimating: true
    }
  },
  methods: {
    toggleAnimation() {
      this.isAnimating = !this.isAnimating
      console.log('动画状态:', this.isAnimating ? '播放中' : '已暂停')
    }
  },
  mounted() {
    console.log('飞线效果组件已加载')
    // 这里将集成Three.js飞线效果初始化代码
  }
}
</script>

<style scoped>
.demo-container {
  padding: 20px;
  height: 100%;
}

.demo-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  height: calc(100vh - 100px);
}

.canvas-placeholder {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  padding: 40px;
}

.canvas-placeholder p {
  font-size: 1.5rem;
  margin-bottom: 10px;
  font-weight: 300;
}

.canvas-placeholder small {
  opacity: 0.8;
}

.controls {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.controls h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #495057;
}

.control-group input[type="range"] {
  width: 100%;
}

.control-group input[type="color"] {
  width: 100%;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.control-button {
  width: 100%;
  padding: 10px;
  background: #4ecdc4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.control-button:hover {
  background: #44b7b0;
}
</style>