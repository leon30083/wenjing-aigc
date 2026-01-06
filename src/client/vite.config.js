import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // ✅ 确保 React Fast Refresh 正常工作
      fastRefresh: true,
      // ✅ 排除不需要优化的依赖
      include: '**/*.{jsx,js}',
    }),
  ],
  server: {
    watch: {
      usePolling: true, // Windows 文件系统
      // ✅ 优化轮询间隔（毫秒）
      interval: 100,
      // ✅ 忽略不必要的文件
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**'
      ]
    },
    hmr: {
      overlay: true, // 显示错误覆盖层
      // ✅ 明确配置 HMR 协议
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
    // ✅ 严格文件系统模式（提高文件监听准确性）
    fs: {
      strict: true
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'reactflow',
      // ✅ 确保 React Flow 的依赖也被预构建
      '@xyflow/react'
    ],
    force: false, // 不强制重新构建
  },
  build: {
    sourcemap: true, // ✅ 开发时启用 sourcemap
  },
})
