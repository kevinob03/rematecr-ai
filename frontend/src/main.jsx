import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App.jsx'
import { SessionProvider } from './app/session.jsx'
import { ComparisonProvider } from './app/comparison.jsx'
import './app/theme.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <ComparisonProvider>
          <App />
        </ComparisonProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
