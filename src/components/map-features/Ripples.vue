<template>
  <div class="ripples-container">
    <!-- 波纹显示控制 -->
    <div class="ripples-control" v-if="showControls">
      <button 
        :class="['control-btn', { active: showRipples }]"
        @click="toggleRipples"
      >
        波纹
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "Ripples",
  props: {
    showRipples: {
      type: Boolean,
      default: false
    },
    showControls: {
      type: Boolean,
      default: true
    },
    rippleConfig: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:showRipples'],
  setup(props, { emit }) {
    // 切换波纹显示
    const toggleRipples = () => {
      emit('update:showRipples', !props.showRipples);
    };

    return {
      toggleRipples
    };
  }
};
</script>

<style scoped>
.ripples-container {
  position: relative;
}

.ripples-control {
  position: absolute;
  top: 170px;
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