/**
 * Tag Discovery Page - Browse and explore all content tags
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"
import { Tag, Search, TrendingUp, Hash } from 'lucide-react'
import { toast } from '../services/toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface ContentTag {
  id: number
  name: string
  usage_count: number
  created_at: string
}

export function TagDiscovery() {
  const { user, login, logout } = useAuth()
  const [tags, setTags] = useState<ContentTag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'alphabetical' | 'recent'>('popular')

  useEffect(() => {
    const loadData = async () => {
      await fetchTags()
    }
    loadData()
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
      const response = await fetch(`${API_URL}/api/v1/content-tags/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }

      const data = await response.json()
      setTags(data)
    } catch (error) {
      console.error('Error fetching tags:', error)
      toast.error('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedTags = [...filteredTags].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.usage_count - a.usage_count
      case 'alphabetical':
        return a.name.localeCompare(b.name)
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default:
        return 0
    }
  })

  const getTagSize = (usageCount: number) => {
    const maxUsage = Math.max(...tags.map(t => t.usage_count), 1)
    const minSize = 14
    const maxSize = 48
    const size = minSize + ((usageCount / maxUsage) * (maxSize - minSize))
    return Math.round(size)
  }

  const handleTagClick = (tagName: string) => {
    // Navigate to feed with this tag filter
    window.location.href = `/feed?include_tags=${encodeURIComponent(tagName)}`
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1918' }}>
      <Navigation 
        user={user} 
        onLogin={() => login()} 
        onLogout={() => logout()} 
        currentPage="tags" 
      />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Hash className="w-8 h-8" style={{ color: '#F1EEEB' }} />
            <h1 className="text-3xl font-bold" style={{ color: '#F1EEEB' }}>
              Discover Tags
            </h1>
          </div>
          <p style={{ color: '#B3B2B0' }}>
            Explore all content tags and discover new stories
          </p>
        </div>

        {/* Search and Sort */}
        <div className="bg-[#262422] rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#B3B2B0' }} />
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg"
                style={{
                  backgroundColor: '#1A1918',
                  color: '#F1EEEB',
                  border: '1px solid #3D3A38',
                }}
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor: '#1A1918',
                color: '#F1EEEB',
                border: '1px solid #3D3A38',
              }}
            >
              <option value="popular">Most Popular</option>
              <option value="alphabetical">A-Z</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm" style={{ color: '#B3B2B0' }}>
            <span>Total tags: {tags.length}</span>
            <span>|</span>
            <span>Showing: {sortedTags.length}</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4" style={{ color: '#B3B2B0' }}>Loading tags...</p>
          </div>
        )}

        {/* Tag Cloud View */}
        {!loading && sortedTags.length > 0 && (
          <div className="bg-[#262422] rounded-lg p-8">
            <div className="flex flex-wrap gap-4 justify-center items-center">
              {sortedTags.map(tag => {
                const fontSize = getTagSize(tag.usage_count)
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag.name)}
                    className="px-4 py-2 rounded-full transition-all hover:scale-110"
                    style={{
                      backgroundColor: '#3D3A38',
                      color: '#F1EEEB',
                      fontSize: `${fontSize}px`,
                      fontWeight: fontSize > 30 ? 'bold' : 'normal',
                    }}
                    title={`${tag.usage_count} posts`}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {!loading && sortedTags.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#F1EEEB' }}>
              All Tags
            </h2>
            <div className="bg-[#262422] rounded-lg divide-y divide-[#3D3A38]">
              {sortedTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.name)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#3D3A38] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5" style={{ color: '#B3B2B0' }} />
                    <span className="font-medium" style={{ color: '#F1EEEB' }}>
                      {tag.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm" style={{ color: '#B3B2B0' }}>
                      {tag.usage_count} {tag.usage_count === 1 ? 'post' : 'posts'}
                    </span>
                    <TrendingUp className="w-4 h-4" style={{ color: '#B3B2B0' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedTags.length === 0 && (
          <div className="text-center py-12">
            <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: '#B3B2B0' }} />
            <p className="text-lg mb-2" style={{ color: '#F1EEEB' }}>
              {searchQuery ? 'No tags found' : 'No tags yet'}
            </p>
            <p style={{ color: '#B3B2B0' }}>
              {searchQuery ? 'Try a different search term' : 'Tags will appear here as content is created'}
            </p>
          </div>
        )}
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
