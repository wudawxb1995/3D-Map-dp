<template>
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <!-- 折叠按钮 -->
    <button class="toggle-btn" @click="toggleSidebar">
      <span class="icon">{{ isCollapsed ? '▶' : '◀' }}</span>
    </button>
    
    <!-- 侧边栏内容 -->
    <div class="sidebar-content" v-show="!isCollapsed">
      <div class="sidebar-header">
        <h2>地图展示</h2>
      </div>
      
      <nav class="sidebar-nav">
        <ul class="nav-list">
          <li class="nav-item">
            <router-link to="/" class="nav-link">
              <span class="nav-text">🏠 首页</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/points/basic" class="nav-link">
              <span class="nav-text">📍 基础点效果</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/lines/flying" class="nav-link">
              <span class="nav-text">✈️ 飞线效果</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/lines/flow-lines" class="nav-link">
              <span class="nav-text">🌊 流动线效果</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/surfaces/basic" class="nav-link">
              <span class="nav-text">🗺️ 基础面效果</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/volumes/basic" class="nav-link">
              <span class="nav-text">🏢 基础体效果</span>
            </router-link>
          </li>
        </ul>
      </nav>
    </div>
  </aside>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'Sidebar',
  setup() {
    const isCollapsed = ref(false)

    const toggleSidebar = () => {
      isCollapsed.value = !isCollapsed.value
    }

    return {
      isCollapsed,
      toggleSidebar
    }
  }
}
</script>

<style scoped>
.sidebar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  min-width: 200px;
  max-width: 250px;
}

.sidebar.collapsed {
  min-width: auto;
}

.toggle-btn {
  position: absolute;
  top: 0;
  right: -32px;
  width: 32px;
  height: 48px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 1);
}

.sidebar-content {
  padding: 0;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: white;
  border-radius: 8px 8px 0 0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

.sidebar-nav {
  padding: 10px 0;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  margin-bottom: 1px;
}

.nav-link {
  display: block;
  padding: 12px 20px;
  color: #495057;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.nav-link:hover {
  background: #e9ecef;
  color: #212529;
}

.nav-link.router-link-active {
  background: #007bff;
  color: white;
  border-left-color: #0056b3;
}

.nav-text {
  display: block;
}

.icon {
  font-size: 14px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    top: 10px;
    left: 10px;
    min-width: 180px;
    max-width: 220px;
  }
  
  .toggle-btn {
    width: 28px;
    height: 42px;
    right: -28px;
  }
  
  .sidebar-header {
    padding: 12px 16px;
  }
  
  .sidebar-header h2 {
    font-size: 14px;
  }
  
  .nav-link {
    padding: 10px 15px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .sidebar {
    min-width: 160px;
    max-width: 180px;
  }
}</style>