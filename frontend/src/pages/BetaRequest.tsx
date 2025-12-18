import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"
import { Send, FileText, Calendar, Users } from 'lucide-react'
import { toast } from '../services/toast'

export default function BetaRequest() {
  const params = new URLSearchParams(window.location.search)
  const targetUserId = params.get('user_id')
  const { user, login, logout } = useAuth()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    project_title: '',
    word_count: '',
    desired_start: '',
    notes: ''
  })

  useEffect(() => {
    getUser().then(setUser)
  }, [])

  const submit = async () => {
    if (!targetUserId) {
      setMessage('Missing target user')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const token = await authService.getAccessToken()
      const resp = await fetch('/api/v1/beta-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target_user_id: parseInt(targetUserId),
          project_title: form.project_title,
          word_count: form.word_count ? parseInt(form.word_count) : null,
          desired_start: form.desired_start || null,
          notes: form.notes
        })
      })
      if (resp.ok) {
        toast.success('Beta request sent!')
        setMessage('Request sent!')
        setForm({ project_title: '', word_count: '', desired_start: '', notes: '' })
      } else {
        const err = await resp.json().catch(() => ({}))
        const msg = err.detail || 'Failed to send request'
        toast.error(msg)
        setMessage(msg)
      }
    } catch (e) {
      toast.error('Network error sending request')
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Request a Beta Read</h1>
        <div className="space-y-4 bg-card p-6 rounded-lg border border-border">
          <div>
            <label className="block text-foreground font-medium mb-2">Project Title</label>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={form.project_title}
                onChange={(e) => setForm(prev => ({ ...prev, project_title: e.target.value }))}
                className="w-full p-3 rounded-lg bg-muted text-foreground border border-border"
                placeholder="e.g., The Ember Archive — Draft 2"
              />
            </div>
          </div>
          <div>
            <label className="block text-foreground font-medium mb-2">Word Count</label>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                value={form.word_count}
                onChange={(e) => setForm(prev => ({ ...prev, word_count: e.target.value }))}
                className="w-full p-3 rounded-lg bg-muted text-foreground border border-border"
                placeholder="e.g., 85000"
              />
            </div>
          </div>
          <div>
            <label className="block text-foreground font-medium mb-2">Desired Start Date</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={form.desired_start}
                onChange={(e) => setForm(prev => ({ ...prev, desired_start: e.target.value }))}
                className="w-full p-3 rounded-lg bg-muted text-foreground border border-border"
              />
            </div>
          </div>
          <div>
            <label className="block text-foreground font-medium mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-3 rounded-lg bg-muted text-foreground border border-border"
              rows={5}
              placeholder="Share context, expectations, and timeline"
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={saving || !form.project_title.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground flex items-center gap-2">
              <Send className="w-4 h-4" />
              {saving ? 'Sending...' : 'Send Request'}
            </button>
            {message && <span className="text-muted-foreground">{message}</span>}
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
