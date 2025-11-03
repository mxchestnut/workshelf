import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import './App.css'

interface HealthStatus {
  status: string
  version: string
  service: string
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setHealth(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Work Shelf
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-300 mb-12">
            Social infrastructure platform for creators
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              Backend Status
            </h2>

            {loading && (
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <Loader2 className="animate-spin" />
                Connecting to backend...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <XCircle />
                Error: {error}
              </div>
            )}

            {health && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={20} />
                  <span className="font-medium">Status:</span>
                  <span className="text-green-600 dark:text-green-400 capitalize">{health.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Service:</span>
                  <span className="text-slate-600 dark:text-slate-300">{health.service}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Version:</span>
                  <span className="text-slate-600 dark:text-slate-300">{health.version}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🚀 Phase 0: Core Infrastructure
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>✅ FastAPI backend running</li>
              <li>✅ React frontend with Vite</li>
              <li>✅ Database schema & multi-tenancy (12 tables)</li>
              <li>✅ Keycloak running (authentication ready)</li>
              <li>✅ Document model with versioning</li>
              <li>⏳ API endpoints for documents</li>
              <li>⏳ Admin interface</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
