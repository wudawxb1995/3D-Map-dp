<template>
  <div class="engine-demo">
    <div class="page-header">
      <h1>三维引擎演示</h1>
      <p>展示三维引擎库的核心功能和工具调用能力</p>
    </div>

    <div class="demo-sections">
      <!-- 引擎选择区域 -->
      <div class="demo-section">
        <h3>🛠️ 引擎选择</h3>
        <div class="engine-options">
          <div 
            v-for="engine in engineOptions" 
            :key="engine.id"
            :class="['engine-option', { active: selectedEngine === engine.id }]"
            @click="selectEngine(engine.id)"
          >
            <div class="engine-icon">{{ engine.icon }}</div>
            <div class="engine-info">
              <h4>{{ engine.name }}</h4>
              <p>{{ engine.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 工具调用区域 -->
      <div class="demo-section">
        <h3>⚡ 工具调用</h3>
        <div class="tool-grid">
          <div 
            v-for="tool in availableTools" 
            :key="tool.id"
            class="tool-card"
            @click="executeTool(tool.id)"
          >
            <div class="tool-icon">{{ tool.icon }}</div>
            <h4>{{ tool.name }}</h4>
            <p>{{ tool.description }}</p>
            <div class="tool-status">
              <span :class="['status-dot', tool.status]"></span>
              {{ tool.status === 'ready' ? '就绪' : '开发中' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 演示结果区域 -->
      <div class="demo-section">
        <h3>📊 演示结果</h3>
        <div class="result-area">
          <div v-if="!currentResult" class="result-placeholder">
            <div class="placeholder-icon">🔍</div>
            <p>选择工具并执行以查看演示结果</p>
          </div>
          
          <div v-else class="result-content">
            <div class="result-header">
              <h4>{{ currentResult.toolName }} 执行结果</h4>
              <button class="btn-clear" @click="clearResult">清除</button>
            </div>
            
            <div class="result-body">
              <pre>{{ currentResult.output }}</pre>
            </div>
            
            <div class="result-footer">
              <span>执行时间: {{ currentResult.timestamp }}</span>
              <span>状态: 成功</span>
            </div>
          </div>
        </div>
      </div>

      <!-- API接口预览 -->
      <div class="demo-section">
        <h3>🔌 API接口预览</h3>
        <div class="api-preview">
          <div class="api-code">
            <code>
// 三维引擎初始化示例
const engine = new ThreeDEngine({
  container: '#map-container',
  engineType: 'mapbox',
  style: 'streets'
});

// 工具调用示例
engine.tools.measureDistance({
  points: [[lng1, lat1], [lng2, lat2]],
  unit: 'meters'
});
            </code>
          </div>
          <div class="api-docs">
            <p>三维引擎库提供统一的API接口，支持多种地图引擎和工具调用。</p>
            <ul>
              <li>✅ 引擎自动适配</li>
              <li>✅ 统一工具接口</li>
              <li>✅ 异步操作支持</li>
              <li>✅ 错误处理机制</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EngineDemo',
  data() {
    return {
      selectedEngine: 'mapbox',
      currentResult: null,
      engineOptions: [
        {
          id: 'mapbox',
          name: 'MapboxGL',
          icon: '🗺️',
          description: '基于WebGL的矢量地图渲染引擎'
        },
        {
          id: 'cesium',
          name: 'Cesium',
          icon: '🌍',
          description: '专业的3D地球可视化引擎'
        },
        {
          id: 'threejs',
          name: 'Three.js',
          icon: '🎨',
          description: '强大的WebGL 3D图形库'
        }
      ],
      availableTools: [
        {
          id: 'measure',
          name: '距离测量',
          icon: '📏',
          description: '测量地图上两点之间的实际距离',
          status: 'ready'
        },
        {
          id: 'area',
          name: '面积计算',
          icon: '📐',
          description: '计算多边形区域的面积',
          status: 'ready'
        },
        {
          id: 'buffer',
          name: '缓冲区分析',
          icon: '⭕',
          description: '创建指定距离的缓冲区区域',
          status: 'developing'
        },
        {
          id: 'export',
          name: '数据导出',
          icon: '💾',
          description: '导出地图数据和分析结果',
          status: 'developing'
        }
      ]
    }
  },
  methods: {
    selectEngine(engineId) {
      this.selectedEngine = engineId
      this.showNotification(`已选择引擎: ${engineId}`)
    },
    
    executeTool(toolId) {
      const tool = this.availableTools.find(t => t.id === toolId)
      if (tool.status !== 'ready') {
        this.showNotification('该工具正在开发中，敬请期待！')
        return
      }
      
      // 模拟工具执行结果
      const result = {
        toolName: tool.name,
        output: `工具执行成功！\n引擎: ${this.selectedEngine}\n工具: ${tool.name}\n结果: 这是模拟的执行结果数据`,
        timestamp: new Date().toLocaleString()
      }
      
      this.currentResult = result
      this.showNotification(`${tool.name} 执行完成`)
    },
    
    clearResult() {
      this.currentResult = null
    },
    
    showNotification(message) {
      console.log('通知:', message)
      // 这里可以集成更优雅的通知系统
      alert(message)
    }
  }
}
</script>

<style scoped>
.engine-demo {
  max-width: 1400px;
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

.demo-sections {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.demo-section {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.demo-section h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.engine-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.engine-option {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 2px solid #e8f4f8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.engine-option:hover {
  border-color: #3498db;
  background: #e8f4f8;
}

.engine-option.active {
  border-color: #3498db;
  background: #3498db;
  color: white;
}

.engine-option.active .engine-info h4 {
  color: white;
}

.engine-option.active .engine-info p {
  color: rgba(255, 255, 255, 0.9);
}

.engine-icon {
  font-size: 2rem;
  margin-right: 15px;
}

.engine-info h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.engine-info p {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.9rem;
  line-height: 1.4;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.tool-card {
  padding: 20px;
  border: 1px solid #e8f4f8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border-color: #3498db;
}

.tool-icon {
  font-size: 2rem;
  margin-bottom: 15px;
}

.tool-card h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1rem;
}

.tool-card p {
  margin: 0 0 15px 0;
  color: #7f8c8d;
  font-size: 0.85rem;
  line-height: 1.4;
}

.tool-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.ready {
  background: #27ae60;
}

.status-dot.developing {
  background: #f39c12;
}

.result-area {
  background: #f8f9fa;
  border-radius: 8px;
  min-height: 200px;
  padding: 20px;
}

.result-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 160px;
  color: #7f8c8d;
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.result-content {
  background: white;
  border-radius: 8px;
  border: 1px solid #eee;
  overflow: hidden;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #e8f4f8;
  border-bottom: 1px solid #ddd;
}

.result-header h4 {
  margin: 0;
  color: #2c3e50;
}

.btn-clear {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.result-body {
  padding: 20px;
}

.result-body pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #2c3e50;
}

.result-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 20px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
  font-size: 0.8rem;
  color: #7f8c8d;
}

.api-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.api-code {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 20px;
  border-radius: 8px;
  overflow-x: auto;
}

.api-code code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
}

.api-docs {
  padding: 10px 0;
}

.api-docs p {
  color: #7f8c8d;
  margin-bottom: 15px;
  line-height: 1.5;
}

.api-docs ul {
  list-style: none;
  padding: 0;
}

.api-docs li {
  padding: 5px 0;
  color: #27ae60;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .api-preview {
    grid-template-columns: 1fr;
  }
  
  .engine-options {
    grid-template-columns: 1fr;
  }
  
  .tool-grid {
    grid-template-columns: 1fr;
  }
}
</style>