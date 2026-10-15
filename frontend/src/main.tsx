import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'
import { AuthProvider } from './store/auth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: '14px',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
