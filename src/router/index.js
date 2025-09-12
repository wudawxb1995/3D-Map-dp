import { createRouter, createWebHistory } from 'vue-router'

// 首页
import Home from '@/views/Home.vue'
// 地图展示组件
import BasicPoints from '@/views/points/BasicPoints.vue'
import FlyingLines from '@/views/lines/FlyingLines.vue'
import FlowLines from '@/views/lines/FlowLines.vue'
import BasicSurfaces from '@/views/surfaces/BasicSurfaces.vue'
import BasicVolumes from '@/views/volumes/BasicVolumes.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '首页' }
  },
  // 点效果路由
  {
    path: '/points/basic',
    name: 'BasicPoints',
    component: BasicPoints,
    meta: { title: '基础点效果' }
  },
  // 线效果路由
  {
    path: '/lines/flying',
    name: 'FlyingLines',
    component: FlyingLines,
    meta: { title: '飞线效果' }
  },
  {
    path: '/lines/flow-lines',
    name: 'FlowLines',
    component: FlowLines,
    meta: { title: '流动线效果' }
  },
  // 面效果路由
  {
    path: '/surfaces/basic',
    name: 'BasicSurfaces',
    component: BasicSurfaces,
    meta: { title: '基础面效果' }
  },
  // 体效果路由
  {
    path: '/volumes/basic',
    name: 'BasicVolumes',
    component: BasicVolumes,
    meta: { title: '基础体效果' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 3D地图引擎`
  }
  next()
})

export default router