/**
 * ImmersiveReader - Synchronized ebook + audiobook experience with word highlighting
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { ReactReader } from 'react-reader'
import { 
  X, Play, Pause, Volume2, VolumeX, Settings,
  Sun, Moon, ZoomIn, ZoomOut, BookOpen, Headphones
} from 'lucide-react'

interface ImmersiveReaderProps {
  epubUrl: string
  audioUrl?: string
  bookTitle: string
  author: string
  coverUrl?: string
  onClose: () => void
  onProgressChange?: (location: string, progress: number) => void
  initialLocation?: string
}

export default function ImmersiveReader({
  epubUrl,
  audioUrl,
  bookTitle,
  author,
  coverUrl,
  onClose,
  onProgressChange,
  initialLocation
}: ImmersiveReaderProps) {
  const [location, setLocation] = useState<string>(initialLocation || '')
  const [progress, setProgress] = useState<number>(0)
  const [showSettings, setShowSettings] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light')
  const [mode, setMode] = useState<'read' | 'listen' | 'immersive'>('read')
  const renditionRef = useRef<any>(null)
  
  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  const locationChanged = useCallback((epubcfi: string) => {
    setLocation(epubcfi)
    
    if (renditionRef.current) {
      const currentLocation = renditionRef.current.currentLocation()
      if (currentLocation?.start) {
        const progressPercent = currentLocation.start.percentage * 100
        setProgress(progressPercent)
        
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

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleVolumeChange = (value: number) => {
    setVolume(value)
    if (audioRef.current) {
      audioRef.current.volume = value
    }
    if (value > 0) setIsMuted(false)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-semibold">{bookTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          {audioUrl && (
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setMode('read')}
                className={`px-3 py-1 rounded flex items-center gap-2 text-sm ${
                  mode === 'read' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Read
              </button>
              <button
                onClick={() => setMode('listen')}
                className={`px-3 py-1 rounded flex items-center gap-2 text-sm ${
                  mode === 'listen' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Headphones className="w-4 h-4" />
                Listen
              </button>
              <button
                onClick={() => setMode('immersive')}
                className={`px-3 py-1 rounded flex items-center gap-2 text-sm ${
                  mode === 'immersive' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <Headphones className="w-4 h-4" />
                Both
              </button>
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Ebook Reader (visible in read and immersive modes) */}
        {(mode === 'read' || mode === 'immersive') && (
          <div className={mode === 'immersive' ? 'flex-1' : 'w-full'}>
            <ReactReader
              url={epubUrl}
              location={location}
              locationChanged={locationChanged}
              getRendition={(rendition) => {
                renditionRef.current = rendition
                rendition.themes.fontSize(`${fontSize}%`)
                changeTheme(theme)
              }}
            />
          </div>
        )}

        {/* Audio Player Area (visible in listen and immersive modes) */}
        {audioUrl && (mode === 'listen' || mode === 'immersive') && (
          <div className={`flex flex-col bg-gray-900 ${
            mode === 'immersive' ? 'w-80 border-l border-gray-800' : 'w-full'
          }`}>
            {/* Cover Art */}
            {mode === 'listen' && coverUrl && (
              <div className="flex-1 flex items-center justify-center p-8">
                <img
                  src={coverUrl}
                  alt={bookTitle}
                  className="w-full max-w-md rounded-lg shadow-2xl"
                />
              </div>
            )}

            {/* Audio Controls */}
            <div className="p-6 border-t border-gray-800">
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-1">{bookTitle}</h3>
                <p className="text-gray-400 text-sm">{author}</p>
              </div>

              {/* Play/Pause Button */}
              <button
                onClick={handlePlayPause}
                className="w-full py-3 mb-4 bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center justify-center gap-2 text-white font-semibold transition-colors"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" fill="currentColor" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" fill="currentColor" />
                    Play
                  </>
                )}
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="p-2 hover:bg-gray-800 rounded-lg">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">
            {Math.round(progress)}% complete
          </span>
        </div>

        {(mode === 'read' || mode === 'immersive') && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-gray-800 rounded-lg shadow-xl p-4 w-80 border border-gray-700 z-10">
          <h3 className="text-white font-semibold mb-4">Settings</h3>
          
          {/* Font Size (for reading modes) */}
          {(mode === 'read' || mode === 'immersive') && (
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Font Size</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeFontSize(-10)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                  <ZoomOut className="w-4 h-4 text-white" />
                </button>
                <span className="text-white text-sm flex-1 text-center">{fontSize}%</span>
                <button
                  onClick={() => changeFontSize(10)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Theme (for reading modes) */}
          {(mode === 'read' || mode === 'immersive') && (
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => changeTheme('light')}
                  className={`p-2 rounded-lg flex items-center justify-center gap-2 ${
                    theme === 'light' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => changeTheme('dark')}
                  className={`p-2 rounded-lg flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
                <button
                  onClick={() => changeTheme('sepia')}
                  className={`p-2 rounded-lg flex items-center justify-center gap-2 ${
                    theme === 'sepia' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Sepia
                </button>
              </div>
            </div>
          )}

          {/* Playback Speed (for audio modes) */}
          {audioUrl && (mode === 'listen' || mode === 'immersive') && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Playback Speed</label>
              <div className="grid grid-cols-5 gap-2">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`px-2 py-1 rounded text-sm ${
                      playbackRate === rate
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
