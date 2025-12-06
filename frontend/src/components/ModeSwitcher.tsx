/**
 * ModeSwitcher Component - 4-mode document workflow
 * Modes: Alpha (Draft Room), Beta (Workshop), Publish (Print Queue), Read (Bookshelf)
 */

import { FileEdit, MessageSquare, Printer, BookOpen } from 'lucide-react'

export type DocumentMode = 'alpha' | 'beta' | 'publish' | 'read'

interface ModeSwitcherProps {
  currentMode: DocumentMode
  onChange: (mode: DocumentMode) => void
  disabled?: boolean
}

interface ModeConfig {
  value: DocumentMode
  label: string
  icon: React.ReactNode
  description: string
  color: string
  bgColor: string
  borderColor: string
  hoverBg: string
}

const modes: ModeConfig[] = [
  {
    value: 'alpha',
    label: 'Alpha',
    icon: <FileEdit className="w-4 h-4" />,
    description: 'Draft Room - Collaborative drafting',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    hoverBg: 'hover:bg-blue-100'
  },
  {
    value: 'beta',
    label: 'Beta',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'Workshop - Structured feedback',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    hoverBg: 'hover:bg-purple-100'
  },
  {
    value: 'publish',
    label: 'Publish',
    icon: <Printer className="w-4 h-4" />,
    description: 'Print Queue - Finalization',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    hoverBg: 'hover:bg-green-100'
  },
  {
    value: 'read',
    label: 'Read',
    icon: <BookOpen className="w-4 h-4" />,
    description: 'Bookshelf - Public viewing',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    hoverBg: 'hover:bg-amber-100'
  }
]

export function ModeSwitcher({ currentMode, onChange, disabled = false }: ModeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-neutral-lightest rounded-lg border border-neutral-light">
      {modes.map((mode) => {
        const isActive = currentMode === mode.value
        return (
          <button
            key={mode.value}
            onClick={() => !disabled && onChange(mode.value)}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md transition-all
              text-sm font-medium
              ${isActive 
                ? `${mode.bgColor} ${mode.color} ${mode.borderColor} border` 
                : `text-neutral hover:bg-neutral-light ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
              }
              ${!isActive && !disabled ? mode.hoverBg : ''}
            `}
            title={mode.description}
            aria-label={`${mode.label} mode: ${mode.description}`}
            aria-pressed={isActive}
          >
            {mode.icon}
            <span>{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
