<template>
  <div class="main-layout">
    <main class="content-area">
      <router-view />
    </main>
    <Sidebar />
  </div>
</template>

<script>
import Sidebar from './Sidebar.vue'

export default {
  name: 'MainLayout',
  components: {
    Sidebar
  }
}
</script>

<style scoped>
.main-layout {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.content-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-layout {
    height: 100vh;
  }
  
  .content-area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
}
</style>