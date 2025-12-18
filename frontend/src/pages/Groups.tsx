/**
 * Groups Dashboard
 * View all group activity and start new groups
 */
import { useState, useEffect } from 'react'
import { Users, Plus, TrendingUp, MessageSquare } from 'lucide-react'
import { Navigation } from '../components/Navigation'
import PageVersion from '../components/PageVersion'
import { useAuth } from "../contexts/AuthContext"

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface Group {
  id: number
  name: string
  slug: string
  description: string
  is_public: boolean
  is_active: boolean
  avatar_url: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  member_count?: number
  post_count?: number
}

export default function Groups() {
  const { user, login, logout } = useAuth()
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [discoveredGroups, setDiscoveredGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupPrivacyLevel, setNewGroupPrivacyLevel] = useState('guarded')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadUser()
    loadGroups()
  }, [])

  const loadUser = async () => {
    if (user) {
    }
  }

  const loadGroups = async () => {
    try {
      const token = localStorage.getItem('access_token')
      
      // Load user's groups
      const myResponse = await fetch(`${API_URL}/api/v1/groups/my-groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (myResponse.ok) {
        const data = await myResponse.json()
        setMyGroups(data)
      }

      // Load all public groups (for discovery)
      const discoverResponse = await fetch(`${API_URL}/api/v1/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (discoverResponse.ok) {
        const data = await discoverResponse.json()
        setDiscoveredGroups(data)
      }
    } catch (error) {
      console.error('Failed to load groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
          privacy_level: newGroupPrivacyLevel,
          is_public: newGroupPrivacyLevel === 'public'
        })
      })

      if (response.ok) {
        const created = await response.json()
        alert('Group created successfully!')
        setShowCreateModal(false)
        setNewGroupName('')
        setNewGroupDescription('')
        setNewGroupPrivacyLevel('guarded')
        setNewGroupDescription('')
        // Refresh user data to update navigation
        const updatedUser = await authService.fetchUserInfo()
        // Refresh lists
        loadGroups()
        // Optionally navigate to the new group
        window.location.href = `/groups/${created.slug}`
      } else {
        const errText = await response.text()
        alert(`Failed to create group: ${errText || response.status}`)
      }
    } catch (error) {
  console.error('Failed to create group:', error)
  alert('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        user={user} 
        onLogin={() => login()} onLogout={() => logout()}
       
        currentPage="groups"
      />

      {/* Main content with left margin for sidebar */}
      <div className="ml-0 md:ml-80 transition-all duration-300">
        <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Groups</h1>
              <p className="text-muted-foreground">Connect with writers, beta readers, and book lovers</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-primary text-primary-foreground transition-colors hover:opacity-90"
            >
              <Plus className="w-5 h-5" />
              Start a Group
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading groups...</p>
          </div>
        ) : (
          <>
            {/* My Groups */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-foreground" />
                My Groups
              </h2>

              {myGroups.length === 0 ? (
                <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'hsl(var(--muted))' }}>
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">You haven't joined any groups yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Start Your First Group
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myGroups.map(group => (
                    <a
                      key={group.id}
                      href={`/groups/${group.slug}`}
                      className="rounded-lg p-6 transition-all hover:shadow-lg border border-border"
                      style={{ backgroundColor: 'hsl(var(--muted))' }}
                    >
                      <h3 className="text-xl font-bold text-foreground mb-2">{group.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{group.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{group.member_count || 0} members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>{group.post_count || 0} posts</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Discover Groups */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-foreground" />
                Discover Groups
              </h2>

              {discoveredGroups.length === 0 ? (
                <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'hsl(var(--muted))' }}>
                  <p className="text-muted-foreground">No groups to discover yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {discoveredGroups.map(group => (
                    <a
                      key={group.id}
                      href={`/groups/${group.slug}`}
                      className="rounded-lg p-6 transition-all hover:shadow-lg border border-border"
                      style={{ backgroundColor: 'hsl(var(--muted))' }}
                    >
                      <h3 className="text-xl font-bold text-foreground mb-2">{group.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{group.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.member_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{group.post_count || 0}</span>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">
                          {group.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Create Group Modal */}
  {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full border border-border">
            <div className="sticky top-0 bg-muted text-foreground px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold">Start a New Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Fantasy Writers Guild"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What is your group about? Who should join?"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background text-foreground"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Privacy Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={newGroupPrivacyLevel}
                  onChange={(e) => setNewGroupPrivacyLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  required
                >
                  <option value="public">🌍 Public - Anyone can see and join (even not logged in)</option>
                  <option value="guarded">🔐 Guarded - Only logged-in users can see and join (default)</option>
                  <option value="private">🔒 Private - Only members can see posts/members (name searchable)</option>
                  <option value="secret">🔑 Secret - Not searchable, invitation only</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Choose who can discover and access your group. "Guarded" is recommended for most groups.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-border rounded-lg font-semibold bg-muted text-foreground hover:opacity-90 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Page Version */}
        <PageVersion path="/groups" />
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
