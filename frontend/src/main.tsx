import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './sentry'
import { initMatomo } from './matomo'
import { initPostHog } from './posthog'
import './index.css'

// Initialize error tracking and analytics before app renders
initSentry()
initMatomo()
initPostHog()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
