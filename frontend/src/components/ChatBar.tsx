import { useMemo } from 'react'
import { MessageSquare, ExternalLink } from 'lucide-react'
import { useMatrix } from '../hooks/useMatrixClient.tsx'
import { authService } from '../services/auth'

/**
 * ChatBar
 * A slim, unobtrusive bar anchored to the bottom that lets users open chat
 * while continuing to work on the site. Shows even when Matrix isn't ready yet.
 */
export function ChatBar() {
  const { isReady, unreadCount } = useMatrix()

  // Only show if user is logged in
  const isLoggedIn = !!authService.getToken()

  const badge = useMemo(() => {
    if (!isReady || !unreadCount) return null
    return (
      <span
        className="ml-2 text-xs font-bold rounded-full px-1.5 py-0.5 bg-primary text-primary-foreground"
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )
  }, [isReady, unreadCount])

  if (!isLoggedIn) return null

  const handleOpenMessages = () => {
    // Broadcast to toggle the ChatLauncher tray open
    window.dispatchEvent(new CustomEvent('toggleChatTray'))
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 py-2 bg-card text-foreground border-t border-border"
      style={{ zIndex: 9996 }}
      aria-label="Work Shelf chat bar"
    >
      <div className="flex items-center justify-between gap-3 px-6">
        {/* Left: label */}
        <div className="flex items-center">
          <MessageSquare size={18} className="mr-2" />
          <span className="text-sm font-medium">Messages</span>
          {badge}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenMessages}
            disabled={!isReady}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isReady ? 'Setting up chat...' : 'Open your messages'}
          >
            {!isReady ? 'Setting up...' : 'Open Messages'}
          </button>

          <a
            href="https://app.element.io/"
            target="_blank"
            rel="noreferrer noopener"
            className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 bg-muted text-foreground hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={14} />
            Open in Element
          </a>
        </div>
      </div>
    </div>
  )
}
