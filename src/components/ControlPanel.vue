<template>
  <div class="control-panel" :class="{ 'collapsed': isCollapsed }">
    <!-- 折叠按钮 -->
    <button class="toggle-btn" @click="togglePanel">
      <span class="icon">{{ isCollapsed ? '◀' : '▶' }}</span>
    </button>
    
    <!-- 面板内容 -->
    <div class="panel-content" v-show="!isCollapsed">
      <div class="panel-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="togglePanel">×</button>
      </div>
      <div class="panel-body">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'ControlPanel',
  props: {
    title: {
      type: String,
      default: '控制面板'
    },
    defaultCollapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle'],
  setup(props, { emit }) {
    const isCollapsed = ref(props.defaultCollapsed)

    const togglePanel = () => {
      isCollapsed.value = !isCollapsed.value
      emit('toggle', isCollapsed.value)
    }

    return {
      isCollapsed,
      togglePanel
    }
  }
}
</script>

<style scoped>
.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  min-width: 280px;
  max-width: 320px;
}

.control-panel.collapsed {
  min-width: auto;
}

.toggle-btn {
  position: absolute;
  top: 0;
  left: -32px;
  width: 32px;
  height: 48px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 1);
}

.panel-content {
  padding: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #212529;
}

.panel-body {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel {
    top: 10px;
    right: 10px;
    min-width: 240px;
    max-width: 280px;
  }
  
  .toggle-btn {
    width: 28px;
    height: 42px;
    left: -28px;
  }
  
  .panel-header {
    padding: 12px 16px;
  }
  
  .panel-header h3 {
    font-size: 14px;
  }
  
  .panel-body {
    padding: 16px;
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .control-panel {
    min-width: 200px;
    max-width: 220px;
  }
}
</style>