<template>
  <div class="map-view-container">
    <BaseMap
      :center="MAP_CONFIG.BEIJING_CENTER"
      :zoom="10"
      @map-ready="onMapReady"
    />
    
    <ControlPanel title="流动线效果控制">
      <div class="control-content">
        <div class="control-group">
          <label>道路数量: <span class="value">{{ roadCount }}</span></label>
          <input 
            type="range" 
            min="3" 
            max="15" 
            v-model="roadCount" 
            @input="generateFlowLines"
          >
        </div>
        
        <div class="control-group">
          <label>流动速度</label>
          <select v-model="flowSpeed" @change="updateFlowSpeed">
            <option value="slow">慢速</option>
            <option value="normal">正常</option>
            <option value="fast">快速</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>线条粗细: <span class="value">{{ lineWidth }}px</span></label>
          <input 
            type="range" 
            min="2" 
            max="8" 
            v-model="lineWidth" 
            @input="updateLineStyle"
          >
        </div>
        
        <div class="control-group">
          <label>粒子密度: <span class="value">{{ particleDensity }}</span></label>
          <input 
            type="range" 
            min="5" 
            max="30" 
            v-model="particleDensity" 
            @input="updateParticles"
          >
        </div>
        
        <div class="control-group">
          <label>颜色主题</label>
          <select v-model="colorTheme" @change="updateColors">
            <option value="traffic">交通流量</option>
            <option value="energy">能源传输</option>
            <option value="data">数据流动</option>
          </select>
        </div>
        
        <div class="control-group">
          <div class="button-group">
            <button class="btn btn-primary" @click="generateFlowLines">生成流动线</button>
            <button class="btn" @click="toggleFlow">{{ isFlowing ? '暂停流动' : '开始流动' }}</button>
            <button class="btn btn-secondary" @click="clearLines">清除线条</button>
          </div>
        </div>
        
        <div class="legend">
          <h4>图例</h4>
          <div class="legend-item">
            <span class="legend-color" style="background: #2ecc71;"></span>
            <span>低密度</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #f39c12;"></span>
            <span>中密度</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #e74c3c;"></span>
            <span>高密度</span>
          </div>
        </div>
      </div>
    </ControlPanel>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import BaseMap from '@/components/BaseMap.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import { MAP_CONFIG } from '@/config/mapConfig.js'

export default {
  name: 'FlowLines',
  components: {
    BaseMap,
    ControlPanel
  },
  setup() {
    const map = ref(null)
    const roadCount = ref(8)
    const flowSpeed = ref('normal')
    const lineWidth = ref(4)
    const particleDensity = ref(15)
    const colorTheme = ref('traffic')
    const isFlowing = ref(true)
    
    const linesLayerId = 'flow-lines-layer'
    const linesSourceId = 'flow-lines-source'
    const particlesLayerId = 'flow-particles-layer'
    const particlesSourceId = 'flow-particles-source'
    
    const animationFrame = ref(null)
    const particles = ref([])

    // 生成流动线数据
    const generateFlowLines = () => {
      if (!map.value) return

      const lines = []
      const center = MAP_CONFIG.BEIJING_CENTER
      
      // 生成主要道路网络
      const mainRoutes = [
        { start: center, end: [center[0] + 0.15, center[1] + 0.1], type: 'highway' },
        { start: center, end: [center[0] - 0.12, center[1] + 0.08], type: 'arterial' },
        { start: center, end: [center[0] + 0.1, center[1] - 0.12], type: 'highway' },
        { start: center, end: [center[0] - 0.08, center[1] - 0.15], type: 'arterial' },
        { start: [center[0] + 0.05, center[1] + 0.05], end: [center[0] + 0.18, center[1] - 0.05], type: 'local' },
        { start: [center[0] - 0.05, center[1] + 0.05], end: [center[0] - 0.15, center[1] - 0.08], type: 'local' }
      ]

      // 扩展道路网络
      for (let i = 0; i < roadCount.value - mainRoutes.length; i++) {
        const angle = (i / (roadCount.value - mainRoutes.length)) * Math.PI * 2
        const distance = 0.08 + Math.random() * 0.12
        
        const startLng = center[0] + (Math.random() - 0.5) * 0.05
        const startLat = center[1] + (Math.random() - 0.5) * 0.05
        const endLng = startLng + Math.cos(angle) * distance
        const endLat = startLat + Math.sin(angle) * distance
        
        mainRoutes.push({
          start: [startLng, startLat],
          end: [endLng, endLat],
          type: ['highway', 'arterial', 'local'][Math.floor(Math.random() * 3)]
        })
      }

      // 创建道路线条
      mainRoutes.forEach((route, index) => {
        const points = generateRoadCurve(route.start, route.end)
        
        lines.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: points
          },
          properties: {
            id: index,
            type: route.type,
            traffic: Math.random(),
            capacity: route.type === 'highway' ? 1 : route.type === 'arterial' ? 0.7 : 0.4
          }
        })
      })

      // 清除旧图层
      clearLines()

      // 添加道路数据源
      map.value.addSource(linesSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: lines
        }
      })

      // 添加道路图层
      map.value.addLayer({
        id: linesLayerId,
        type: 'line',
        source: linesSourceId,
        paint: {
          'line-width': [
            'case',
            ['==', ['get', 'type'], 'highway'], lineWidth.value * 2,
            ['==', ['get', 'type'], 'arterial'], lineWidth.value * 1.5,
            lineWidth.value
          ],
          'line-color': getRoadColorExpression(),
          'line-opacity': 0.7,
          'line-blur': 1
        }
      })

      // 生成粒子
      generateParticles(lines)

      // 开始流动动画
      if (isFlowing.value) {
        startFlowAnimation()
      }
    }

    // 生成道路曲线
    const generateRoadCurve = (start, end) => {
      const points = []
      const steps = 20
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const lng = start[0] + (end[0] - start[0]) * t + (Math.random() - 0.5) * 0.01
        const lat = start[1] + (end[1] - start[1]) * t + (Math.random() - 0.5) * 0.01
        points.push([lng, lat])
      }
      
      return points
    }

    // 获取道路颜色表达式
    const getRoadColorExpression = () => {
      const themes = {
        traffic: [
          'case',
          ['>', ['get', 'traffic'], 0.7], '#e74c3c',
          ['>', ['get', 'traffic'], 0.4], '#f39c12',
          '#2ecc71'
        ],
        energy: [
          'case',
          ['==', ['get', 'type'], 'highway'], '#9b59b6',
          ['==', ['get', 'type'], 'arterial'], '#3498db',
          '#1abc9c'
        ],
        data: [
          'interpolate',
          ['linear'],
          ['get', 'traffic'],
          0, '#34495e',
          1, '#3498db'
        ]
      }
      return themes[colorTheme.value]
    }

    // 生成粒子
    const generateParticles = (lines) => {
      const allParticles = []
      
      lines.forEach(line => {
        const coordinates = line.geometry.coordinates
        const particleCount = Math.floor(particleDensity.value * line.properties.capacity)
        
        for (let i = 0; i < particleCount; i++) {
          const progress = Math.random()
          const pointIndex = Math.floor(progress * (coordinates.length - 1))
          const nextIndex = Math.min(pointIndex + 1, coordinates.length - 1)
          
          if (coordinates[pointIndex] && coordinates[nextIndex]) {
            const lng = coordinates[pointIndex][0] + 
                       (coordinates[nextIndex][0] - coordinates[pointIndex][0]) * (progress * (coordinates.length - 1) - pointIndex)
            const lat = coordinates[pointIndex][1] + 
                       (coordinates[nextIndex][1] - coordinates[pointIndex][1]) * (progress * (coordinates.length - 1) - pointIndex)
            
            allParticles.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [lng, lat]
              },
              properties: {
                id: `particle-${line.properties.id}-${i}`,
                lineId: line.properties.id,
                progress: progress,
                speed: 0.005 + Math.random() * 0.01,
                size: 2 + Math.random() * 3,
                color: getParticleColor(line.properties.traffic)
              }
            })
          }
        }
      })

      particles.value = allParticles

      // 添加粒子数据源
      if (!map.value.getSource(particlesSourceId)) {
        map.value.addSource(particlesSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: allParticles
          }
        })

        // 添加粒子图层
        map.value.addLayer({
          id: particlesLayerId,
          type: 'circle',
          source: particlesSourceId,
          paint: {
            'circle-radius': ['get', 'size'],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.8,
            'circle-blur': 0.5
          }
        })
      }
    }

    // 获取粒子颜色
    const getParticleColor = (traffic) => {
      const intensity = traffic
      const r = Math.floor(255 * intensity)
      const g = Math.floor(255 * (1 - intensity))
      const b = Math.floor(100 + 155 * (1 - intensity))
      return `rgb(${r}, ${g}, ${b})`
    }

    // 流动动画
    const startFlowAnimation = () => {
      if (!map.value || !isFlowing.value) return

      const animate = () => {
        if (!map.value || !map.value.getSource(particlesSourceId)) return

        const source = map.value.getSource(particlesSourceId)
        const linesSource = map.value.getSource(linesSourceId)
        
        if (!linesSource) return

        const linesData = linesSource._data
        const particlesData = source._data

        particlesData.features.forEach(particle => {
          const line = linesData.features.find(f => f.properties.id === particle.properties.lineId)
          if (!line) return

          particle.properties.progress += particle.properties.speed * getFlowSpeedMultiplier()
          if (particle.properties.progress >= 1) {
            particle.properties.progress = 0
          }

          const coordinates = line.geometry.coordinates
          const pointIndex = Math.floor(particle.properties.progress * (coordinates.length - 1))
          const nextIndex = Math.min(pointIndex + 1, coordinates.length - 1)

          if (coordinates[pointIndex] && coordinates[nextIndex]) {
            const t = (particle.properties.progress * (coordinates.length - 1)) - pointIndex
            const lng = coordinates[pointIndex][0] + (coordinates[nextIndex][0] - coordinates[pointIndex][0]) * t
            const lat = coordinates[pointIndex][1] + (coordinates[nextIndex][1] - coordinates[pointIndex][1]) * t
            
            particle.geometry.coordinates = [lng, lat]
          }
        })

        source.setData(particlesData)

        if (isFlowing.value) {
          animationFrame.value = requestAnimationFrame(animate)
        }
      }

      animate()
    }

    // 获取流动速度乘数
    const getFlowSpeedMultiplier = () => {
      const multipliers = {
        slow: 0.5,
        normal: 1,
        fast: 2
      }
      return multipliers[flowSpeed.value]
    }

    // 更新流动速度
    const updateFlowSpeed = () => {
      if (isFlowing.value) {
        stopFlowAnimation()
        startFlowAnimation()
      }
    }

    // 更新粒子
    const updateParticles = () => {
      if (map.value && map.value.getSource(linesSourceId)) {
        generateParticles(map.value.getSource(linesSourceId)._data.features)
      }
    }

    // 更新颜色
    const updateColors = () => {
      if (map.value && map.value.getLayer(linesLayerId)) {
        map.value.setPaintProperty(linesLayerId, 'line-color', getRoadColorExpression())
      }
    }

    // 切换流动状态
    const toggleFlow = () => {
      isFlowing.value = !isFlowing.value
      if (isFlowing.value) {
        startFlowAnimation()
      } else {
        stopFlowAnimation()
      }
    }

    // 停止流动动画
    const stopFlowAnimation = () => {
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value)
        animationFrame.value = null
      }
    }

    // 清除线条
    const clearLines = () => {
      stopFlowAnimation()
      
      if (!map.value) return
      
      if (map.value.getLayer(linesLayerId)) {
        map.value.removeLayer(linesLayerId)
      }
      
      if (map.value.getLayer(particlesLayerId)) {
        map.value.removeLayer(particlesLayerId)
      }
      
      if (map.value.getSource(linesSourceId)) {
        map.value.removeSource(linesSourceId)
      }
      
      if (map.value.getSource(particlesSourceId)) {
        map.value.removeSource(particlesSourceId)
      }
    }

    // 更新线条样式
    const updateLineStyle = () => {
      if (!map.value || !map.value.getLayer(linesLayerId)) return

      map.value.setPaintProperty(linesLayerId, 'line-width', [
        'case',
        ['==', ['get', 'type'], 'highway'], lineWidth.value * 2,
        ['==', ['get', 'type'], 'arterial'], lineWidth.value * 1.5,
        lineWidth.value
      ])
    }

    // 地图准备就绪
    const onMapReady = (mapInstance) => {
      map.value = mapInstance
      generateFlowLines()
    }

    onMounted(() => {
      console.log('流动线效果组件已加载')
    })

    onUnmounted(() => {
      stopFlowAnimation()
    })

    return {
      MAP_CONFIG,
      roadCount,
      flowSpeed,
      lineWidth,
      particleDensity,
      colorTheme,
      isFlowing,
      onMapReady,
      generateFlowLines,
      updateFlowSpeed,
      updateLineStyle,
      updateParticles,
      updateColors,
      toggleFlow,
      clearLines
    }
  }
}
</script>

<style scoped>
.map-view-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.control-content {
  padding: 10px 0;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.control-group input[type="range"] {
  width: 100%;
  margin: 5px 0;
}

.control-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  background: #3498db;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn:hover {
  background: #2980b9;
}

.btn-primary {
  background: #2ecc71;
}

.btn-primary:hover {
  background: #27ae60;
}

.btn-secondary {
  background: #95a5a6;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.value {
  color: #3498db;
  font-weight: bold;
}

.legend {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #3498db;
}

.legend h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-size: 12px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  margin-right: 8px;
}
</style>