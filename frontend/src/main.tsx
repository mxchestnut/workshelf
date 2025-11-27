import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { MatrixProvider } from './hooks/useMatrixClient.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MatrixProvider>
      <App />
    </MatrixProvider>
  </React.StrictMode>,
)
