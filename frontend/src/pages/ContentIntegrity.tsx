/**
 * Content Integrity Page - AI Detection & Plagiarism Checking
 * Provides tools for checking content authenticity and originality
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { authService } from '../services/auth'
import { 
  Shield, AlertTriangle, CheckCircle, Clock, FileText, 
  Zap, TrendingUp, Search, RefreshCw, AlertCircle 
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface AICheckResult {
  ai_score: number
  ai_confidence: number
  classification: string
  interpretation: string
  result_message: string
  word_count: number
}

interface IntegrityCheck {
  id: number
  document_id: number
  check_type: string
  status: string
  word_count: number
  ai_score: number | null
  ai_confidence: number | null
  ai_details: any
  plagiarism_score: number | null
  plagiarism_matches: any
  total_matches: number | null
  cost_cents: number
  external_service: string | null
  error_message: string | null
  created_at: string
  processing_started_at: string | null
  processing_completed_at: string | null
}

interface Document {
  id: number
  title: string
  content: string
  word_count: number
}

type ActiveTab = 'quick' | 'document' | 'history'
type CheckType = 'ai_detection' | 'plagiarism' | 'combined'

export function ContentIntegrity() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('quick')
  const [quickCheckText, setQuickCheckText] = useState('')
  const [quickCheckLoading, setQuickCheckLoading] = useState(false)
  const [quickCheckResult, setQuickCheckResult] = useState<AICheckResult | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null)
  const [checkType, setCheckType] = useState<CheckType>('ai_detection')
  const [documentCheckLoading, setDocumentCheckLoading] = useState(false)
  const [checkHistory, setCheckHistory] = useState<IntegrityCheck[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')

  const wordCount = quickCheckText.trim().split(/\s+/).filter((w: string) => w.length > 0).length
  const minWords = 50
  const canRunQuickCheck = wordCount >= minWords

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    }
    fetchUser()
    loadDocuments()
    loadCheckHistory()
  }, [])

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

  const loadCheckHistory = async () => {
    setHistoryLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/content/my-checks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCheckHistory(data.checks || [])
      }
    } catch (err) {
      console.error('Failed to load check history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const runQuickCheck = async () => {
    if (!canRunQuickCheck) return
    
    setQuickCheckLoading(true)
    setError('')
    setQuickCheckResult(null)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/content/check-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: quickCheckText })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to run AI check')
      }

      const result = await response.json()
      setQuickCheckResult(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setQuickCheckLoading(false)
    }
  }

  const runDocumentCheck = async () => {
    if (!selectedDocument) return

    setDocumentCheckLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/content/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_id: selectedDocument,
          check_type: checkType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to run integrity check')
      }

      const result = await response.json()
      
      // Switch to history tab and refresh
      setActiveTab('history')
      loadCheckHistory()
      
      // Show success message
      alert(`Check started! Results will be available shortly. Check ID: ${result.check_id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDocumentCheckLoading(false)
    }
  }

  const getScoreColor = (score: number): string => {
    if (score < 30) return 'text-green-600 dark:text-green-400'
    if (score < 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreIcon = (score: number) => {
    if (score < 30) return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
    if (score < 70) return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
    return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
  }

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, {bg: string, text: string, icon: JSX.Element}> = {
      pending: { 
        bg: 'bg-gray-100 dark:bg-gray-800', 
        text: 'text-gray-700 dark:text-gray-300',
        icon: <Clock className="h-3 w-3" /> 
      },
      processing: { 
        bg: 'bg-blue-100 dark:bg-blue-900', 
        text: 'text-blue-800 dark:text-blue-200',
        icon: <RefreshCw className="h-3 w-3 animate-spin" /> 
      },
      completed: { 
        bg: 'bg-green-100 dark:bg-green-900', 
        text: 'text-green-800 dark:text-green-200',
        icon: <CheckCircle className="h-3 w-3" /> 
      },
      failed: { 
        bg: 'bg-red-100 dark:bg-red-900', 
        text: 'text-red-800 dark:text-red-200',
        icon: <AlertCircle className="h-3 w-3" /> 
      }
    }

    const style = statusStyles[status] || statusStyles.pending

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
        onLogin={() => authService.login()} onLogout={() => authService.logout()} 
        
        currentPage="content-integrity" 
      />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Content Integrity</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            AI detection, plagiarism checking, and content authenticity verification
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

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-border">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('quick')}
                className={`pb-4 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'quick'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="h-4 w-4" />
                Quick Check
              </button>
              <button
                onClick={() => setActiveTab('document')}
                className={`pb-4 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'document'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-4 w-4" />
                Document Check
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-4 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Check History
              </button>
            </div>
          </div>
        </div>

        {/* Quick Check Tab */}
        {activeTab === 'quick' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Quick AI Detection Check</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Paste your text below to check for AI-generated content. Minimum {minWords} words required.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <textarea
                    value={quickCheckText}
                    onChange={(e) => setQuickCheckText(e.target.value)}
                    placeholder="Paste your text here for AI detection analysis..."
                    className="w-full min-h-[200px] px-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">
                      Word count: <span className={wordCount >= minWords ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}>{wordCount}</span> / {minWords} minimum
                    </p>
                    {wordCount > 0 && wordCount < minWords && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Need {minWords - wordCount} more words
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={runQuickCheck}
                  disabled={!canRunQuickCheck || quickCheckLoading}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {quickCheckLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing with GPTZero...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Run AI Detection Check
                    </>
                  )}
                </button>

                {quickCheckResult && (
                  <div className="mt-6 space-y-4">
                    <div className="p-6 bg-muted rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">Detection Results</h3>
                          <p className="text-sm text-muted-foreground">{quickCheckResult.word_count} words analyzed</p>
                        </div>
                        {getScoreIcon(quickCheckResult.ai_score)}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">AI Probability Score</span>
                            <span className={`text-2xl font-bold ${getScoreColor(quickCheckResult.ai_score)}`}>
                              {quickCheckResult.ai_score.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${quickCheckResult.ai_score}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Confidence Level</span>
                          <span className="text-lg font-semibold">{quickCheckResult.ai_confidence.toFixed(1)}%</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Classification</span>
                          <span className="px-2 py-1 text-xs font-medium uppercase border border-border rounded">
                            {quickCheckResult.classification}
                          </span>
                        </div>

                        <div className="pt-4 border-t border-border">
                          <p className="text-sm font-medium mb-2">Interpretation</p>
                          <p className="text-sm text-muted-foreground">{quickCheckResult.interpretation}</p>
                        </div>

                        {quickCheckResult.result_message && (
                          <div className="pt-4 border-t border-border">
                            <p className="text-sm font-medium mb-2">Detailed Analysis</p>
                            <p className="text-xs text-muted-foreground">{quickCheckResult.result_message}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Note:</strong> AI detection is probabilistic and should be used as one factor among many when evaluating content authenticity. 
                        False positives can occur, especially with technical or formal writing styles.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Check Tab */}
        {activeTab === 'document' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Full Document Integrity Check</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Run comprehensive integrity checks on your saved documents. Results are saved to your check history.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Document</label>
                  <select
                    value={selectedDocument?.toString() || ''}
                    onChange={(e) => setSelectedDocument(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <label className="text-sm font-medium mb-2 block">Check Type</label>
                  <select
                    value={checkType}
                    onChange={(e) => setCheckType(e.target.value as CheckType)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ai_detection">AI Detection Only - Check for AI-generated content using GPTZero</option>
                    <option value="plagiarism">Plagiarism Check Only - Check for copied content using Copyscape</option>
                    <option value="combined">Combined Check - Run both AI detection and plagiarism checks</option>
                  </select>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">Check includes:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {(checkType === 'ai_detection' || checkType === 'combined') && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        AI-generated content detection (GPTZero)
                      </li>
                    )}
                    {(checkType === 'plagiarism' || checkType === 'combined') && (
                      <li className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Plagiarism checking (Copyscape)
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Saved to check history
                    </li>
                  </ul>
                  
                  {(checkType === 'plagiarism' || checkType === 'combined') && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong>Cost:</strong> Plagiarism checks cost approximately $0.03-0.05 per check, depending on document length.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={runDocumentCheck}
                  disabled={!selectedDocument || documentCheckLoading}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {documentCheckLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Starting Check...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Run Integrity Check
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">About Content Integrity Checks</h4>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>AI Detection:</strong> Uses GPTZero to identify AI-generated content. Results are probabilistic - technical writing may score higher.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Search className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Plagiarism Check:</strong> Uses Copyscape to search billions of web pages for matching content. Shows URLs and similarity percentages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Privacy:</strong> Your content is only sent to the external service for analysis and is not stored by them.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">Check History</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">View all your past integrity checks</p>
                </div>
                <button 
                  onClick={loadCheckHistory}
                  className="px-3 py-2 border border-input rounded-md hover:bg-accent text-sm flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {historyLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Loading check history...</p>
                </div>
              ) : checkHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">No integrity checks yet</p>
                  <p className="text-sm text-muted-foreground">Run your first check to see results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checkHistory.map((check) => (
                    <div key={check.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium">Check #{check.id}</h4>
                            {getStatusBadge(check.status)}
                            <span className="px-2 py-1 text-xs font-medium border border-border rounded">
                              {check.check_type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {check.word_count} words • {formatDate(check.created_at)}
                          </p>
                        </div>
                      </div>

                      {check.status === 'completed' && check.ai_score !== null && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">AI Score</span>
                            <div className="flex items-center gap-2">
                              {getScoreIcon(check.ai_score)}
                              <span className={`text-lg font-bold ${getScoreColor(check.ai_score)}`}>
                                {check.ai_score.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div 
                              className="h-1.5 rounded-full bg-primary transition-all"
                              style={{ width: `${check.ai_score}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Confidence: {check.ai_confidence?.toFixed(1)}%</span>
                            {check.cost_cents && (
                              <span>Cost: ${(check.cost_cents / 100).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {check.status === 'failed' && check.error_message && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          Error: {check.error_message}
                        </div>
                      )}

                      {check.status === 'processing' && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Processing...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
