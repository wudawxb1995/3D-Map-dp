import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 自定义插件：排除大字体文件
function excludeLargeFonts() {
  return {
    name: 'exclude-large-fonts',
    resolveId(id) {
      if (id.includes('FZWeiBei-S03_Regular.json') || id.includes('FZLiShu-S01_Regular.json')) {
        return { id, external: true }
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
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: (assetInfo) => {
          // 排除大字体文件
          if (assetInfo.name && assetInfo.name.endsWith('.json') && 
              (assetInfo.name.includes('FZWeiBei') || assetInfo.name.includes('FZLiShu'))) {
            return 'excluded/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    assetsInlineLimit: 0 // 禁止内联资源
  }
})