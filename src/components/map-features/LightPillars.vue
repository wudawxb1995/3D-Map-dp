<template>
  <div class="light-pillars-container">
    <!-- 光柱辉光控制 -->
    <div class="glow-control" v-if="showControls">
      <label class="glow-checkbox">
        <input
          type="checkbox"
          v-model="pillarGlowEnabled"
          @change="onGlowChange"
        />
        <span class="checkbox-label">辉光</span>
      </label>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";

export default {
  name: "LightPillars",
  props: {
    provinces: {
      type: Array,
      default: () => []
    },
    showPillars: {
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
    pillarConfig: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:glowEnabled'],
  setup(props, { emit }) {
    const pillarGlowEnabled = computed({
      get: () => props.glowEnabled,
      set: (value) => emit('update:glowEnabled', value)
    });

    // 辉光变化处理
    const onGlowChange = () => {
      // 通知父组件辉光状态变化
      emit('glow-change', pillarGlowEnabled.value);
    };

    return {
      pillarGlowEnabled,
      onGlowChange
    };
  }
};
</script>

<style scoped>
.light-pillars-container {
  position: relative;
}

.glow-control {
  position: absolute;
  top: 10px;
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
</style>