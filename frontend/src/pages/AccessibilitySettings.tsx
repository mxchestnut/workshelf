/**
 * Accessibility Settings Page
 * WCAG compliance settings and document accessibility checker
 */
import { useState, useEffect } from 'react'
import { 
  Eye, 
  Type, 
  Keyboard, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  FileText,
  BarChart3,
  Settings
} from 'lucide-react'
import { toast } from '../services/toast'

interface AccessibilitySettings {
  font_size: number
  high_contrast: boolean
  dyslexia_font: boolean
  screen_reader_mode: boolean
  reduce_animations: boolean
  keyboard_shortcuts: boolean
  focus_indicators: boolean
  color_blind_mode: string | null
  text_spacing: number
  reading_guide: boolean
  alt_text_preference: string
}

interface DocumentScore {
  document_id: number
  title: string
  score: number
  wcag_level: string
  issues_count: number
}

export function AccessibilitySettings() {
  const [activeTab, setActiveTab] = useState<'settings' | 'checker' | 'report'>('settings')
  const [settings, setSettings] = useState<AccessibilitySettings>({
    font_size: 16,
    high_contrast: false,
    dyslexia_font: false,
    screen_reader_mode: false,
    reduce_animations: false,
    keyboard_shortcuts: true,
    focus_indicators: true,
    color_blind_mode: null,
    text_spacing: 1.5,
    reading_guide: false,
    alt_text_preference: 'brief'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Document checker state
  const [documents, setDocuments] = useState<Array<{id: number, title: string}>>([])
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)

  // Report state
  const [report, setReport] = useState<{
    total_documents: number
    average_score: number
    total_issues: number
    documents: DocumentScore[]
  } | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    loadSettings()
    loadDocuments()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/accessibility/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/v1/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setMessage(null)
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/accessibility/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        toast.success('Accessibility settings saved')
        
        // Apply settings to the page immediately
        applySettings(settings)
        
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        const message = error.detail || 'Failed to save settings'
        setMessage({ type: 'error', text: message })
        toast.error(message)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const applySettings = (settings: AccessibilitySettings) => {
    // Apply font size
    document.documentElement.style.fontSize = `${settings.font_size}px`
    
    // Apply high contrast
    if (settings.high_contrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
    
    // Apply dyslexia font
    if (settings.dyslexia_font) {
      document.documentElement.classList.add('dyslexia-font')
    } else {
      document.documentElement.classList.remove('dyslexia-font')
    }
    
    // Apply reduced animations
    if (settings.reduce_animations) {
      document.documentElement.classList.add('reduce-animations')
    } else {
      document.documentElement.classList.remove('reduce-animations')
    }
  }

  const checkDocument = async () => {
    if (!selectedDocId) return

    try {
      setChecking(true)
      setCheckResult(null)
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`/api/accessibility/check-document/${selectedDocId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setCheckResult(result)
        toast.success('Document accessibility check complete')
      } else {
        const error = await response.json()
        const message = error.detail || 'Failed to check document'
        setMessage({ type: 'error', text: message })
        toast.error(message)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to check document' })
      toast.error('Failed to check document')
    } finally {
      setChecking(false)
    }
  }

  const loadReport = async () => {
    try {
      setLoadingReport(true)
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/accessibility/report', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setReport(data)
        toast.success('Accessibility report loaded')
      }
    } catch (error) {
      console.error('Failed to load report:', error)
      toast.error('Failed to load accessibility report')
    } finally {
      setLoadingReport(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'report' && !report) {
      loadReport()
    }
  }, [activeTab, report, loadReport])

  const getWCAGColor = (level: string) => {
    switch (level) {
      case 'AAA': return 'text-green-500'
      case 'AA': return 'text-blue-500'
      case 'A': return 'text-yellow-500'
      default: return 'text-red-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Accessibility Settings</h1>
          <p className="text-muted-foreground">
            Configure your reading experience and check document accessibility compliance
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={message.type === 'success' ? 'text-green-500' : 'text-red-500'}>
              {message.text}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-5 h-5" />
            Personal Settings
          </button>
          <button
            onClick={() => setActiveTab('checker')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'checker'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-5 h-5" />
            Document Checker
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'report'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Accessibility Report
          </button>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Visual Settings */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">Visual Settings</h2>
              </div>

              <div className="space-y-4">
                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Font Size: {settings.font_size}px
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="48"
                    value={settings.font_size}
                    onChange={(e) => setSettings({...settings, font_size: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>8px</span>
                    <span>16px (default)</span>
                    <span>48px</span>
                  </div>
                </div>

                {/* Text Spacing */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Text Spacing: {settings.text_spacing.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={settings.text_spacing}
                    onChange={(e) => setSettings({...settings, text_spacing: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1.0x</span>
                    <span>1.5x (default)</span>
                    <span>3.0x</span>
                  </div>
                </div>

                {/* High Contrast */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">High Contrast Mode</div>
                    <div className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.high_contrast}
                      onChange={(e) => setSettings({...settings, high_contrast: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Reading Guide */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Reading Guide</div>
                    <div className="text-sm text-muted-foreground">
                      Show a line to guide your reading
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reading_guide}
                      onChange={(e) => setSettings({...settings, reading_guide: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Color Blind Mode */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Color Blind Mode
                  </label>
                  <select
                    value={settings.color_blind_mode || 'none'}
                    onChange={(e) => setSettings({...settings, color_blind_mode: e.target.value === 'none' ? null : e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                  >
                    <option value="none">None</option>
                    <option value="protanopia">Protanopia (Red-Blind)</option>
                    <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                    <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Typography Settings */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Type className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">Typography</h2>
              </div>

              <div className="space-y-4">
                {/* Dyslexia Font */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Dyslexia-Friendly Font</div>
                    <div className="text-sm text-muted-foreground">
                      Use OpenDyslexic font for easier reading
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dyslexia_font}
                      onChange={(e) => setSettings({...settings, dyslexia_font: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Alt Text Preference */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Alt Text Style
                  </label>
                  <select
                    value={settings.alt_text_preference}
                    onChange={(e) => setSettings({...settings, alt_text_preference: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                  >
                    <option value="brief">Brief descriptions</option>
                    <option value="verbose">Detailed descriptions</option>
                    <option value="technical">Technical descriptions</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interaction Settings */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Keyboard className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">Interaction</h2>
              </div>

              <div className="space-y-4">
                {/* Screen Reader Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Screen Reader Mode</div>
                    <div className="text-sm text-muted-foreground">
                      Optimize interface for screen readers
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.screen_reader_mode}
                      onChange={(e) => setSettings({...settings, screen_reader_mode: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Keyboard Shortcuts</div>
                    <div className="text-sm text-muted-foreground">
                      Enable keyboard navigation
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.keyboard_shortcuts}
                      onChange={(e) => setSettings({...settings, keyboard_shortcuts: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Focus Indicators */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Focus Indicators</div>
                    <div className="text-sm text-muted-foreground">
                      Show visible focus outlines
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.focus_indicators}
                      onChange={(e) => setSettings({...settings, focus_indicators: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Reduce Animations */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Reduce Animations</div>
                    <div className="text-sm text-muted-foreground">
                      Minimize motion and transitions
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reduce_animations}
                      onChange={(e) => setSettings({...settings, reduce_animations: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Document Checker Tab */}
        {activeTab === 'checker' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Check Document Accessibility</h2>
              <p className="text-muted-foreground mb-6">
                Analyze your documents for WCAG compliance and accessibility best practices
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Document
                  </label>
                  <select
                    value={selectedDocId || ''}
                    onChange={(e) => setSelectedDocId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                  >
                    <option value="">Choose a document...</option>
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={checkDocument}
                  disabled={!selectedDocId || checking}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {checking ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Check Accessibility
                    </>
                  )}
                </button>
              </div>

              {/* Results */}
              {checkResult && (
                <div className="mt-6 space-y-4">
                  {/* Overall Score */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Accessibility Score</span>
                      <span className={`text-2xl font-bold ${getWCAGColor(checkResult.wcag_level)}`}>
                        {checkResult.score}/100
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">WCAG Level:</span>
                      <span className={`font-medium ${getWCAGColor(checkResult.wcag_level)}`}>
                        {checkResult.wcag_level}
                      </span>
                    </div>
                  </div>

                  {/* Issues */}
                  {checkResult.issues && checkResult.issues.length > 0 && (
                    <div className="bg-background border border-border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Issues Found ({checkResult.issues.length})</h3>
                      <div className="space-y-3">
                        {checkResult.issues.map((issue: any, index: number) => (
                          <div key={index} className="flex gap-3">
                            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                              issue.severity === 'critical' ? 'text-red-500' :
                              issue.severity === 'warning' ? 'text-yellow-500' :
                              'text-blue-500'
                            }`} />
                            <div>
                              <div className="font-medium">{issue.title}</div>
                              <div className="text-sm text-muted-foreground">{issue.description}</div>
                              {issue.suggestion && (
                                <div className="text-sm text-primary mt-1">
                                  💡 {issue.suggestion}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reading Level */}
                  {checkResult.reading_level && (
                    <div className="bg-background border border-border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Reading Level</h3>
                      <div className="text-muted-foreground">
                        {checkResult.reading_level}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {loadingReport ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : report ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="text-sm text-muted-foreground mb-1">Total Documents</div>
                    <div className="text-3xl font-bold">{report.total_documents}</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="text-sm text-muted-foreground mb-1">Average Score</div>
                    <div className="text-3xl font-bold text-primary">{report.average_score.toFixed(1)}</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="text-sm text-muted-foreground mb-1">Total Issues</div>
                    <div className="text-3xl font-bold text-yellow-500">{report.total_issues}</div>
                  </div>
                </div>

                {/* Document List */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Document Scores</h2>
                  <div className="space-y-3">
                    {report.documents.map((doc) => (
                      <div key={doc.document_id} className="flex items-center justify-between p-4 bg-background rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {doc.issues_count} issue{doc.issues_count !== 1 ? 's' : ''} found
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`font-bold ${getWCAGColor(doc.wcag_level)}`}>
                            {doc.wcag_level}
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{doc.score}/100</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No accessibility data available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
