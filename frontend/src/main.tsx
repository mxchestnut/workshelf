import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { MatrixProvider } from './hooks/useMatrixClient.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './sentry'
import './index.css'

// Initialize error tracking before app renders
initSentry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MatrixProvider>
        <App />
      </MatrixProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
