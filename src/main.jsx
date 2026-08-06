import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { registerPushServiceWorker } from './lib/push'
import { startUpdateChecker } from './lib/updateCheck'
import './index.css'
import App from './App.jsx'

registerPushServiceWorker().catch(() => {})
startUpdateChecker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
