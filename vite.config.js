import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 自定义插件：完全排除大字体文件
function excludeLargeFonts() {
  return {
    name: 'exclude-large-fonts',
    resolveId(id) {
      // 如果引用了大字体文件，返回一个空模块
      if (id.includes('FZWeiBei-S03_Regular.json') || id.includes('FZLiShu-S01_Regular.json')) {
        return id
      }
    },
    load(id) {
      // 返回空对象，避免加载大文件
      if (id.includes('FZWeiBei-S03_Regular.json') || id.includes('FZLiShu-S01_Regular.json')) {
        return 'export default {}'
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  // Vercel 部署时使用根路径，GitHub Pages 使用子路径
  base: process.env.VERCEL ? '/' : '/3D-Map-dp/',
  plugins: [vue(), excludeLargeFonts()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    assetsInlineLimit: 0 // 禁止内联资源
  }
})