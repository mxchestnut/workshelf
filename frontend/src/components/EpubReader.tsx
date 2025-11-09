import { useState, useRef, useCallback, useEffect } from 'react'
import { ReactReader } from 'react-reader'
import { 
  X, ChevronLeft, ChevronRight, Settings, 
  Sun, Moon, ZoomIn, ZoomOut, Volume2, VolumeX, Pause, Play
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
  
  // Text-to-Speech state
  const [isReading, setIsReading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [readingSpeed, setReadingSpeed] = useState(1.0)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
      // Select first English voice by default
      const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0]
      setSelectedVoice(englishVoice)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

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

  // Text-to-Speech functions
  const extractTextFromPage = (): string => {
    if (!renditionRef.current) return ''
    
    try {
      const iframe = document.querySelector('iframe')
      if (!iframe?.contentDocument) return ''
      
      const body = iframe.contentDocument.body
      return body.innerText || body.textContent || ''
    } catch (error) {
      console.error('Error extracting text:', error)
      return ''
    }
  }

  const startReading = () => {
    const text = extractTextFromPage()
    if (!text) {
      alert('No text found on this page')
      return
    }

    // Cancel any existing speech
    window.speechSynthesis.cancel()

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = readingSpeed
    utterance.pitch = 1
    utterance.volume = 1
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onend = () => {
      setIsReading(false)
      setIsPaused(false)
    }

    utterance.onerror = (error) => {
      console.error('Speech error:', error)
      setIsReading(false)
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsReading(true)
    setIsPaused(false)
  }

  const toggleReading = () => {
    if (!isReading) {
      startReading()
    } else if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  const stopReading = () => {
    window.speechSynthesis.cancel()
    setIsReading(false)
    setIsPaused(false)
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
          {/* Read Aloud Controls */}
          {!isReading ? (
            <button
              onClick={toggleReading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white font-medium"
              title="Read aloud"
            >
              <Volume2 className="w-5 h-5" />
              <span className="hidden sm:inline">Read Aloud</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleReading}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                title={isPaused ? "Resume reading" : "Pause reading"}
              >
                {isPaused ? (
                  <Play className="w-5 h-5 text-white" />
                ) : (
                  <Pause className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={stopReading}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                title="Stop reading"
              >
                <VolumeX className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

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
        <div className="absolute top-16 right-4 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 p-4 w-80 z-10 max-h-[80vh] overflow-y-auto">
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

            {/* Text-to-Speech Settings */}
            <div className="pt-4 border-t border-gray-700">
              <h4 className="text-gray-300 text-sm font-semibold mb-3">Read Aloud Settings</h4>
              
              {/* Reading Speed */}
              <div className="mb-4">
                <label className="text-gray-300 text-sm block mb-2">
                  Reading Speed: {readingSpeed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={readingSpeed}
                  onChange={(e) => setReadingSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="text-gray-300 text-sm block mb-2">Voice</label>
                <select
                  value={selectedVoice?.name || ''}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.name === e.target.value)
                    setSelectedVoice(voice || null)
                  }}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                >
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Voice quality depends on your device. iOS/Mac have the best voices.
                </p>
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
