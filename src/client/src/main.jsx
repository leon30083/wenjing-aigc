import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactFlowProvider } from 'reactflow'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // ✅ 移除 StrictMode 以提高 HMR 稳定性
  <ReactFlowProvider>
    <App />
  </ReactFlowProvider>,
)
