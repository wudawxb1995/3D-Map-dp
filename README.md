# 3D地图Vue单页面应用

这是一个基于Vue 3 + Vite构建的3D地图单页面应用。

## 技术栈

- **Vue 3** - 渐进式JavaScript框架
- **Vite** - 快速的前端构建工具
- **现代浏览器支持** - 支持ES6+语法

## 环境要求

- Node.js 16+ 
- npm 或 yarn

## 安装依赖

```bash
npm install
```

## 开发服务器

```bash
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动

## 构建生产版本

```bash
npm run build
```

## 预览生产构建

```bash
npm run preview
```

## 项目结构

```
├── src/
│   ├── App.vue          # 根组件
│   ├── main.js          # 应用入口
│   └── style.css        # 全局样式
├── index.html           # HTML模板
├── vite.config.js       # Vite配置
└── package.json         # 项目配置
```

## 开发说明

这是一个为3D地图应用准备的基础框架，您可以在此基础上：

1. 集成Three.js用于3D渲染
2. 添加地图相关库（如Leaflet、Mapbox等）
3. 扩展组件系统
4. 添加状态管理（如需要）

## 浏览器支持

- Chrome >= 87
- Firefox >= 78  
- Safari >= 14
- Edge >= 88