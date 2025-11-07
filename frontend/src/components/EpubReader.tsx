import { useState, useRef, useCallback } from 'react'
import { ReactReader } from 'react-reader'
import { 
  X, ChevronLeft, ChevronRight, Settings, 
  Sun, Moon, ZoomIn, ZoomOut
} from 'lucide-react'

interface EpubReaderProps {
  epubUrl: string
  bookTitle: string
  onClose: () => void
  onProgressChange?: (location: string, progress: number) => void
  initialLocation?: string
}

export default function EpubReader({ 
  epubUrl, 
  bookTitle, 
  onClose,
  onProgressChange,
  initialLocation 
}: EpubReaderProps) {
  const [location, setLocation] = useState<string>(initialLocation || '')
  const [progress, setProgress] = useState<number>(0)
  const [showSettings, setShowSettings] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light')
  const renditionRef = useRef<any>(null)

  const locationChanged = useCallback((epubcfi: string) => {
    setLocation(epubcfi)
    
    // Calculate progress
    if (renditionRef.current) {
      const currentLocation = renditionRef.current.currentLocation()
      if (currentLocation?.start) {
        const progressPercent = currentLocation.start.percentage * 100
        setProgress(progressPercent)
        
        // Save progress to backend
        if (onProgressChange) {
          onProgressChange(epubcfi, progressPercent)
        }
      }
    }
  }, [onProgressChange])

  const handleNext = () => {
    if (renditionRef.current) {
      renditionRef.current.next()
    }
  }

  const handlePrev = () => {
    if (renditionRef.current) {
      renditionRef.current.prev()
    }
  }

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(80, Math.min(150, fontSize + delta))
    setFontSize(newSize)
    
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`)
    }
  }

  const changeTheme = (newTheme: 'light' | 'dark' | 'sepia') => {
    setTheme(newTheme)
    
    if (renditionRef.current) {
      const themes = {
        light: {
          body: { background: '#ffffff', color: '#000000' }
        },
        dark: {
          body: { background: '#1a1a1a', color: '#e0e0e0' }
        },
        sepia: {
          body: { background: '#f4ecd8', color: '#5c4b37' }
        }
      }
      
      renditionRef.current.themes.register(newTheme, themes[newTheme])
      renditionRef.current.themes.select(newTheme)
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-white font-semibold">{bookTitle}</h1>
            <p className="text-gray-400 text-sm">{Math.round(progress)}% complete</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Font Size Controls */}
          <button
            onClick={() => changeFontSize(-10)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Decrease font size"
          >
            <ZoomOut className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => changeFontSize(10)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Increase font size"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              const themes: ('light' | 'dark' | 'sepia')[] = ['light', 'dark', 'sepia']
              const currentIndex = themes.indexOf(theme)
              const nextTheme = themes[(currentIndex + 1) % themes.length]
              changeTheme(nextTheme)
            }}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Change theme"
          >
            {theme === 'light' ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : theme === 'dark' ? (
              <Moon className="w-5 h-5 text-blue-400" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-600" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-800 h-1">
        <div
          className="bg-purple-500 h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Reader Container */}
      <div className="flex-1 relative">
        <ReactReader
          url={epubUrl}
          location={location}
          locationChanged={locationChanged}
          getRendition={(rendition) => {
            renditionRef.current = rendition
            
            // Apply initial theme
            rendition.themes.register('light', {
              body: { background: '#ffffff', color: '#000000' }
            })
            rendition.themes.register('dark', {
              body: { background: '#1a1a1a', color: '#e0e0e0' }
            })
            rendition.themes.register('sepia', {
              body: { background: '#f4ecd8', color: '#5c4b37' }
            })
            rendition.themes.select(theme)
            rendition.themes.fontSize(`${fontSize}%`)
          }}
        />

        {/* Navigation Buttons */}
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur-sm"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur-sm"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 p-4 w-80 z-10">
          <h3 className="text-white font-semibold mb-4">Reader Settings</h3>
          
          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="text-gray-300 text-sm block mb-2">
                Font Size: {fontSize}%
              </label>
              <input
                type="range"
                min="80"
                max="150"
                value={fontSize}
                onChange={(e) => changeFontSize(parseInt(e.target.value) - fontSize)}
                className="w-full"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="text-gray-300 text-sm block mb-2">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => changeTheme('light')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-purple-500 bg-white'
                      : 'border-gray-700 bg-white hover:border-gray-600'
                  }`}
                >
                  <Sun className="w-5 h-5 mx-auto text-gray-900" />
                  <span className="text-xs text-gray-900 mt-1 block">Light</span>
                </button>
                <button
                  onClick={() => changeTheme('dark')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-purple-500 bg-gray-900'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <Moon className="w-5 h-5 mx-auto text-blue-400" />
                  <span className="text-xs text-gray-300 mt-1 block">Dark</span>
                </button>
                <button
                  onClick={() => changeTheme('sepia')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    theme === 'sepia'
                      ? 'border-purple-500 bg-amber-50'
                      : 'border-gray-700 bg-amber-50 hover:border-gray-600'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-amber-600" />
                  <span className="text-xs text-amber-900 mt-1 block">Sepia</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-gray-300 text-sm">
        Use ← → arrow keys or click sides to navigate
      </div>
    </div>
  )
}
