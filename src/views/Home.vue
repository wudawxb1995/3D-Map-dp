<template>
  <div class="home">
    <div class="map-container">
      <China3DMap />
    </div>
  </div>
</template>

<script>
import China3DMap from '@/components/China3DMap.vue'

export default {
  name: 'Home',
  components: {
    China3DMap
  }
}
</script>

<style scoped>
.home {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #0a0a0a;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
</style>