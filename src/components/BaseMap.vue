<template>
  <div class="map-container">
    <div :id="containerId" class="map-view"></div>
    <slot :map="mapInstance" :isReady="isMapReady"></slot>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import { MAP_CONFIG } from '../config/mapConfig.js'

export default {
  name: 'BaseMap',
  props: {
    // 地图容器ID
    containerId: {
      type: String,
      default: MAP_CONFIG.CONTAINER_ID
    },
    // 初始中心点
    center: {
      type: Array,
      default: () => MAP_CONFIG.BEIJING_CENTER
    },
    // 初始缩放级别
    zoom: {
      type: Number,
      default: MAP_CONFIG.DEFAULT_ZOOM
    },
    // 地图样式
    mapStyle: {
      type: String,
      default: MAP_CONFIG.DEFAULT_STYLE
    },
    // 是否显示导航控件
    showNavigation: {
      type: Boolean,
      default: true
    },
    // 是否显示比例尺
    showScale: {
      type: Boolean,
      default: true
    }
  },
  emits: ['map-ready', 'map-load', 'map-error'],
  setup(props, { emit }) {
    const mapInstance = ref(null)
    const isMapReady = ref(false)
    let resizeObserver = null

    // 初始化地图
    const initMap = () => {
      try {
        // 设置Mapbox token
        mapboxgl.accessToken = MAP_CONFIG.ACCESS_TOKEN

        // 创建地图实例
        mapInstance.value = new mapboxgl.Map({
          container: props.containerId,
          style: props.mapStyle,
          center: props.center,
          zoom: props.zoom,
          minZoom: MAP_CONFIG.MIN_ZOOM,
          maxZoom: MAP_CONFIG.MAX_ZOOM
        })

        // 添加地图加载事件监听
        mapInstance.value.on('load', () => {
          isMapReady.value = true
          addControls()
          emit('map-ready', mapInstance.value)
          emit('map-load', mapInstance.value)
        })

        // 错误处理
        mapInstance.value.on('error', (error) => {
          console.error('地图加载错误:', error)
          emit('map-error', error)
        })

      } catch (error) {
        console.error('地图初始化失败:', error)
        emit('map-error', error)
      }
    }

    // 添加地图控件
    const addControls = () => {
      if (!mapInstance.value) return

      // 导航控件
      if (props.showNavigation) {
        const navControl = new mapboxgl.NavigationControl()
        mapInstance.value.addControl(navControl, 'top-right')
      }

      // 比例尺控件
      if (props.showScale) {
        const scaleControl = new mapboxgl.ScaleControl()
        mapInstance.value.addControl(scaleControl, 'bottom-left')
      }
    }

    // 监听属性变化
    watch(() => props.center, (newCenter) => {
      if (mapInstance.value && isMapReady.value) {
        mapInstance.value.setCenter(newCenter)
      }
    })

    watch(() => props.zoom, (newZoom) => {
      if (mapInstance.value && isMapReady.value) {
        mapInstance.value.setZoom(newZoom)
      }
    })

    // 生命周期
    onMounted(() => {
      initMap()
      
      // 监听容器大小变化
      const container = document.getElementById(props.containerId)
      if (container) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstance.value) {
            mapInstance.value.resize()
          }
        })
        resizeObserver.observe(container)
      }
    })

    onUnmounted(() => {
      // 清理资源
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      
      if (mapInstance.value) {
        mapInstance.value.remove()
        mapInstance.value = null
      }
    })

    return {
      mapInstance,
      isMapReady
    }
  }
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-view {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

/* Mapbox样式覆盖 */
:deep(.mapboxgl-ctrl-group) {
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

:deep(.mapboxgl-ctrl-group button) {
  width: 32px;
  height: 32px;
  background-color: #fff;
  border: none;
  cursor: pointer;
}

:deep(.mapboxgl-ctrl-group button:hover) {
  background-color: #f5f5f5;
}
</style>