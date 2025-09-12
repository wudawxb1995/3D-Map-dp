<template>
  <div class="map-view-container">
    <BaseMap
      :center="MAP_CONFIG.BEIJING_CENTER"
      :zoom="10"
      :pitch="45"
      @map-ready="onMapReady"
    />
    
    <ControlPanel title="体效果控制">
      <div class="control-content">
        <div class="control-group">
          <label>建筑数量:</label>
          <input 
            type="range" 
            min="5" 
            max="50" 
            v-model="buildingCount" 
            @input="generateBuildings"
          />
          <span class="value">{{ buildingCount }}</span>
        </div>
        
        <div class="control-group">
          <label>最大高度:</label>
          <input 
            type="range" 
            min="50" 
            max="500" 
            step="10" 
            v-model="maxHeight" 
            @input="updateHeights"
          />
          <span class="value">{{ maxHeight }}m</span>
        </div>
        
        <div class="control-group">
          <label>透明度:</label>
          <input 
            type="range" 
            min="0.3" 
            max="1" 
            step="0.1" 
            v-model="opacity" 
            @input="updateOpacity"
          />
          <span class="value">{{ opacity }}</span>
        </div>
        
        <div class="control-group">
          <label>颜色模式:</label>
          <select v-model="colorMode" @change="updateColors">
            <option value="height">按高度</option>
            <option value="category">按类型</option>
            <option value="density">按密度</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>建筑类型:</label>
          <select v-model="buildingType" @change="updateBuildings">
            <option value="mixed">混合建筑</option>
            <option value="residential">住宅</option>
            <option value="commercial">商业</option>
            <option value="office">办公</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>视角高度:</label>
          <input 
            type="range" 
            min="500" 
            max="2000" 
            step="100" 
            v-model="cameraHeight" 
            @input="updateCamera"
          />
          <span class="value">{{ cameraHeight }}m</span>
        </div>
        
        <div class="button-group">
          <button @click="generateBuildings" class="btn btn-primary">
            生成建筑
          </button>
          
          <button @click="toggleAnimation" class="btn btn-secondary">
            {{ isAnimating ? '停止动画' : '开始动画' }}
          </button>
          
          <button @click="clearBuildings" class="btn btn-secondary">
            清除建筑
          </button>
        </div>
        
        <div class="building-info">
          <h4>建筑信息</h4>
          <div class="info-item">
            <span>总建筑:</span>
            <span>{{ buildings.length }}</span>
          </div>
          <div class="info-item">
            <span>平均高度:</span>
            <span>{{ avgHeight }}m</span>
          </div>
          <div class="info-item">
            <span>最高建筑:</span>
            <span>{{ tallestBuilding }}m</span>
          </div>
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
  name: 'BasicVolumes',
  components: {
    BaseMap,
    ControlPanel
  },
  setup() {
    const map = ref(null)
    const buildingCount = ref(25)
    const maxHeight = ref(300)
    const opacity = ref(0.9)
    const colorMode = ref('height')
    const buildingType = ref('mixed')
    const cameraHeight = ref(1000)
    const isAnimating = ref(false)
    
    const buildingsLayerId = 'buildings-layer'
    const buildingsSourceId = 'buildings-source'
    const buildingsData = ref([])
    
    const animationFrame = ref(null)

    // 计算属性
    const buildings = computed(() => buildingsData.value)
    const avgHeight = computed(() => {
      if (buildings.value.length === 0) return 0
      const total = buildings.value.reduce((sum, b) => sum + b.properties.height, 0)
      return Math.round(total / buildings.value.length)
    })
    const tallestBuilding = computed(() => {
      if (buildings.value.length === 0) return 0
      return Math.max(...buildings.value.map(b => b.properties.height))
    })

    // 生成建筑数据
    const generateBuildings = () => {
      if (!map.value) return

      const buildings = []
      const center = MAP_CONFIG.BEIJING_CENTER
      
      // 建筑类型配置
      const typeConfigs = {
        residential: { heightRange: [30, 120], color: '#8B4513' },
        commercial: { heightRange: [50, 200], color: '#4169E1' },
        office: { heightRange: [80, 300], color: '#2F4F4F' },
        mixed: { heightRange: [20, 300], color: null }
      }

      const config = typeConfigs[buildingType.value]

      // 生成建筑
      for (let i = 0; i < buildingCount.value; i++) {
        const angle = (i / buildingCount.value) * Math.PI * 2
        const distance = 0.02 + Math.random() * 0.08
        
        const centerLng = center[0] + Math.cos(angle) * distance + (Math.random() - 0.5) * 0.02
        const centerLat = center[1] + Math.sin(angle) * distance + (Math.random() - 0.5) * 0.02
        
        // 建筑尺寸
        const width = 0.002 + Math.random() * 0.004
        const height = Math.max(50, Math.random() * maxHeight.value)
        
        // 生成建筑轮廓
        const footprint = generateBuildingFootprint(centerLng, centerLat, width)
        
        buildings.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [footprint]
          },
          properties: {
            id: `building-${i}`,
            name: `建筑 ${i + 1}`,
            height: Math.round(height),
            type: getBuildingType(height),
            floors: Math.floor(height / 3),
            year: 2000 + Math.floor(Math.random() * 24),
            occupancy: Math.random(),
            color: config.color || getBuildingColor(height)
          }
        })
      }

      buildingsData.value = buildings

      // 清除旧图层
      clearBuildings()

      // 添加数据源
      map.value.addSource(buildingsSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: buildings
        }
      })

      // 添加3D建筑图层
      map.value.addLayer({
        id: buildingsLayerId,
        type: 'fill-extrusion',
        source: buildingsSourceId,
        paint: {
          'fill-extrusion-color': getBuildingColorExpression(),
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': opacity.value,
          'fill-extrusion-vertical-gradient': true
        }
      })

      // 添加点击事件
      map.value.on('click', buildingsLayerId, (e) => {
        const feature = e.features[0]
        showBuildingInfo(feature)
      })

      map.value.on('mouseenter', buildingsLayerId, () => {
        map.value.getCanvas().style.cursor = 'pointer'
      })

      map.value.on('mouseleave', buildingsLayerId, () => {
        map.value.getCanvas().style.cursor = ''
      })

      // 设置初始视角
      updateCamera()
    }

    // 生成建筑轮廓
    const generateBuildingFootprint = (centerLng, centerLat, size) => {
      const points = []
      const sides = 4 + Math.floor(Math.random() * 2)
      
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2
        const r = size * (0.8 + Math.random() * 0.4)
        const lng = centerLng + Math.cos(angle) * r
        const lat = centerLat + Math.sin(angle) * r
        points.push([lng, lat])
      }
      
      // 确保多边形闭合
      points.push(points[0])
      return points
    }

    // 获取建筑类型
    const getBuildingType = (height) => {
      if (height < 50) return 'low-rise'
      if (height < 150) return 'mid-rise'
      return 'high-rise'
    }

    // 获取建筑颜色
    const getBuildingColor = (height) => {
      const colors = {
        height: [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          0, '#2ecc71',
          100, '#f39c12',
          200, '#e74c3c',
          300, '#8e44ad',
          500, '#34495e'
        ],
        category: [
          'case',
          ['==', ['get', 'type'], 'low-rise'], '#95a5a6',
          ['==', ['get', 'type'], 'mid-rise'], '#3498db',
          '#e74c3c'
        ],
        density: [
          'interpolate',
          ['linear'],
          ['get', 'occupancy'],
          0, '#bdc3c7',
          0.5, '#3498db',
          1, '#2c3e50'
        ]
      }
      return colors[colorMode.value] || colors.height
    }

    // 获取建筑颜色表达式
    const getBuildingColorExpression = () => {
      return getBuildingColor(0) // 使用函数返回的颜色表达式
    }

    // 更新建筑高度
    const updateHeights = () => {
      if (buildingsData.value.length > 0) {
        buildingsData.value.forEach(building => {
          building.properties.height = Math.min(
            Math.round(Math.random() * maxHeight.value),
            maxHeight.value
          )
          building.properties.floors = Math.floor(building.properties.height / 3)
        })
        
        if (map.value && map.value.getSource(buildingsSourceId)) {
          map.value.getSource(buildingsSourceId).setData({
            type: 'FeatureCollection',
            features: buildingsData.value
          })
        }
      }
    }

    // 更新透明度
    const updateOpacity = () => {
      if (map.value && map.value.getLayer(buildingsLayerId)) {
        map.value.setPaintProperty(buildingsLayerId, 'fill-extrusion-opacity', opacity.value)
      }
    }

    // 更新颜色
    const updateColors = () => {
      if (map.value && map.value.getLayer(buildingsLayerId)) {
        map.value.setPaintProperty(buildingsLayerId, 'fill-extrusion-color', getBuildingColorExpression())
      }
    }

    // 更新建筑
    const updateBuildings = () => {
      generateBuildings()
    }

    // 更新相机视角
    const updateCamera = () => {
      if (map.value) {
        map.value.flyTo({
          center: MAP_CONFIG.BEIJING_CENTER,
          zoom: 15,
          pitch: 60,
          bearing: 0,
          duration: 2000
        })
      }
    }

    // 显示建筑信息
    const showBuildingInfo = (feature) => {
      const properties = feature.properties
      new mapboxgl.Popup()
        .setLngLat([properties.center_lng, properties.center_lat])
        .setHTML(`
          <div style="padding: 12px; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #2c3e50;">${properties.name}</h4>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>高度:</strong> ${properties.height}m
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>楼层:</strong> ${properties.floors}层
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>类型:</strong> ${properties.type}
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>建成年份:</strong> ${properties.year}
            </p>
          </div>
        `)
        .addTo(map.value)
    }

    // 切换动画
    const toggleAnimation = () => {
      isAnimating.value = !isAnimating.value
      if (isAnimating.value) {
        startBuildingAnimation()
      } else {
        stopBuildingAnimation()
      }
    }

    // 建筑动画
    const startBuildingAnimation = () => {
      if (!map.value) return

      const animate = () => {
        if (!isAnimating.value) return

        const bearing = map.value.getBearing()
        map.value.setBearing(bearing + 0.2)

        animationFrame.value = requestAnimationFrame(animate)
      }

      animate()
    }

    // 停止建筑动画
    const stopBuildingAnimation = () => {
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value)
        animationFrame.value = null
      }
    }

    // 清除建筑
    const clearBuildings = () => {
      stopBuildingAnimation()
      
      if (!map.value) return
      
      if (map.value.getLayer(buildingsLayerId)) {
        map.value.removeLayer(buildingsLayerId)
      }
      
      if (map.value.getSource(buildingsSourceId)) {
        map.value.removeSource(buildingsSourceId)
      }
      
      buildingsData.value = []
    }

    // 地图准备就绪
    const onMapReady = (mapInstance) => {
      map.value = mapInstance
      generateBuildings()
    }

    onMounted(() => {
      console.log('基础体效果组件已加载')
    })

    onUnmounted(() => {
      stopBuildingAnimation()
    })

    return {
      MAP_CONFIG,
      buildingCount,
      maxHeight,
      opacity,
      colorMode,
      buildingType,
      cameraHeight,
      isAnimating,
      buildings,
      avgHeight,
      tallestBuilding,
      onMapReady,
      generateBuildings,
      updateHeights,
      updateOpacity,
      updateColors,
      updateBuildings,
      updateCamera,
      toggleAnimation,
      clearBuildings
    }
  }
}
</script>

<style scoped>
.map-view-container {
  position: relative;
  height: 100vh;
  width: 100%;
}

.control-content {
  padding: 0.5rem;
}

.control-group {
  margin-bottom: 1.5rem;
}

.control-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #34495e;
  font-weight: 500;
  font-size: 0.9rem;
}

.control-group input[type="range"] {
  width: 100%;
  margin-bottom: 0.5rem;
}

.control-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.value {
  color: #7f8c8d;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.building-info {
  margin-top: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.building-info h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #2c3e50;
  font-size: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.info-item span:first-child {
  color: #34495e;
  font-weight: 500;
}

.info-item span:last-child {
  color: #7f8c8d;
}

@media (max-width: 768px) {
  .control-content {
    padding: 0.25rem;
  }
  
  .control-group {
    margin-bottom: 1rem;
  }
}
</style>