/**
 * Accessible Modal Component - WCAG 2.1 Compliance
 * Implements focus trap, escape key handling, and proper ARIA attributes
 */

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { IconButton } from './AccessibleButton'

interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true
}: AccessibleModalProps) {
  const containerRef = useFocusTrap({ enabled: isOpen, returnFocus: true })

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`bg-card rounded-lg shadow-xl w-full ${sizeStyles[size]} max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="modal-title" className="text-xl font-bold text-foreground">
            {title}
          </h2>
          {showCloseButton && (
            <IconButton
              icon={<X className="w-5 h-5" />}
              label="Close dialog"
              onClick={onClose}
              variant="ghost"
              size="sm"
            />
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Confirmation Modal - For destructive actions
 */
interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}: ConfirmationModalProps) {
  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
    >
      <p className="text-foreground mb-6">{message}</p>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2.5 min-h-[44px] rounded-lg border border-border text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          aria-busy={loading}
          className={`px-4 py-2.5 min-h-[44px] rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
            variant === 'danger'
              ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
              : variant === 'warning'
              ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
              : 'bg-primary hover:opacity-90 focus:ring-primary'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </AccessibleModal>
  )
}
