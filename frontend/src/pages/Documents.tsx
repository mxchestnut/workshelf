import { 
  FileText, 
  Clock, 
  Users, 
  MoreVertical,
  TrendingUp,
  Star
} from 'lucide-react'

interface Document {
  id: string
  title: string
  type: string
  updatedAt: string
  collaborators: number
  status: 'draft' | 'review' | 'published'
}

export function Documents() {
  const recentDocuments: Document[] = [
    { id: '1', title: 'The Wandering Moon', type: 'Novel', updatedAt: '2 hours ago', collaborators: 3, status: 'draft' },
    { id: '2', title: 'Character Development Guide', type: 'Notes', updatedAt: '1 day ago', collaborators: 1, status: 'draft' },
    { id: '3', title: 'Chapter 5: The Storm', type: 'Novel', updatedAt: '3 days ago', collaborators: 5, status: 'review' },
    { id: '4', title: 'World Building Notes', type: 'Notes', updatedAt: '1 week ago', collaborators: 2, status: 'draft' },
    { id: '5', title: 'Poetry Collection 2025', type: 'Poetry', updatedAt: '2 weeks ago', collaborators: 1, status: 'published' },
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
    <div>
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
    </div>
  )
}
