<template>
  <div class="map-view-container">
    <BaseMap 
      :center="MAP_CONFIG.BEIJING_CENTER" 
      :zoom="10"
      @map-ready="onMapReady"
    />
    
    <ControlPanel title="飞线效果控制">
      <div class="control-content">
        <div class="control-group">
          <label>线条数量: <span class="value">{{ lineCount }}</span></label>
          <input 
            type="range" 
            v-model="lineCount" 
            min="5" 
            max="50" 
            @input="generateFlyingLines"
          >
        </div>

        <div class="control-group">
          <label>线条宽度: <span class="value">{{ lineWidth }}px</span></label>
          <input 
            type="range" 
            v-model="lineWidth" 
            min="1" 
            max="10" 
            @input="updateLineStyle"
          >
        </div>

        <div class="control-group">
          <label>颜色渐变</label>
          <select v-model="colorGradient" @change="updateLineStyle">
            <option value="blue-red">蓝-红</option>
            <option value="green-yellow">绿-黄</option>
            <option value="purple-cyan">紫-青</option>
          </select>
        </div>

        <div class="control-group">
          <label>动画速度</label>
          <select v-model="animationSpeed" @change="updateAnimation">
            <option value="slow">慢速</option>
            <option value="normal">正常</option>
            <option value="fast">快速</option>
          </select>
        </div>

        <div class="button-group">
          <button class="btn btn-primary" @click="generateFlyingLines">重新生成</button>
          <button class="btn" @click="toggleAnimation">
            {{ isAnimating ? '暂停动画' : '开始动画' }}
          </button>
          <button class="btn btn-secondary" @click="clearLines">清除所有</button>
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
  name: 'FlyingLines',
  components: {
    BaseMap,
    ControlPanel
  },
  setup() {
    const map = ref(null)
    const lineCount = ref(20)
    const animationSpeed = ref('normal')
    const lineWidth = ref(3)
    const colorGradient = ref('blue-red')
    const isAnimating = ref(true)
    const linesLayerId = 'flying-lines-layer'
    const linesSourceId = 'flying-lines-source'
    const animationFrame = ref(null)

    // 生成飞线数据
    const generateFlyingLines = () => {
      if (!map.value) return

      const lines = []
      const center = MAP_CONFIG.BEIJING_CENTER
      
      for (let i = 0; i < lineCount.value; i++) {
        const angle = (i / lineCount.value) * Math.PI * 2
        const distance = 0.1 + Math.random() * 0.15
        
        const startLng = center[0]
        const startLat = center[1]
        const endLng = center[0] + Math.cos(angle) * distance
        const endLat = center[1] + Math.sin(angle) * distance
        
        // 创建贝塞尔曲线控制点
        const midLng = (startLng + endLng) / 2 + (Math.random() - 0.5) * 0.05
        const midLat = (startLat + endLat) / 2 + (Math.random() - 0.5) * 0.05
        
        // 生成曲线点
        const curvePoints = generateBezierCurve(
          [startLng, startLat],
          [midLng, midLat],
          [endLng, endLat],
          50
        )
        
        lines.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: curvePoints
          },
          properties: {
            id: i,
            progress: 0,
            speed: 0.5 + Math.random() * 1.5,
            color: getLineColor(i)
          }
        })
      }

      // 清除旧图层
      clearLines()

      // 添加数据源
      map.value.addSource(linesSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: lines
        }
      })

      // 添加飞线图层
      map.value.addLayer({
        id: linesLayerId,
        type: 'line',
        source: linesSourceId,
        paint: {
          'line-width': lineWidth.value,
          'line-color': ['get', 'color'],
          'line-opacity': ['case', ['>', ['get', 'progress'], 0], 0.8, 0],
          'line-gradient': getLineGradient()
        }
      })

      // 开始动画
      if (isAnimating.value) {
        startAnimation()
      }
    }

    // 生成贝塞尔曲线
    const generateBezierCurve = (start, control, end, points) => {
      const coordinates = []
      for (let t = 0; t <= 1; t += 1 / points) {
        const lng = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * control[0] + Math.pow(t, 2) * end[0]
        const lat = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * control[1] + Math.pow(t, 2) * end[1]
        coordinates.push([lng, lat])
      }
      return coordinates
    }

    // 获取线条颜色
    const getLineColor = (index) => {
      const colors = {
        'blue-red': ['#3498db', '#e74c3c'],
        'green-yellow': ['#2ecc71', '#f1c40f'],
        'purple-cyan': ['#9b59b6', '#1abc9c']
      }
      const gradient = colors[colorGradient.value]
      return gradient[Math.floor(Math.random() * gradient.length)]
    }

    // 获取线条渐变
    const getLineGradient = () => {
      const gradients = {
        'blue-red': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, '#3498db',
          1, '#e74c3c'
        ],
        'green-yellow': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, '#2ecc71',
          1, '#f1c40f'
        ],
        'purple-cyan': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, '#9b59b6',
          1, '#1abc9c'
        ]
      }
      return gradients[colorGradient.value]
    }

    // 动画循环
    const startAnimation = () => {
      if (!map.value || !isAnimating.value) return

      const animate = () => {
        if (!map.value || !map.value.getSource(linesSourceId)) return

        const source = map.value.getSource(linesSourceId)
        const data = source._data
        
        let hasActiveAnimation = false
        
        data.features.forEach(feature => {
          feature.properties.progress += feature.properties.speed * getSpeedMultiplier()
          if (feature.properties.progress > 1) {
            feature.properties.progress = 0
          }
          if (feature.properties.progress > 0) {
            hasActiveAnimation = true
          }
        })

        source.setData(data)

        if (hasActiveAnimation && isAnimating.value) {
          animationFrame.value = requestAnimationFrame(animate)
        }
      }

      animate()
    }

    // 获取速度乘数
    const getSpeedMultiplier = () => {
      const multipliers = {
        slow: 0.3,
        normal: 1,
        fast: 2
      }
      return multipliers[animationSpeed.value]
    }

    // 更新动画
    const updateAnimation = () => {
      if (isAnimating.value) {
        stopAnimation()
        startAnimation()
      }
    }

    // 更新线条样式
    const updateLineStyle = () => {
      if (!map.value || !map.value.getLayer(linesLayerId)) return

      map.value.setPaintProperty(linesLayerId, 'line-width', lineWidth.value)
      map.value.setPaintProperty(linesLayerId, 'line-gradient', getLineGradient())
    }

    // 切换动画状态
    const toggleAnimation = () => {
      isAnimating.value = !isAnimating.value
      if (isAnimating.value) {
        startAnimation()
      } else {
        stopAnimation()
      }
    }

    // 停止动画
    const stopAnimation = () => {
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value)
        animationFrame.value = null
      }
    }

    // 清除飞线
    const clearLines = () => {
      stopAnimation()
      
      if (!map.value) return
      
      if (map.value.getLayer(linesLayerId)) {
        map.value.removeLayer(linesLayerId)
      }
      
      if (map.value.getSource(linesSourceId)) {
        map.value.removeSource(linesSourceId)
      }
    }

    // 地图准备就绪
    const onMapReady = (mapInstance) => {
      map.value = mapInstance
      generateFlyingLines()
    }

    onMounted(() => {
      console.log('飞线效果组件已加载')
    })

    onUnmounted(() => {
      stopAnimation()
    })

    return {
      MAP_CONFIG,
      lineCount,
      animationSpeed,
      lineWidth,
      colorGradient,
      isAnimating,
      onMapReady,
      generateFlyingLines,
      updateAnimation,
      updateLineStyle,
      toggleAnimation,
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
</style>