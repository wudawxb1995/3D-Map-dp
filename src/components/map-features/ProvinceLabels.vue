<template>
  <div class="province-labels-container">
    <!-- 标牌显示控制 -->
    <div class="labels-control" v-if="showControls">
      <button 
        :class="['control-btn', { active: showLabels }]"
        @click="toggleLabels"
      >
        标牌
      </button>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";

export default {
  name: "ProvinceLabels",
  props: {
    provinces: {
      type: Array,
      default: () => []
    },
    showLabels: {
      type: Boolean,
      default: true
    },
    showControls: {
      type: Boolean,
      default: true
    },
    labelConfig: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:showLabels'],
  setup(props, { emit }) {
    // 切换标牌显示
    const toggleLabels = () => {
      emit('update:showLabels', !props.showLabels);
    };

    return {
      toggleLabels
    };
  }
};
</script>

<style scoped>
.province-labels-container {
  position: relative;
}

.labels-control {
  position: absolute;
  top: 50px;
  right: 10px;
  z-index: 10;
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