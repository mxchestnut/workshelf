import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './sentry'
import { initMatomo } from './matomo'
import { initPostHog } from './posthog'
import { msalConfig } from './config/authConfig'
import './index.css'

// Initialize error tracking and analytics before app renders
initSentry()
initMatomo()
initPostHog()

// Initialize MSAL
const msalInstance = new PublicClientApplication(msalConfig)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
