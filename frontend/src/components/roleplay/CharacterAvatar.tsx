import { User } from 'lucide-react'

interface CharacterAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showName?: boolean
  species?: string | null
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
}

export function CharacterAvatar({ 
  name, 
  avatarUrl, 
  size = 'md', 
  showName = false,
  species,
  className = ''
}: CharacterAvatarProps) {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Generate consistent color based on name
  const colorClasses = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-teal-500',
    'bg-cyan-500'
  ]
  
  const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colorClass = colorClasses[nameHash % colorClasses.length]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative group">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200 dark:border-gray-700`}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold border-2 border-white dark:border-gray-800`}
          >
            {initials || <User className="w-1/2 h-1/2" />}
          </div>
        )}
        
        {/* Hover tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-lg">
          {name}
          {species && <span className="text-gray-300"> ({species})</span>}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      </div>
      
      {showName && (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {name}
          </span>
          {species && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {species}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
