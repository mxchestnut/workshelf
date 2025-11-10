/**
 * Writing Prompts Sidebar - Context-aware writing assistance
 * Provides prompts, templates, and AI suggestions based on content type
 */

import { useState } from 'react'
import { 
  Sparkles, 
  Zap,
  X,
  ChevronRight,
  Lightbulb
} from 'lucide-react'

interface Prompt {
  id: string
  category: string
  title: string
  description: string
  questions: string[]
}

const WRITING_PROMPTS: Prompt[] = [
  {
    id: 'character',
    category: 'Character Development',
    title: 'Build Your Character',
    description: 'Create depth and authenticity',
    questions: [
      'What does your character want more than anything?',
      'What is their greatest fear?',
      'What would they never compromise on?',
      'How do they react under pressure?',
      'What\'s a secret they\'ve never told anyone?',
      'What motivates them to get up every morning?'
    ]
  },
  {
    id: 'scene',
    category: 'Scene Crafting',
    title: 'Scene Structure',
    description: 'Build compelling scenes',
    questions: [
      'What is the goal of this scene?',
      'What conflict or tension exists?',
      'How does the character change by the end?',
      'What sensory details bring it to life?',
      'What subtext is happening beneath the dialogue?',
      'How does this scene advance the plot?'
    ]
  },
  {
    id: 'worldbuilding',
    category: 'World Building',
    title: 'Craft Your World',
    description: 'Create immersive settings',
    questions: [
      'What makes this world unique?',
      'What are the social norms and taboos?',
      'How does magic/technology work here?',
      'What conflicts shape this society?',
      'What do people believe in?',
      'How does geography affect culture?'
    ]
  },
  {
    id: 'plot',
    category: 'Plot Development',
    title: 'Structure Your Story',
    description: 'Build narrative momentum',
    questions: [
      'What is the inciting incident?',
      'What obstacles stand in the way?',
      'What is at stake if they fail?',
      'What is the point of no return?',
      'How do complications escalate?',
      'What is the resolution?'
    ]
  },
  {
    id: 'dialogue',
    category: 'Dialogue',
    title: 'Write Authentic Dialogue',
    description: 'Make characters speak naturally',
    questions: [
      'What does each character want from this conversation?',
      'What are they not saying?',
      'How does their background affect their speech?',
      'What do they avoid talking about?',
      'How do they express emotion through words?',
      'What makes their voice unique?'
    ]
  },
  {
    id: 'revision',
    category: 'Revision',
    title: 'Strengthen Your Draft',
    description: 'Polish and improve',
    questions: [
      'Is every scene necessary?',
      'Where does the pacing lag?',
      'Are character motivations clear?',
      'Which descriptions could be sharper?',
      'Where can you show instead of tell?',
      'What themes emerge naturally?'
    ]
  }
]

interface WritingPromptsSidebarProps {
  isOpen: boolean
  onClose: () => void
  onInsertText?: (text: string) => void
}

export function WritingPromptsSidebar({ isOpen, onClose, onInsertText }: WritingPromptsSidebarProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)

  if (!isOpen) return null

  const insertPrompt = (question: string) => {
    if (onInsertText) {
      onInsertText(`\n\n**${question}**\n\n`)
    }
  }

  return (
    <div 
      className="fixed right-0 top-0 h-full w-96 shadow-2xl z-50 overflow-y-auto"
      style={{ backgroundColor: '#37322E' }}
    >
      {/* Header */}
      <div 
        className="sticky top-0 border-b p-4 flex items-center justify-between"
        style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: '#B34B0C' }} />
          <h2 className="font-bold text-white">Writing Prompts</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-opacity-20 text-white"
          style={{ backgroundColor: 'rgba(179, 75, 12, 0.1)' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {!selectedPrompt ? (
          // Category List
          <>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>
              Choose a category to get started with writing prompts and exercises
            </p>

            <div className="space-y-2">
              {WRITING_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => setSelectedPrompt(prompt)}
                  className="w-full p-4 rounded-lg border-2 text-left transition-all hover:border-[#B34B0C]"
                  style={{ 
                    backgroundColor: '#524944',
                    borderColor: '#6C6A68'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#B34B0C' }}>
                      {prompt.category}
                    </span>
                    <ChevronRight className="w-4 h-4" style={{ color: '#B3B2B0' }} />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{prompt.title}</h3>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>
                    {prompt.description}
                  </p>
                </button>
              ))}
            </div>
          </>
        ) : (
          // Prompt Detail
          <>
            <button
              onClick={() => setSelectedPrompt(null)}
              className="flex items-center gap-2 text-sm hover:opacity-80"
              style={{ color: '#B34B0C' }}
            >
              ← Back to prompts
            </button>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#B34B0C' }}>
                {selectedPrompt.category}
              </span>
              <h3 className="text-xl font-bold text-white mt-1 mb-2">{selectedPrompt.title}</h3>
              <p className="text-sm mb-6" style={{ color: '#B3B2B0' }}>
                {selectedPrompt.description}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5" style={{ color: '#B34B0C' }} />
                <h4 className="font-semibold text-white">Questions to Explore</h4>
              </div>

              {selectedPrompt.questions.map((question, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border-2"
                  style={{ 
                    backgroundColor: '#524944',
                    borderColor: '#6C6A68'
                  }}
                >
                  <p className="text-white mb-2">{question}</p>
                  <button
                    onClick={() => insertPrompt(question)}
                    className="text-sm px-3 py-1 rounded hover:bg-opacity-80 transition-colors"
                    style={{ backgroundColor: '#B34B0C', color: 'white' }}
                  >
                    Insert into document
                  </button>
                </div>
              ))}
            </div>

            <div 
              className="mt-6 p-4 rounded-lg"
              style={{ backgroundColor: '#524944' }}
            >
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B34B0C' }} />
                <div>
                  <h4 className="font-semibold text-white mb-1">Pro Tip</h4>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>
                    Use these prompts as jumping-off points. Let your answers guide your writing, 
                    but don't feel constrained by them. The best stories often surprise their writers.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
