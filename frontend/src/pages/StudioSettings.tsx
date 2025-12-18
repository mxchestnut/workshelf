import { useState, useEffect } from 'react'
import { 
  Palette, Globe, BarChart3, Settings, Plus, AlertCircle, 
  CheckCircle, XCircle, Copy, Loader2, ArrowLeft, Trash2
} from 'lucide-react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface Studio {
  id: number
  name: string
  slug: string
  description?: string
  logo_url?: string
  banner_url?: string
  primary_color?: string
  is_public: boolean
}

interface CustomDomain {
  id: number
  studio_id: number
  domain: string
  subdomain?: string
  is_verified: boolean
  verification_token?: string
  verification_method: string
  verified_at?: string
  ssl_enabled: boolean
  dns_records?: Array<{
    type: string
    name: string
    value: string
    ttl: number
  }>
  is_active: boolean
  status: string
  error_message?: string
  created_at: string
  updated_at: string
}

interface StudioTheme {
  id: number
  studio_id: number
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  heading_font: string
  body_font: string
  code_font: string
  custom_css?: string
  layout_config?: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

type TabType = 'general' | 'theme' | 'domains' | 'analytics'

export default function StudioSettings() {
  // Extract studioId from URL path like /studio/123/settings
  const pathParts = window.location.pathname.split('/')
  const studioIdIndex = pathParts.indexOf('studio') + 1
  const studioId = studioIdIndex > 0 && studioIdIndex < pathParts.length 
    ? pathParts[studioIdIndex] 
    : null
  
  const [user] = useState<User | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [theme, setTheme] = useState<StudioTheme | null>(null)
  const [customDomains, setCustomDomains] = useState<CustomDomain[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Domain state
  const [newDomain, setNewDomain] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)
  
  // Theme state
  const [themeData, setThemeData] = useState({
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    accent_color: '#10B981',
    background_color: '#FFFFFF',
    text_color: '#1F2937',
    heading_font: 'Inter',
    body_font: 'Inter',
    code_font: 'JetBrains Mono'
  })

  useEffect(() => {
    loadStudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioId])

  useEffect(() => {
    if (activeTab === 'domains' && customDomains.length === 0) {
      loadCustomDomains()
    } else if (activeTab === 'theme' && !theme) {
      loadTheme()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const loadStudio = async () => {
    try {
      const token = authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/studios/${studioId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStudio(data)
      } else if (response.status === 404) {
        setError('Studio not found')
      } else if (response.status === 403) {
        setError('You do not have permission to manage this studio')
      }
    } catch (err) {
      setError('Failed to load studio')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomDomains = async () => {
    try {
      const token = authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/studios/${studioId}/custom-domains`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCustomDomains(data)
      }
    } catch (err) {
      console.error('Failed to load custom domains:', err)
    }
  }

  const loadTheme = async () => {
    try {
      const token = authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/studios/${studioId}/theme`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTheme(data)
        setThemeData({
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          accent_color: data.accent_color,
          background_color: data.background_color,
          text_color: data.text_color,
          heading_font: data.heading_font,
          body_font: data.body_font,
          code_font: data.code_font
        })
      }
    } catch (err) {
      console.error('Failed to load theme:', err)
    }
  }

  const addCustomDomain = async () => {
    if (!newDomain.trim()) {
      setDomainError('Please enter a domain name')
      return
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/
    if (!domainRegex.test(newDomain.trim())) {
      setDomainError('Please enter a valid domain name (e.g., docs.example.com)')
      return
    }

    try {
      const token = authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/studios/${studioId}/custom-domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          domain: newDomain.trim(),
          subdomain: newDomain.includes('.') ? newDomain.split('.')[0] : undefined
        })
      })

      if (response.ok) {
        const newDomainData = await response.json()
        setCustomDomains([...customDomains, newDomainData])
        setNewDomain('')
        setSuccess('Domain added! Please configure DNS records below.')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        const errorData = await response.json()
        setDomainError(errorData.detail || 'Failed to add domain')
      }
    } catch (err) {
      setDomainError('Network error. Please try again.')
    }
  }

  const verifyDomain = async (domainId: number) => {
    try {
      const token = authService.getAccessToken()
      const response = await fetch(
        `${API_URL}/api/v1/studios/${studioId}/custom-domains/${domainId}/verify`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        const updatedDomain = await response.json()
        setCustomDomains(customDomains.map(d => 
          d.id === domainId ? updatedDomain : d
        ))
        setSuccess('Domain verified successfully!')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Verification failed')
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 5000)
    }
  }

  const deleteDomain = async (domainId: number) => {
    if (!confirm('Are you sure you want to remove this domain?')) return

    try {
      const token = authService.getAccessToken()
      const response = await fetch(
        `${API_URL}/api/v1/studios/${studioId}/custom-domains/${domainId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        setCustomDomains(customDomains.filter(d => d.id !== domainId))
        setSuccess('Domain removed successfully')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to remove domain')
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 5000)
    }
  }

  const saveTheme = async () => {
    setSaving(true)
    try {
      const token = authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/studios/${studioId}/theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(themeData)
      })

      if (response.ok) {
        const updatedTheme = await response.json()
        setTheme(updatedTheme)
        setSuccess('Theme saved successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to save theme')
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess('Copied to clipboard!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Failed to copy')
      setTimeout(() => setError(null), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <Navigation 
          user={user} 
          onLogin={() => login()} onLogout={() => logout()}
          
        />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  if (error && !studio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <Navigation 
          user={user} 
          onLogin={() => login()} onLogout={() => logout()}
          
        />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">{error}</h2>
            <button
              onClick={() => window.location.href = '/studio'}
              className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
            >
              ← Back to Studios
            </button>
          </div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <Navigation 
        user={user} 
        onLogin={() => login()} onLogout={() => logout()}
        
      />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = '/studio'}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {studio?.name} Settings
          </h1>
          <p className="text-gray-600">Manage your studio's configuration and branding</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              General
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'theme'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Palette className="w-5 h-5" />
              Theme
            </button>
            <button
              onClick={() => setActiveTab('domains')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'domains'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Globe className="w-5 h-5" />
              Custom Domains
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">
                    General studio settings coming soon. For now, you can manage themes and custom domains.
                  </p>
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Theme Customization</h2>
                  <button
                    onClick={saveTheme}
                    disabled={saving}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Theme'
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Colors */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Colors</h3>
                    {Object.entries({
                      primary_color: 'Primary Color',
                      secondary_color: 'Secondary Color',
                      accent_color: 'Accent Color',
                      background_color: 'Background Color',
                      text_color: 'Text Color'
                    }).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {label}
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={themeData[key as keyof typeof themeData]}
                            onChange={(e) => setThemeData({ ...themeData, [key]: e.target.value })}
                            className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={themeData[key as keyof typeof themeData]}
                            onChange={(e) => setThemeData({ ...themeData, [key]: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fonts */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Typography</h3>
                    {Object.entries({
                      heading_font: 'Heading Font',
                      body_font: 'Body Font',
                      code_font: 'Code Font'
                    }).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {label}
                        </label>
                        <select
                          value={themeData[key as keyof typeof themeData]}
                          onChange={(e) => setThemeData({ ...themeData, [key]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="Inter">Inter</option>
                          <option value="System UI">System UI</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Open Sans">Open Sans</option>
                          <option value="Lato">Lato</option>
                          <option value="Montserrat">Montserrat</option>
                          <option value="JetBrains Mono">JetBrains Mono</option>
                          <option value="Fira Code">Fira Code</option>
                          <option value="Source Code Pro">Source Code Pro</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
                  <div 
                    className="p-6 rounded-lg border-2"
                    style={{ 
                      backgroundColor: themeData.background_color,
                      borderColor: themeData.primary_color
                    }}
                  >
                    <h1 
                      className="text-3xl font-bold mb-2"
                      style={{ 
                        color: themeData.primary_color,
                        fontFamily: themeData.heading_font
                      }}
                    >
                      Heading Example
                    </h1>
                    <p 
                      className="mb-4"
                      style={{ 
                        color: themeData.text_color,
                        fontFamily: themeData.body_font
                      }}
                    >
                      This is how your body text will look with the selected theme.
                    </p>
                    <button
                      className="px-4 py-2 rounded-lg text-white"
                      style={{ backgroundColor: themeData.accent_color }}
                    >
                      Accent Button
                    </button>
                    <pre
                      className="mt-4 p-3 rounded"
                      style={{ 
                        backgroundColor: '#1f2937',
                        color: '#e5e7eb',
                        fontFamily: themeData.code_font
                      }}
                    >
                      const example = "Code sample";
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Domains Tab */}
            {activeTab === 'domains' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Custom Domains</h2>
                <p className="text-gray-600">
                  Connect your own domain to your studio for a professional, branded experience.
                </p>

                {/* Add New Domain */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Add Custom Domain</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => {
                        setNewDomain(e.target.value)
                        setDomainError(null)
                      }}
                      placeholder="docs.example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <button
                      onClick={addCustomDomain}
                      className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium whitespace-nowrap"
                    >
                      <Plus className="w-5 h-5" />
                      Add Domain
                    </button>
                  </div>
                  {domainError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-red-800 text-sm">{domainError}</p>
                    </div>
                  )}
                </div>

                {/* Domains List */}
                {customDomains.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg">
                    <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No custom domains configured yet.</p>
                    <p className="text-sm mt-2">Add your first domain to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customDomains.map((domain) => (
                      <div key={domain.id} className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 font-mono">
                                {domain.domain}
                              </h3>
                              {domain.is_verified ? (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                  <CheckCircle className="w-3 h-3 inline mr-1" />
                                  Verified
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                                  <XCircle className="w-3 h-3 inline mr-1" />
                                  Pending Verification
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Added {new Date(domain.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!domain.is_verified && (
                              <button
                                onClick={() => verifyDomain(domain.id)}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                              >
                                Verify Domain
                              </button>
                            )}
                            <button
                              onClick={() => deleteDomain(domain.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Remove domain"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* DNS Records */}
                        {!domain.is_verified && domain.dns_records && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3">
                              DNS Configuration Required
                            </h4>
                            <p className="text-sm text-gray-600 mb-4">
                              Add these DNS records to your domain registrar to verify ownership:
                            </p>
                            <div className="space-y-3">
                              {domain.dns_records.map((record, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">Type:</span>
                                      <p className="font-mono">{record.type}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="font-medium text-gray-700">Name:</span>
                                      <div className="flex items-center gap-2">
                                        <p className="font-mono flex-1 truncate">{record.name}</p>
                                        <button
                                          onClick={() => copyToClipboard(record.name)}
                                          className="p-1 hover:bg-gray-200 rounded"
                                          title="Copy"
                                        >
                                          <Copy className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">TTL:</span>
                                      <p className="font-mono">{record.ttl}</p>
                                    </div>
                                  </div>
                                  <div className="mt-2">
                                    <span className="font-medium text-gray-700">Value:</span>
                                    <div className="flex items-center gap-2">
                                      <p className="font-mono text-xs flex-1 break-all">
                                        {record.value}
                                      </p>
                                      <button
                                        onClick={() => copyToClipboard(record.value)}
                                        className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                                        title="Copy"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Note:</strong> DNS changes can take up to 48 hours to propagate. 
                                Click "Verify Domain" once the records are added.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Verification Status */}
                        {domain.is_verified && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">
                              ✓ Domain verified on {new Date(domain.verified_at!).toLocaleString()}
                            </p>
                            {domain.ssl_enabled && (
                              <p className="text-sm text-green-800 mt-1">
                                ✓ SSL certificate active
                              </p>
                            )}
                          </div>
                        )}

                        {/* Error Message */}
                        {domain.error_message && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{domain.error_message}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">
                    Studio analytics coming soon. You'll be able to track views, engagement, and growth metrics.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
