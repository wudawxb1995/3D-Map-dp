# 3D 中国地图可视化项目

一个基于 Vue 3 和 Three.js 的交互式 3D 中国地图可视化应用，提供沉浸式的地理数据展示体验。

## ✨ 在线演示

🌐 **[点击查看在线 Demo](https://wudawxb1995.github.io/3D-Map-dp/)**

## 🎯 核心特性

- **3D 地图渲染** - 基于 Three.js 的高性能 3D 渲染引擎
- **多层级下钻** - 支持国家 → 省份 → 城市的层级导航
- **多种可视化模式**
  - 🏛️ 光柱模式 - 数据高度可视化
  - 🏷️ 标签模式 - 省份信息展示
  - ✈️ 飞线模式 - 动态连接线动画
  - 🌊 波纹模式 - 扩散效果展示
- **视觉特效**
  - Bloom 辉光效果
  - 边界流动动画
  - 实时性能监控（FPS 面板）
- **交互功能**
  - 鼠标拖动旋转
  - 滚轮缩放
  - 点击下钻
  - 面包屑导航

## 🛠️ 技术栈

### 核心框架
- **Vue 3** - 使用 Composition API
- **Vite** - 构建工具和开发服务器
- **Vue Router** - 客户端路由

### 3D 图形与可视化
- **Three.js** - 3D 渲染引擎
- **OrbitControls** - 相机控制
- **EffectComposer** - 后处理效果（辉光、泛光）

### 数据存储
- **IndexedDB (idb)** - 客户端数据持久化

## 📦 安装与运行

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
访问 http://localhost:3000

### 生产构建
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

## 📁 项目结构

```
src/
├── assets/          # 静态资源
│   ├── fonts/       # 字体文件（JSON typeface 数据）
│   ├── image/       # 图片和纹理
│   ├── json/        # GeoJSON 地图数据
│   └── jsonNew/     # 更新的 GeoJSON 数据
├── components/      # Vue 组件
│   ├── China3DMap.vue        # 主地图组件
│   ├── MainLayout.vue        # 主布局
│   └── map-features/         # 地图特性组件
│       ├── Province3D.vue    # 3D 省份渲染
│       ├── LightPillars.vue  # 光柱可视化
│       ├── ProvinceLabels.vue # 省份标签
│       ├── FlyLines.vue      # 飞线动画
│       └── Ripples.vue       # 波纹效果
├── config/          # 配置文件
│   ├── mapConfig.js          # 视觉配置
│   └── provinceCodeMap.js    # 省份代码映射
├── utils/           # 工具函数
│   ├── projection.js         # 坐标转换
│   ├── mapUtils.js          # 地图工具
│   ├── mapDataLoader.js     # 数据加载
│   └── mapAnimations.js     # 动画工具
├── views/           # 页面组件
└── router/          # 路由配置
```

## 🎮 使用说明

### 基础操作
- **旋转地图**: 鼠标左键拖动
- **缩放**: 鼠标滚轮
- **下钻**: 点击省份/城市区域
- **返回**: 点击面包屑导航

### 可视化模式切换
使用右侧控制面板切换不同的数据展示模式：
- 光柱：显示数据高度柱状图
- 标牌：显示省份名称和数据标签
- 飞线：显示从北京到各省的动态连接线
- 波纹：显示中心扩散波纹效果

### 性能监控
右上角的 FPS 面板实时显示：
- FPS（每秒帧数）
- MS（每帧毫秒数）
- MB（内存使用）

## ⚡ 性能优化

项目已进行多项性能优化：
- 限制像素比率（最大 2x）
- 降低 Bloom 后处理分辨率
- 优化动画更新频率
- 减少几何体复杂度
- 目标 FPS: 50+

详见 [性能优化文档](.kiro/steering/performance.md)

## 🌐 浏览器支持

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过 GitHub Issues 联系。

---

⭐ 如果这个项目对你有帮助，请给个 Star！
