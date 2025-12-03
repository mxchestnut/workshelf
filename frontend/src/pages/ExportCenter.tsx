/**
 * Export Center - Document & Data Export Hub
 * 
 * Features:
 * - Export documents in multiple formats (PDF, DOCX, EPUB, Markdown, HTML, TXT, JSON)
 * - Export entire studios/projects
 * - GDPR data export
 * - Export job tracking with status monitoring
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { authService } from '../services/auth'
import { 
  Download, FileText, Package, Shield, Clock, CheckCircle, 
  XCircle, AlertCircle, RefreshCw, Trash2
} from 'lucide-react'
import { toast } from '../services/toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

type ExportTab = 'documents' | 'gdpr' | 'history'

interface Document {
  id: number
  title: string
  word_count: number
  updated_at: string
}

interface Studio {
  id: number
  name: string
  document_count: number
}

interface ExportJob {
  id: number
  export_type: string
  export_format: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  created_at: string
  completed_at: string | null
  file_url: string | null
  file_name: string | null
  file_size_bytes: number | null
  expires_at: string | null
  error_message: string | null
}

export function ExportCenter() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<ExportTab>('documents')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Documents export
  const [documents, setDocuments] = useState<Document[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)
  const [selectedStudioId, setSelectedStudioId] = useState<number | null>(null)
  const [exportFormat, setExportFormat] = useState('markdown')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeComments, setIncludeComments] = useState(false)
  const [includeVersionHistory, setIncludeVersionHistory] = useState(false)

  // Export jobs
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    }
    fetchUser()
    loadDocuments()
    loadStudios()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      loadExportJobs()
    }
  }, [activeTab])

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (err) {
      console.error('Failed to load documents:', err)
    }
  }

  const loadStudios = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/studios`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStudios(data.studios || [])
      }
    } catch (err) {
      console.error('Failed to load studios:', err)
    }
  }

  const loadExportJobs = async () => {
    setJobsLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/export/jobs?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setExportJobs(data.jobs || [])
      }
    } catch (err) {
      console.error('Failed to load export jobs:', err)
    } finally {
      setJobsLoading(false)
    }
  }

  const exportDocument = async () => {
    if (!selectedDocumentId) {
      setError('Please select a document')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/export/document/${selectedDocumentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          export_format: exportFormat,
          include_metadata: includeMetadata,
          include_comments: includeComments,
          include_version_history: includeVersionHistory
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to export document')
      }

      const result = await response.json()
      setSuccess(`Export job created! Job ID: ${result.job_id}. Check the History tab to track progress.`)
      toast.success('Document export job created')
      setActiveTab('history')
      loadExportJobs()
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to export document')
    } finally {
      setLoading(false)
    }
  }

  const exportStudio = async () => {
    if (!selectedStudioId) {
      setError('Please select a studio')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/export/studio/${selectedStudioId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          export_format: exportFormat,
          include_metadata: includeMetadata,
          include_comments: includeComments,
          include_version_history: includeVersionHistory
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to export studio')
      }

      const result = await response.json()
      setSuccess(`Export job created! Job ID: ${result.job_id}. Check the History tab to track progress.`)
      toast.success('Studio export job created')
      setActiveTab('history')
      loadExportJobs()
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to export studio')
    } finally {
      setLoading(false)
    }
  }

  const exportGDPR = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/export/gdpr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to export GDPR data')
      }

      const result = await response.json()
      setSuccess(`GDPR data export started! Job ID: ${result.job_id}. Check the History tab to track progress.`)
      toast.success('GDPR data export started')
      setActiveTab('history')
      loadExportJobs()
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to export GDPR data')
    } finally {
      setLoading(false)
    }
  }

  const downloadExport = async (jobId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/export/job/${jobId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to get download URL')
      }

      const data = await response.json()
      toast.success('Preparing download...')
      // Open download URL in new tab
      window.open(data.file_url, '_blank')
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to get download URL')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400'
      case 'processing': return 'text-blue-600 dark:text-blue-400'
      case 'pending': return 'text-yellow-600 dark:text-yellow-400'
      case 'failed': return 'text-red-600 dark:text-red-400'
      case 'expired': return 'text-gray-600 dark:text-gray-400'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5" />
      case 'processing': return <RefreshCw className="h-5 w-5 animate-spin" />
      case 'pending': return <Clock className="h-5 w-5" />
      case 'failed': return <XCircle className="h-5 w-5" />
      case 'expired': return <Trash2 className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        user={user} 
        onLogin={() => authService.login()} 
        onLogout={() => authService.logout()}
        currentPage="export-center" 
      />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Download className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Export Center</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Export your documents, data, and content in various formats
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Success</p>
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-border">
            <div className="flex gap-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('documents')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'documents'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-4 w-4" />
                Documents & Studios
              </button>
              <button
                onClick={() => setActiveTab('gdpr')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'gdpr'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="h-4 w-4" />
                GDPR Data Export
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="h-4 w-4" />
                Export History
              </button>
            </div>
          </div>
        </div>

        {/* Documents & Studios Tab */}
        {activeTab === 'documents' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Export Document */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Export Single Document</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Document</label>
                  <select
                    value={selectedDocumentId?.toString() || ''}
                    onChange={(e) => setSelectedDocumentId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  >
                    <option value="">Choose a document...</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.word_count} words)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Export Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  >
                    <option value="markdown">Markdown (.md)</option>
                    <option value="html">HTML (.html)</option>
                    <option value="txt">Plain Text (.txt)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="pdf">PDF (.pdf)</option>
                    <option value="docx">Microsoft Word (.docx)</option>
                    <option value="epub">EPUB eBook (.epub)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="rounded"
                    />
                    Include metadata
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeComments}
                      onChange={(e) => setIncludeComments(e.target.checked)}
                      className="rounded"
                    />
                    Include comments
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeVersionHistory}
                      onChange={(e) => setIncludeVersionHistory(e.target.checked)}
                      className="rounded"
                    />
                    Include version history
                  </label>
                </div>

                <button
                  onClick={exportDocument}
                  disabled={loading || !selectedDocumentId}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Export Document
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Export Studio */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Export Entire Studio</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Studio</label>
                  <select
                    value={selectedStudioId?.toString() || ''}
                    onChange={(e) => setSelectedStudioId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  >
                    <option value="">Choose a studio...</option>
                    {studios.map((studio) => (
                      <option key={studio.id} value={studio.id}>
                        {studio.name} ({studio.document_count} documents)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Export Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  >
                    <option value="markdown">Markdown (.md)</option>
                    <option value="html">HTML (.html)</option>
                    <option value="txt">Plain Text (.txt)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="pdf">PDF (.pdf)</option>
                    <option value="docx">Microsoft Word (.docx)</option>
                    <option value="epub">EPUB eBook (.epub)</option>
                  </select>
                </div>

                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    All documents will be exported as a ZIP archive with the selected format.
                  </p>
                </div>

                <button
                  onClick={exportStudio}
                  disabled={loading || !selectedStudioId}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      Export Studio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GDPR Tab */}
        {activeTab === 'gdpr' && (
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6" />
              <h2 className="text-2xl font-semibold">GDPR Data Export</h2>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground">
                Export all your personal data in compliance with GDPR regulations. This includes:
              </p>

              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>User profile and account information</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>All documents and their content</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Comments and discussions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Activity history and logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Settings and preferences</span>
                </li>
              </ul>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> The export will be available for download for 7 days after completion. 
                  Processing may take several minutes depending on the amount of data.
                </p>
              </div>

              <button
                onClick={exportGDPR}
                disabled={loading}
                className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Creating Export...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Request GDPR Data Export
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Export History Tab */}
        {activeTab === 'history' && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Export History</h2>
                </div>
                <p className="text-sm text-muted-foreground">Track and download your export jobs</p>
              </div>
              <button 
                onClick={loadExportJobs}
                disabled={jobsLoading}
                className="px-3 py-2 border border-input rounded-md hover:bg-accent text-sm flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${jobsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {jobsLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Loading export jobs...</p>
              </div>
            ) : exportJobs.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">No export jobs yet</p>
                <p className="text-sm text-muted-foreground">Create an export to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exportJobs.map((job) => (
                  <div key={job.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h4 className="font-medium">Export #{job.id}</h4>
                          <div className={`flex items-center gap-1 ${getStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="text-sm font-medium capitalize">{job.status}</span>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium border border-border rounded">
                            {job.export_type} - {job.export_format}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Created {formatDate(job.created_at)}
                          {job.completed_at && ` • Completed ${formatDate(job.completed_at)}`}
                        </p>
                      </div>
                    </div>

                    {job.status === 'completed' && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{job.file_name}</span> ({formatFileSize(job.file_size_bytes)})
                          {job.expires_at && (
                            <span> • Expires {formatDate(job.expires_at)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => downloadExport(job.id)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    )}

                    {job.status === 'failed' && job.error_message && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        Error: {job.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
