import { useEffect, useRef, useState } from 'react';

interface MatrixOnboardingModalProps {
  onClose: () => void;
}

export function MatrixOnboardingModal({ onClose }: MatrixOnboardingModalProps) {
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Focus trap and escape-to-close
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement
    // Move focus to the first interactive element
    firstFocusableRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const container = dialogRef.current
        if (!container) return
        const focusable = container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === last) {
            first.focus()
            e.preventDefault()
          }
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restore focus to the previously focused element
      previouslyFocused.current?.focus()
    }
  }, [onClose])

  const handleClose = async () => {
    setClosing(true);
    try {
      // Mark Matrix onboarding as seen in backend
  const token = localStorage.getItem('access_token');
      if (token) {
  await fetch(`${import.meta.env.VITE_API_URL || 'https://workshelf.dev'}/api/v1/auth/mark-matrix-onboarding-seen`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Failed to mark Matrix onboarding as seen:', error);
    } finally {
      setClosing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="matrix-onboarding-title">
      <div ref={dialogRef} className="bg-white rounded-lg p-8 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto" role="document">
        <h2 id="matrix-onboarding-title" className="text-2xl font-bold text-gray-900 mb-6">Welcome to Work Shelf Chat!</h2>
        
        <div className="space-y-4 text-gray-700">
          <p className="text-lg">
            🎉 Great news! We've added real-time chat powered by Matrix.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-semibold text-gray-900 mb-2">What is Matrix?</h3>
            <p>
              Matrix is an open-source, decentralized messaging protocol that powers Work Shelf's real-time chat. 
              Your messages sync seamlessly across all your devices and stay private.
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-semibold text-gray-900 mb-2">Using Element for Chat</h3>
            <p className="mb-3">
              To access your group chats, we recommend downloading <strong>Element</strong> — 
              the best Matrix client available. You can use it on your phone, desktop, or web browser.
            </p>
            <a
              href="https://element.io/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              Download Element →
            </a>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <h3 className="font-semibold text-gray-900 mb-2">Connect Your Matrix Account</h3>
            <p>
              To use messaging features with Element, you'll need to connect your Matrix account. 
              You can do this from your <strong>Profile → Messaging</strong> section.
            </p>
            <p className="mt-2 text-sm">
              Don't have a Matrix account? Create one at <a href="https://app.element.io/#/register" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Element</a> first.
            </p>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            💡 <strong>Tip:</strong> When you join groups with active chat spaces, you'll see an "Open in Element" link 
            to jump right into the conversation!
          </p>
        </div>

        <div className="flex justify-end mt-8">
          <button
            type="button"
            onClick={handleClose}
            disabled={closing}
            className="px-8 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={closing ? 'Saving acknowledgment' : 'Acknowledge and close Matrix introduction'}
            ref={firstFocusableRef}
          >
            {closing ? 'Saving...' : 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
}
