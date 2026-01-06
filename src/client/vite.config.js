import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Windows 文件系统
    },
    hmr: {
      overlay: true, // 显示错误覆盖层
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'reactflow'],
  },
})
