<template>
  <div class="fly-lines-container">
    <!-- 飞线辉光控制 -->
    <div class="glow-control" v-if="showControls">
      <label class="glow-checkbox">
        <input
          type="checkbox"
          v-model="pulseGlowEnabled"
          @change="onGlowChange"
        />
        <span class="checkbox-label">辉光</span>
      </label>
    </div>
    
    <!-- 飞线显示控制 -->
    <div class="flylines-control" v-if="showControls">
      <button 
        :class="['control-btn', { active: showFlylines }]"
        @click="toggleFlylines"
      >
        飞线
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from "vue";

export default {
  name: "FlyLines",
  props: {
    provinces: {
      type: Array,
      default: () => []
    },
    showFlylines: {
      type: Boolean,
      default: false
    },
    glowEnabled: {
      type: Boolean,
      default: false
    },
    showControls: {
      type: Boolean,
      default: true
    },
    flylineConfig: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:showFlylines', 'update:glowEnabled'],
  setup(props, { emit }) {
    const pulseGlowEnabled = computed({
      get: () => props.glowEnabled,
      set: (value) => emit('update:glowEnabled', value)
    });

    // 切换飞线显示
    const toggleFlylines = () => {
      emit('update:showFlylines', !props.showFlylines);
    };

    // 辉光变化处理
    const onGlowChange = () => {
      // 通知父组件辉光状态变化
      emit('glow-change', pulseGlowEnabled.value);
    };

    return {
      pulseGlowEnabled,
      toggleFlylines,
      onGlowChange
    };
  }
};
</script>

<style scoped>
.fly-lines-container {
  position: relative;
}

.glow-control {
  position: absolute;
  top: 90px;
  right: 10px;
  z-index: 10;
}

.flylines-control {
  position: absolute;
  top: 130px;
  right: 10px;
  z-index: 10;
}

.glow-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
}

.glow-checkbox:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.4);
}

.glow-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: rgba(41, 182, 246, 1);
}

.checkbox-label {
  color: #ffffff;
  font-size: 12px;
  white-space: nowrap;
}

.control-btn {
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  white-space: nowrap;
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateX(-2px);
}

.control-btn.active {
  background: rgba(41, 182, 246, 0.8);
  border-color: rgba(41, 182, 246, 1);
  color: #ffffff;
}
</style>