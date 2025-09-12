<template>
  <div class="map-view-container">
    <BaseMap
      :center="MAP_CONFIG.BEIJING_CENTER"
      :zoom="10"
      @map-ready="onMapReady"
    />
    
    <ControlPanel title="面效果控制">
      <div class="control-content">
        <div class="control-group">
          <label>区域数量: <span class="value">{{ regionCount }}</span></label>
          <input 
            type="range" 
            min="3" 
            max="12" 
            v-model="regionCount" 
            @input="generateRegions"
          >
        </div>
        
        <div class="control-group">
          <label>透明度: <span class="value">{{ opacity }}</span></label>
          <input 
            type="range" 
            min="0.1" 
            max="0.9" 
            step="0.1" 
            v-model="opacity" 
            @input="updateOpacity"
          >
        </div>
        
        <div class="control-group">
          <label>边框宽度: <span class="value">{{ borderWidth }}px</span></label>
          <input 
            type="range" 
            min="1" 
            max="5" 
            v-model="borderWidth" 
            @input="updateBorderStyle"
          >
        </div>
        
        <div class="control-group">
          <label>颜色主题</label>
          <select v-model="colorTheme" @change="updateColors">
            <option value="heatmap">热力图</option>
            <option value="gradient">渐变</option>
            <option value="category">分类</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>数据显示</label>
          <select v-model="dataType" @change="updateData">
            <option value="population">人口密度</option>
            <option value="income">收入水平</option>
            <option value="activity">活跃度</option>
          </select>
        </div>
        
        <div class="control-group">
          <div class="button-group">
            <button class="btn btn-primary" @click="generateRegions">生成区域</button>
            <button class="btn" @click="toggle3D">{{ is3D ? '切换到2D' : '切换到3D' }}</button>
            <button class="btn btn-secondary" @click="clearRegions">清除区域</button>
          </div>
        </div>
        
        <div class="stats-panel">
          <h4>统计数据</h4>
          <div class="stat-item">
            <span>总面积:</span>
            <span class="value">{{ totalArea }} km²</span>
          </div>
          <div class="stat-item">
            <span>最高值:</span>
            <span class="value">{{ maxValue }}</span>
          </div>
          <div class="stat-item">
            <span>平均值:</span>
            <span class="value">{{ avgValue }}</span>
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
  name: 'BasicSurfaces',
  components: {
    BaseMap,
    ControlPanel
  },
  setup() {
    const map = ref(null)
    const regionCount = ref(6)
    const opacity = ref(0.6)
    const borderWidth = ref(2)
    const colorTheme = ref('heatmap')
    const dataType = ref('population')
    const is3D = ref(false)
    
    const regionsLayerId = 'regions-layer'
    const regionsSourceId = 'regions-source'
    const regionsData = ref([])
    
    const totalArea = ref(0)
    const maxValue = ref(0)
    const avgValue = ref(0)

    // 生成区域数据
    const generateRegions = () => {
      if (!map.value) return

      const regions = []
      const center = MAP_CONFIG.BEIJING_CENTER
      
      // 生成不同形状的区域
      for (let i = 0; i < regionCount.value; i++) {
        const angle = (i / regionCount.value) * Math.PI * 2
        const distance = 0.05 + Math.random() * 0.08
        
        const centerLng = center[0] + Math.cos(angle) * distance
        const centerLat = center[1] + Math.sin(angle) * distance
        
        // 生成多边形区域
        const polygon = generatePolygon(centerLng, centerLat, 0.02 + Math.random() * 0.015)
        
        regions.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [polygon]
          },
          properties: {
            id: i,
            name: `区域 ${i + 1}`,
            value: Math.random() * 100,
            area: calculateArea(polygon),
            center: [centerLng, centerLat]
          }
        })
      }

      regionsData.value = regions
      updateStatistics()

      // 清除旧图层
      clearRegions()

      // 添加数据源
      map.value.addSource(regionsSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: regions
        }
      })

      // 添加区域图层
      map.value.addLayer({
        id: regionsLayerId,
        type: is3D.value ? 'fill-extrusion' : 'fill',
        source: regionsSourceId,
        paint: getLayerPaint()
      })

      // 添加边框图层
      map.value.addLayer({
        id: `${regionsLayerId}-border`,
        type: 'line',
        source: regionsSourceId,
        paint: {
          'line-color': '#ffffff',
          'line-width': borderWidth.value,
          'line-opacity': 0.8
        }
      })

      // 添加点击事件
      map.value.on('click', regionsLayerId, (e) => {
        const feature = e.features[0]
        showRegionInfo(feature)
      })

      map.value.on('mouseenter', regionsLayerId, () => {
        map.value.getCanvas().style.cursor = 'pointer'
      })

      map.value.on('mouseleave', regionsLayerId, () => {
        map.value.getCanvas().style.cursor = ''
      })
    }

    // 生成多边形
    const generatePolygon = (centerLng, centerLat, radius) => {
      const points = []
      const sides = 6 + Math.floor(Math.random() * 4)
      
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2
        const r = radius * (0.8 + Math.random() * 0.4)
        const lng = centerLng + Math.cos(angle) * r
        const lat = centerLat + Math.sin(angle) * r
        points.push([lng, lat])
      }
      
      // 确保多边形闭合
      points.push(points[0])
      return points
    }

    // 计算面积（简化计算）
    const calculateArea = (polygon) => {
      let area = 0
      const n = polygon.length
      for (let i = 0; i < n - 1; i++) {
        area += polygon[i][0] * polygon[i + 1][1] - polygon[i + 1][0] * polygon[i][1]
      }
      return Math.abs(area) * 12365 // 转换为平方公里近似值
    }

    // 获取图层样式
    const getLayerPaint = () => {
      if (is3D.value) {
        return {
          'fill-extrusion-color': getColorExpression(),
          'fill-extrusion-height': ['*', ['get', 'value'], 100],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': opacity.value
        }
      } else {
        return {
          'fill-color': getColorExpression(),
          'fill-opacity': opacity.value
        }
      }
    }

    // 获取颜色表达式
    const getColorExpression = () => {
      const themes = {
        heatmap: [
          'interpolate',
          ['linear'],
          ['get', 'value'],
          0, '#2ecc71',
          25, '#f39c12',
          50, '#e67e22',
          75, '#e74c3c',
          100, '#c0392b'
        ],
        gradient: [
          'interpolate',
          ['linear'],
          ['get', 'value'],
          0, '#3498db',
          100, '#9b59b6'
        ],
        category: [
          'case',
          ['<', ['get', 'value'], 33], '#3498db',
          ['<', ['get', 'value'], 66], '#f39c12',
          '#e74c3c'
        ]
      }
      return themes[colorTheme.value]
    }

    // 更新透明度
    const updateOpacity = () => {
      if (map.value && map.value.getLayer(regionsLayerId)) {
        const opacityProperty = is3D.value ? 'fill-extrusion-opacity' : 'fill-opacity'
        map.value.setPaintProperty(regionsLayerId, opacityProperty, opacity.value)
      }
    }

    // 更新边框样式
    const updateBorderStyle = () => {
      if (map.value && map.value.getLayer(`${regionsLayerId}-border`)) {
        map.value.setPaintProperty(`${regionsLayerId}-border`, 'line-width', borderWidth.value)
      }
    }

    // 更新颜色
    const updateColors = () => {
      if (map.value && map.value.getLayer(regionsLayerId)) {
        const colorProperty = is3D.value ? 'fill-extrusion-color' : 'fill-color'
        map.value.setPaintProperty(regionsLayerId, colorProperty, getColorExpression())
      }
    }

    // 更新数据
    const updateData = () => {
      if (regionsData.value.length > 0) {
        regionsData.value.forEach(region => {
          switch (dataType.value) {
            case 'population':
              region.properties.value = Math.random() * 100
              break
            case 'income':
              region.properties.value = 20 + Math.random() * 80
              break
            case 'activity':
              region.properties.value = 10 + Math.random() * 90
              break
          }
        })
        updateStatistics()
        updateColors()
      }
    }

    // 更新统计信息
    const updateStatistics = () => {
      if (regionsData.value.length === 0) return

      totalArea.value = regionsData.value.reduce((sum, region) => sum + region.properties.area, 0)
      maxValue.value = Math.max(...regionsData.value.map(r => r.properties.value))
      avgValue.value = regionsData.value.reduce((sum, region) => sum + region.properties.value, 0) / regionsData.value.length
    }

    // 切换3D模式
    const toggle3D = () => {
      is3D.value = !is3D.value
      
      // 重新生成图层
      if (map.value && map.value.getLayer(regionsLayerId)) {
        map.value.removeLayer(regionsLayerId)
        map.value.addLayer({
          id: regionsLayerId,
          type: is3D.value ? 'fill-extrusion' : 'fill',
          source: regionsSourceId,
          paint: getLayerPaint()
        })
      }
    }

    // 显示区域信息
    const showRegionInfo = (feature) => {
      const properties = feature.properties
      new mapboxgl.Popup()
        .setLngLat(properties.center)
        .setHTML(`
          <div style="padding: 12px; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #2c3e50;">${properties.name}</h4>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>数值:</strong> ${properties.value.toFixed(1)}
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>面积:</strong> ${properties.area.toFixed(2)} km²
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>数据类型:</strong> ${dataType.value}
            </p>
          </div>
        `)
        .addTo(map.value)
    }

    // 清除区域
    const clearRegions = () => {
      if (!map.value) return
      
      if (map.value.getLayer(regionsLayerId)) {
        map.value.removeLayer(regionsLayerId)
      }
      
      if (map.value.getLayer(`${regionsLayerId}-border`)) {
        map.value.removeLayer(`${regionsLayerId}-border`)
      }
      
      if (map.value.getSource(regionsSourceId)) {
        map.value.removeSource(regionsSourceId)
      }
      
      regionsData.value = []
      totalArea.value = 0
      maxValue.value = 0
      avgValue.value = 0
    }

    // 地图准备就绪
    const onMapReady = (mapInstance) => {
      map.value = mapInstance
      generateRegions()
    }

    onMounted(() => {
      console.log('基础面效果组件已加载')
    })

    return {
      MAP_CONFIG,
      regionCount,
      opacity,
      borderWidth,
      colorTheme,
      dataType,
      is3D,
      totalArea,
      maxValue,
      avgValue,
      onMapReady,
      generateRegions,
      updateOpacity,
      updateBorderStyle,
      updateColors,
      updateData,
      toggle3D,
      clearRegions
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

.stats-panel {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #3498db;
}

.stats-panel h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
}

.stat-item span:last-child {
  color: #3498db;
  font-weight: bold;
}
</style>