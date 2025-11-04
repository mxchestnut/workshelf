import { 
  FolderOpen, 
  Users, 
  FileText, 
  Clock,
  MoreVertical,
  Briefcase,
  CheckCircle2
} from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string
  documents: number
  collaborators: number
  lastActivity: string
  progress: number
  color: string
}

export function Projects() {
  const projects: Project[] = [
    { 
      id: '1', 
      name: 'The Wandering Moon Series', 
      description: 'Epic fantasy trilogy following a young mage\'s journey',
      documents: 24, 
      collaborators: 5, 
      lastActivity: '2 hours ago',
      progress: 65,
      color: 'bg-blue-500'
    },
    { 
      id: '2', 
      name: 'Short Story Collection', 
      description: 'Anthology of speculative fiction stories',
      documents: 12, 
      collaborators: 2, 
      lastActivity: '1 day ago',
      progress: 45,
      color: 'bg-purple-500'
    },
    { 
      id: '3', 
      name: 'Writing Workshop Materials', 
      description: 'Guides and exercises for creative writing students',
      documents: 18, 
      collaborators: 8, 
      lastActivity: '3 days ago',
      progress: 80,
      color: 'bg-green-500'
    },
    { 
      id: '4', 
      name: 'Poetry Anthology', 
      description: 'Collection of contemporary poetry',
      documents: 6, 
      collaborators: 1, 
      lastActivity: '1 week ago',
      progress: 30,
      color: 'bg-pink-500'
    },
  ]

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-80">Active</span>
          </div>
          <div className="text-3xl font-bold mb-1">{projects.length}</div>
          <div className="text-sm opacity-90">Projects</div>
        </div>

        <div className="bg-white border border-neutral-light p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-sm text-neutral">Total</span>
          </div>
          <div className="text-3xl font-bold text-neutral-darkest mb-1">60</div>
          <div className="text-sm text-neutral">Documents</div>
        </div>

        <div className="bg-white border border-neutral-light p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <span className="text-sm text-neutral">Average</span>
          </div>
          <div className="text-3xl font-bold text-neutral-darkest mb-1">55%</div>
          <div className="text-sm text-neutral">Complete</div>
        </div>
      </div>

      <div className="bg-white border border-neutral-light rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-light">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-darkest">Your Projects</h2>
            <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium">
              New Project
            </button>
          </div>
        </div>

        <div className="divide-y divide-neutral-light">
          {projects.map((project) => (
            <div key={project.id} className="px-6 py-4 hover:bg-neutral-light/30 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 ${project.color} rounded-lg flex items-center justify-center`}>
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-darkest mb-1">{project.name}</h3>
                    <p className="text-sm text-neutral mb-3">{project.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-neutral mb-3">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {project.documents} documents
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.collaborators} collaborators
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {project.lastActivity}
                      </span>
                    </div>

                    <div className="w-full bg-neutral-light rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-neutral mt-1">{project.progress}% complete</div>
                  </div>
                </div>

                <button className="p-2 hover:bg-neutral-light rounded-lg">
                  <MoreVertical className="w-5 h-5 text-neutral" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
