<template>
  <div class="settings">
    <div class="page-header">
      <h1>系统设置</h1>
      <p>配置三维引擎平台的相关参数和偏好设置</p>
    </div>

    <div class="settings-sections">
      <!-- 地图设置 -->
      <div class="settings-section">
        <h3>🗺️ 地图设置</h3>
        <div class="settings-group">
          <div class="setting-item">
            <label>默认地图引擎</label>
            <select v-model="settings.defaultEngine">
              <option value="mapbox">MapboxGL</option>
              <option value="cesium">Cesium</option>
              <option value="maplibre">MapLibre</option>
            </select>
          </div>

          <div class="setting-item">
            <label>默认地图样式</label>
            <select v-model="settings.defaultStyle">
              <option value="streets">街道图</option>
              <option value="satellite">卫星图</option>
              <option value="dark">深色主题</option>
              <option value="light">浅色主题</option>
            </select>
          </div>

          <div class="setting-item">
            <label>初始缩放级别</label>
            <input 
              type="range" 
              v-model="settings.zoomLevel" 
              min="1" 
              max="20" 
              step="1"
            >
            <span class="value-display">{{ settings.zoomLevel }}</span>
          </div>
        </div>
      </div>

      <!-- 界面设置 -->
      <div class="settings-section">
        <h3>🎨 界面设置</h3>
        <div class="settings-group">
          <div class="setting-item">
            <label>主题模式</label>
            <select v-model="settings.theme">
              <option value="light">浅色主题</option>
              <option value="dark">深色主题</option>
              <option value="auto">自动跟随系统</option>
            </select>
          </div>

          <div class="setting-item">
            <label>语言设置</label>
            <select v-model="settings.language">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>

          <div class="setting-item">
            <label>
              <input type="checkbox" v-model="settings.animations">
              启用动画效果
            </label>
          </div>
        </div>
      </div>

      <!-- 三维引擎设置 -->
      <div class="settings-section">
        <h3>⚙️ 引擎设置</h3>
        <div class="settings-group">
          <div class="setting-item">
            <label>渲染质量</label>
            <select v-model="settings.renderQuality">
              <option value="low">低质量</option>
              <option value="medium">中等质量</option>
              <option value="high">高质量</option>
              <option value="ultra">超高质量</option>
            </select>
          </div>

          <div class="setting-item">
            <label>抗锯齿级别</label>
            <select v-model="settings.antialiasing">
              <option value="none">无</option>
              <option value="2x">2x MSAA</option>
              <option value="4x">4x MSAA</option>
              <option value="8x">8x MSAA</option>
            </select>
          </div>

          <div class="setting-item">
            <label>
              <input type="checkbox" v-model="settings.shadows">
              启用阴影渲染
            </label>
          </div>

          <div class="setting-item">
            <label>
              <input type="checkbox" v-model="settings.reflections">
              启用反射效果
            </label>
          </div>
        </div>
      </div>

      <!-- 数据管理 -->
      <div class="settings-section">
        <h3>💾 数据管理</h3>
        <div class="settings-group">
          <div class="setting-item">
            <label>缓存大小限制</label>
            <input 
              type="range" 
              v-model="settings.cacheSize" 
              min="100" 
              max="2000" 
              step="100"
            >
            <span class="value-display">{{ settings.cacheSize }} MB</span>
          </div>

          <div class="setting-item">
            <label>自动保存间隔</label>
            <select v-model="settings.autoSaveInterval">
              <option value="30000">30秒</option>
              <option value="60000">1分钟</option>
              <option value="300000">5分钟</option>
              <option value="600000">10分钟</option>
            </select>
          </div>

          <div class="setting-item">
            <button class="btn-clear" @click="clearCache">
              清除缓存数据
            </button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="btn-primary" @click="saveSettings">
          保存设置
        </button>
        <button class="btn-secondary" @click="resetSettings">
          恢复默认
        </button>
        <button class="btn-outline" @click="cancelChanges">
          取消
        </button>
      </div>

      <!-- 设置状态 -->
      <div v-if="saveStatus" :class="['save-status', saveStatus.type]">
        {{ saveStatus.message }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Settings',
  data() {
    return {
      settings: {
        defaultEngine: 'mapbox',
        defaultStyle: 'streets',
        zoomLevel: 10,
        theme: 'light',
        language: 'zh-CN',
        animations: true,
        renderQuality: 'high',
        antialiasing: '4x',
        shadows: true,
        reflections: false,
        cacheSize: 500,
        autoSaveInterval: '300000'
      },
      saveStatus: null
    }
  },
  methods: {
    saveSettings() {
      console.log('保存设置:', this.settings)
      
      // 模拟保存操作
      this.saveStatus = {
        type: 'success',
        message: '设置已成功保存！'
      }
      
      setTimeout(() => {
        this.saveStatus = null
      }, 3000)
    },
    
    resetSettings() {
      if (confirm('确定要恢复默认设置吗？')) {
        this.settings = {
          defaultEngine: 'mapbox',
          defaultStyle: 'streets',
          zoomLevel: 10,
          theme: 'light',
          language: 'zh-CN',
          animations: true,
          renderQuality: 'high',
          antialiasing: '4x',
          shadows: true,
          reflections: false,
          cacheSize: 500,
          autoSaveInterval: '300000'
        }
        
        this.saveStatus = {
          type: 'info',
          message: '设置已恢复为默认值'
        }
        
        setTimeout(() => {
          this.saveStatus = null
        }, 3000)
      }
    },
    
    cancelChanges() {
      this.$router.back()
    },
    
    clearCache() {
      if (confirm('确定要清除所有缓存数据吗？此操作不可撤销。')) {
        // 模拟清除缓存操作
        this.saveStatus = {
          type: 'success',
          message: '缓存数据已成功清除！'
        }
        
        setTimeout(() => {
          this.saveStatus = null
        }, 3000)
      }
    }
  }
}
</script>

<style scoped>
.settings {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  color: #2c3e50;
  font-size: 2rem;
  margin-bottom: 10px;
  font-weight: 300;
}

.page-header p {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.settings-section {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.settings-section h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
}

.setting-item select,
.setting-item input[type="range"] {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #2c3e50;
  font-size: 0.9rem;
}

.setting-item input[type="checkbox"] {
  margin-right: 8px;
}

.setting-item input[type="range"] {
  width: 100%;
}

.value-display {
  font-size: 0.8rem;
  color: #7f8c8d;
  text-align: right;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

.btn-primary {
  background: #3498db;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-outline {
  background: transparent;
  color: #3498db;
  padding: 12px 24px;
  border: 2px solid #3498db;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-outline:hover {
  background: #3498db;
  color: white;
}

.btn-clear {
  background: #e74c3c;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.save-status {
  padding: 15px;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
  margin-top: 20px;
}

.save-status.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.save-status.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.save-status.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@media (max-width: 768px) {
  .settings-group {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary,
  .btn-outline {
    width: 100%;
  }
}
</style>