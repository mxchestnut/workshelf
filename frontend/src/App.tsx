import { useState, useEffect } from 'react'
import { 
  BookOpen, 
  FileText, 
  Users, 
  FolderOpen, 
  Bell, 
  Settings,
  Search,
  Plus,
  TrendingUp,
  Star,
  Clock,
  MoreVertical,
  Menu,
  X
} from 'lucide-react'
import './App.css'

interface HealthStatus {
  status: string
  version: string
  service: string
}

interface Document {
  id: string
  title: string
  type: string
  updatedAt: string
  collaborators: number
  status: 'draft' | 'review' | 'published'
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [activeTab, setActiveTab] = useState('documents')
  const [menuOpen, setMenuOpen] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => {})
  }, [API_URL])

  const recentDocuments: Document[] = [
    { id: '1', title: 'The Wandering Moon', type: 'Novel', updatedAt: '2 hours ago', collaborators: 3, status: 'draft' },
    { id: '2', title: 'Character Development Guide', type: 'Notes', updatedAt: '1 day ago', collaborators: 1, status: 'draft' },
    { id: '3', title: 'Chapter 5: The Storm', type: 'Novel', updatedAt: '3 days ago', collaborators: 5, status: 'review' },
    { id: '4', title: 'World Building Notes', type: 'Notes', updatedAt: '1 week ago', collaborators: 2, status: 'draft' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-neutral-light text-neutral-darkest'
      case 'review': return 'bg-primary/20 text-primary-dark'
      case 'published': return 'bg-green-100 text-green-800'
      default: return 'bg-neutral-light'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-light bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-neutral-dark hover:bg-neutral-light/50 rounded-lg transition-colors"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <div className="flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold text-neutral-darkest">Work Shelf</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="pl-10 pr-4 py-2 border border-neutral-light rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <button className="relative p-2 text-neutral-dark hover:bg-neutral-light/50 rounded-lg">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              </button>
              
              <button className="p-2 text-neutral-dark hover:bg-neutral-light/50 rounded-lg hidden md:block">
                <Settings className="w-5 h-5" />
              </button>
              
              <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">New Document</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-primary" />
              <h2 className="text-xl font-bold text-neutral-darkest">Work Shelf</h2>
            </div>
            <button 
              onClick={() => setMenuOpen(false)}
              className="p-2 text-neutral-dark hover:bg-neutral-light/50 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => { setActiveTab('documents'); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'documents' 
                  ? 'bg-primary text-white' 
                  : 'text-neutral-dark hover:bg-neutral-light/50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Documents</span>
            </button>
            
            <button 
              onClick={() => { setActiveTab('projects'); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'projects' 
                  ? 'bg-primary text-white' 
                  : 'text-neutral-dark hover:bg-neutral-light/50'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span className="font-medium">Projects</span>
            </button>
            
            <button 
              onClick={() => { setActiveTab('community'); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'community' 
                  ? 'bg-primary text-white' 
                  : 'text-neutral-dark hover:bg-neutral-light/50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Community</span>
            </button>

            <div className="pt-6 mt-6 border-t border-neutral-light">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-dark hover:bg-neutral-light/50 transition-colors">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <span className="text-sm opacity-80">This Month</span>
            </div>
            <div className="text-3xl font-bold mb-1">24</div>
            <div className="text-sm opacity-90">Documents Created</div>
          </div>

          <div className="bg-white border border-neutral-light p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-primary" />
              <span className="text-sm text-neutral">Active</span>
            </div>
            <div className="text-3xl font-bold text-neutral-darkest mb-1">12</div>
            <div className="text-sm text-neutral">Collaborators</div>
          </div>

          <div className="bg-white border border-neutral-light p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-primary" />
              <span className="text-sm text-neutral">Total</span>
            </div>
            <div className="text-3xl font-bold text-neutral-darkest mb-1">156</div>
            <div className="text-sm text-neutral">Pages Written</div>
          </div>
        </div>

        <div className="bg-white border border-neutral-light rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-light">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-darkest">Recent Documents</h2>
              <button className="text-primary hover:text-primary-dark text-sm font-medium">
                View All
              </button>
            </div>
          </div>

          <div className="divide-y divide-neutral-light">
            {recentDocuments.map((doc) => (
              <div key={doc.id} className="px-6 py-4 hover:bg-neutral-light/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-darkest mb-1">{doc.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-neutral">
                        <span>{doc.type}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {doc.updatedAt}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {doc.collaborators}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                    <button className="p-2 hover:bg-neutral-light rounded-lg">
                      <MoreVertical className="w-5 h-5 text-neutral" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {health && (
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral">
              Connected to {health.service} v{health.version} • Status: {health.status}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
