/**
 * AudioPlayer - Comprehensive audiobook player with chapters, playback controls, and sleep timer
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Settings, Clock, List
} from 'lucide-react'

interface Chapter {
  title: string
  start_time: number // seconds
  duration: number // seconds
}

interface AudioPlayerProps {
  audioUrl: string
  bookTitle: string
  author: string
  coverUrl?: string
  duration: number // total duration in seconds
  chapters?: Chapter[]
  onClose: () => void
  onProgressChange?: (progress: number, currentTime: number) => void
  initialProgress?: number // 0-100
}

export default function AudioPlayer({
  audioUrl,
  bookTitle,
  author,
  coverUrl,
  duration,
  chapters = [],
  onClose,
  onProgressChange,
  initialProgress = 0
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState((initialProgress / 100) * duration)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [sleepTimer, setSleepTimer] = useState<number | null>(null)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null)

  // Initialize audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime
      audioRef.current.volume = volume
      audioRef.current.playbackRate = playbackRate
    }
  }, [])

  // Update current time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (onProgressChange) {
        const progress = (audio.currentTime / duration) * 100
        onProgressChange(progress, audio.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [duration, onProgressChange])

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimer && isPlaying) {
      const endTime = Date.now() + sleepTimer * 60 * 1000
      
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
        setSleepTimerRemaining(remaining)
        
        if (remaining === 0) {
          handlePause()
          setSleepTimer(null)
          setSleepTimerRemaining(null)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [sleepTimer, isPlaying])

  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleSeek = (value: number) => {
    const newTime = (value / 100) * duration
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const handleSkipBack = () => {
    const newTime = Math.max(0, currentTime - 15)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const handleSkipForward = () => {
    const newTime = Math.min(duration, currentTime + 30)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
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

  const jumpToChapter = (startTime: number) => {
    setCurrentTime(startTime)
    if (audioRef.current) {
      audioRef.current.currentTime = startTime
    }
    setShowChapters(false)
  }

  const setSleepTimerMinutes = (minutes: number) => {
    setSleepTimer(minutes)
    setShowSettings(false)
  }

  const getCurrentChapter = () => {
    if (chapters.length === 0) return null
    return chapters.findIndex(
      (ch, idx) => 
        currentTime >= ch.start_time && 
        (idx === chapters.length - 1 || currentTime < chapters[idx + 1].start_time)
    )
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = (currentTime / duration) * 100
  const currentChapterIndex = getCurrentChapter()

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black z-50 flex flex-col">
      <audio ref={audioRef} src={audioUrl} />

      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChapters(!showChapters)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <List className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Cover Art */}
        {coverUrl && (
          <div className="mb-8 rounded-lg overflow-hidden shadow-2xl">
            <img
              src={coverUrl}
              alt={bookTitle}
              className="w-64 h-64 md:w-80 md:h-80 object-cover"
            />
          </div>
        )}

        {/* Book Info */}
        <div className="text-center mb-8 max-w-md">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{bookTitle}</h1>
          <p className="text-gray-400 text-lg">{author}</p>
          {currentChapterIndex !== null && currentChapterIndex >= 0 && chapters[currentChapterIndex] && (
            <p className="text-orange-400 text-sm mt-2">
              Chapter {currentChapterIndex + 1}: {chapters[currentChapterIndex].title}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-2xl mb-6">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-6 mb-6">
          <button
            onClick={handleSkipBack}
            className="p-3 hover:bg-gray-800 rounded-full transition-colors"
          >
            <SkipBack className="w-6 h-6 text-white" fill="currentColor" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-6 bg-orange-600 hover:bg-orange-700 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" fill="currentColor" />
            ) : (
              <Play className="w-8 h-8 text-white" fill="currentColor" />
            )}
          </button>

          <button
            onClick={handleSkipForward}
            className="p-3 hover:bg-gray-800 rounded-full transition-colors"
          >
            <SkipForward className="w-6 h-6 text-white" fill="currentColor" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-4 max-w-xs">
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

        {/* Sleep Timer Display */}
        {sleepTimerRemaining !== null && (
          <div className="mt-6 px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Sleep timer: {Math.floor(sleepTimerRemaining / 60)}:{(sleepTimerRemaining % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-gray-800 rounded-lg shadow-xl p-4 w-64 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">Playback Settings</h3>
          
          <div className="mb-4">
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

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Sleep Timer</label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSleepTimerMinutes(mins)}
                  className="px-2 py-1 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  {mins}m
                </button>
              ))}
            </div>
            {sleepTimer && (
              <button
                onClick={() => {
                  setSleepTimer(null)
                  setSleepTimerRemaining(null)
                }}
                className="mt-2 w-full px-2 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700"
              >
                Cancel Timer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chapters Panel */}
      {showChapters && chapters.length > 0 && (
        <div className="absolute top-16 left-4 right-4 md:left-auto md:w-96 bg-gray-800 rounded-lg shadow-xl border border-gray-700 max-h-[60vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Chapters</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {chapters.map((chapter, index) => (
              <button
                key={index}
                onClick={() => jumpToChapter(chapter.start_time)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 ${
                  currentChapterIndex === index ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Chapter {index + 1}</p>
                    <p className="text-gray-400 text-sm">{chapter.title}</p>
                  </div>
                  <span className="text-gray-500 text-sm">{formatTime(chapter.start_time)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
