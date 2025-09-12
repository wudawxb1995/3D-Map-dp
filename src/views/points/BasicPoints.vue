<template>
  <div class="map-view-container">
    <BaseMap
      :center="[116.4074, 39.9042]"
      :zoom="10"
      @map-ready="onMapReady"
    />
    
    <!-- 控制面板 -->
    <ControlPanel title="基础点效果">
      <div class="control-content">
        <div class="control-group">
          <label>点数量:</label>
          <input 
            type="range" 
            min="10" 
            max="1000" 
            v-model="pointCount" 
            @input="updatePoints"
          />
          <span class="value">{{ pointCount }}</span>
        </div>
        
        <div class="control-group">
          <label>点大小:</label>
          <input 
            type="range" 
            min="1" 
            max="20" 
            v-model="pointSize" 
            @input="updatePoints"
          />
          <span class="value">{{ pointSize }}px</span>
        </div>
        
        <div class="control-group">
          <label>颜色模式:</label>
          <select v-model="colorMode" @change="updatePoints">
            <option value="rainbow">彩虹色</option>
            <option value="gradient">渐变</option>
            <option value="single">单色</option>
          </select>
        </div>
        
        <div class="button-group">
          <button @click="generateRandomPoints" class="btn btn-primary">
            生成随机点
          </button>
          <button @click="clearPoints" class="btn btn-secondary">
            清除点
          </button>
        </div>
      </div>
    </ControlPanel>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import BaseMap from '@/components/BaseMap.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import { MAP_CONFIG } from '@/config/mapConfig.js'

export default {
  name: 'BasicPoints',
  components: {
    BaseMap,
    ControlPanel
  },
  setup() {
    const map = ref(null)
    const pointCount = ref(100)
    const pointSize = ref(8)
    const colorMode = ref('rainbow')
    const pointsLayerId = 'basic-points-layer'
    const pointsSourceId = 'basic-points-source'

    // 生成随机点数据
    const generateRandomPoints = () => {
      if (!map.value) return

      const points = []
      const center = MAP_CONFIG.BEIJING_CENTER
      
      for (let i = 0; i < pointCount.value; i++) {
        const lng = center[0] + (Math.random() - 0.5) * 0.2
        const lat = center[1] + (Math.random() - 0.5) * 0.2
        
        points.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: {
            id: i,
            value: Math.random() * 100
          }
        })
      }

      // 清除旧图层
      clearPoints()

      // 添加新数据源
      map.value.addSource(pointsSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: points
        }
      })

      // 添加点图层
      map.value.addLayer({
        id: pointsLayerId,
        type: 'circle',
        source: pointsSourceId,
        paint: {
          'circle-radius': pointSize.value,
          'circle-color': getColorExpression(),
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.8
        }
      })

      // 添加悬停效果
      map.value.on('mouseenter', pointsLayerId, () => {
        map.value.getCanvas().style.cursor = 'pointer'
      })

      map.value.on('mouseleave', pointsLayerId, () => {
        map.value.getCanvas().style.cursor = ''
      })

      // 添加点击事件
      map.value.on('click', pointsLayerId, (e) => {
        const feature = e.features[0]
        new mapboxgl.Popup()
          .setLngLat(feature.geometry.coordinates)
          .setHTML(`
            <div style="padding: 8px;">
              <h4>点信息</h4>
              <p>ID: ${feature.properties.id}</p>
              <p>值: ${feature.properties.value.toFixed(2)}</p>
            </div>
          `)
          .addTo(map.value)
      })
    }

    // 获取颜色表达式
    const getColorExpression = () => {
      switch (colorMode.value) {
        case 'rainbow':
          return [
            'interpolate',
            ['linear'],
            ['get', 'value'],
            0, '#ff0000',
            25, '#ff8000',
            50, '#ffff00',
            75, '#00ff00',
            100, '#0000ff'
          ]
        case 'gradient':
          return [
            'interpolate',
            ['linear'],
            ['get', 'value'],
            0, '#3498db',
            100, '#e74c3c'
          ]
        case 'single':
          return '#3498db'
        default:
          return '#3498db'
      }
    }

    // 更新点
    const updatePoints = () => {
      if (map.value && map.value.getLayer(pointsLayerId)) {
        map.value.setPaintProperty(pointsLayerId, 'circle-radius', pointSize.value)
        map.value.setPaintProperty(pointsLayerId, 'circle-color', getColorExpression())
      }
    }

    // 清除点
    const clearPoints = () => {
      if (!map.value) return
      
      if (map.value.getLayer(pointsLayerId)) {
        map.value.removeLayer(pointsLayerId)
      }
      
      if (map.value.getSource(pointsSourceId)) {
        map.value.removeSource(pointsSourceId)
      }
    }

    // 地图准备就绪
    const onMapReady = (mapInstance) => {
      map.value = mapInstance
      generateRandomPoints()
    }

    return {
      map,
      pointCount,
      pointSize,
      colorMode,
      generateRandomPoints,
      updatePoints,
      clearPoints,
      onMapReady,
      MAP_CONFIG
    }
  }
}
</script>

<style scoped>
.map-view-container {
  position: relative;
  width: 100%;
  height: 100vh;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

.control-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.control-group input[type="range"] {
  width: 100%;
  margin: 4px 0;
}

.control-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}

.value {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  text-align: center;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
  transform: translateY(-1px);
}
</style>