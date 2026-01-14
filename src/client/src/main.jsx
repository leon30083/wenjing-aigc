import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactFlowProvider } from 'reactflow'
import './index.css'
import App from './App.jsx'
import { APIConfigProvider } from './contexts/APIConfigContext'

createRoot(document.getElementById('root')).render(
  // ✅ 移除 StrictMode 以提高 HMR 稳定性
  <ReactFlowProvider>
    {/* ⭐ APIConfigProvider: 提供全局 API 配置状态（解决错误56） */}
    <APIConfigProvider>
      <App />
    </APIConfigProvider>
  </ReactFlowProvider>,
)
