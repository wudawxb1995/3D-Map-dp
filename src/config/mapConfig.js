// 地图可视化配置文件
export const MAP_CONFIG = {
  // 标签配置
  LABEL_CONFIG: {
    floatHeight: 2000,
    floatRange: 20,
    floatSpeed: 0.001,
    fontSize: 3000,
    textColor: 0xffd700,
    outlineColor: 0xffaa00,
    textDepth: 500,
    bevelEnabled: true,
    bevelThickness: 50,
    bevelSize: 30,
    emissiveIntensity: 0.8,
  },

  // 图标配置
  ICON_CONFIG: {
    iconSize: 3000,
    iconHeight: 18000,
    labelOffsetY: 8000,
    labelFontSize: 8000,
    labelPadding: 400,
    labelBorderRadius: 200,
    labelColor: 0x333333,
    labelBgColor: "#000000",
    emissiveIntensity: 1.5,
  },

  // 光柱配置
  PILLAR_CONFIG: {
    radius: 750,
    baseHeight: 15000,
    maxHeight: 25000,
    minHeight: 3000,
    segments: 32,
    labelOffsetY: 2000,
    labelFontSize: 3000,
    colorRanges: [
      { min: 0, max: 2000, color: 0x80d8ff },
      { min: 2000, max: 4000, color: 0x40c4ff },
      { min: 4000, max: 6000, color: 0x00b0ff },
      { min: 6000, max: 8000, color: 0x0091ea },
      { min: 8000, max: Infinity, color: 0x0277bd }
    ]
  },

  // 飞线配置
  FLYLINE_CONFIG: {
    color: 0x00ffff,
    pulseColor: 0xff9900,
    lineWidth: 2,
    pulseSpeed: 0.008,
    pulseLength: 0.15,
    curveHeight: 8000,
    rippleColor: 0x00ffff,
    rippleMaxRadius: 3000,
    rippleSpeed: 0.005,
    rippleCount: 3,
    rippleInterval: 0.33,
    pulseHeadRadius: 120,
    pulseTailRadius: 20,
    pulseTubeSegments: 16,
    pulseRadialSegments: 32,
  },

  // 波纹配置
  RIPPLE_CONFIG: {
    maxRadius: 50000,
    initialRadius: 100,
    expansionSpeed: 800,
    opacityDecay: 0.01,
    color: 0x00bfff,
    segments: 64,
    initialOpacity: 0.8,
    minOpacity: 0,
    interval: 3000,
  },

  // 中心波纹配置
  CENTER_RIPPLE_CONFIG: {
    maxRadius: 500000,
    initialRadius: 1000,
    expansionSpeed: 100000,
    opacityDecay: 0.003,
    color: 0x00ff88,
    segments: 64,
    initialOpacity: 0.8,
    minOpacity: 0,
    interval: 3000,
    heightOffset: 100,
  }
};