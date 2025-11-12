/**
 * Toast Notification System
 * Simple, elegant toast messages to replace alert() calls
 */

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

let toastCounter = 0
const listeners = new Set<(messages: ToastMessage[]) => void>()
let messages: ToastMessage[] = []

// Toast API
export const toast = {
  success: (message: string, duration = 3000) => {
    addToast({ type: 'success', message, duration })
  },
  error: (message: string, duration = 5000) => {
    addToast({ type: 'error', message, duration })
  },
  info: (message: string, duration = 3000) => {
    addToast({ type: 'info', message, duration })
  },
  warning: (message: string, duration = 4000) => {
    addToast({ type: 'warning', message, duration })
  }
}

function addToast(toast: Omit<ToastMessage, 'id'>) {
  const id = `toast-${++toastCounter}`
  const newToast: ToastMessage = { id, ...toast }
  messages = [...messages, newToast]
  notifyListeners()

  // Auto-remove after duration
  if (toast.duration) {
    setTimeout(() => {
      removeToast(id)
    }, toast.duration)
  }
}

function removeToast(id: string) {
  messages = messages.filter(m => m.id !== id)
  notifyListeners()
}

function notifyListeners() {
  listeners.forEach(listener => listener([...messages]))
}

// Toast Container Component
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    listeners.add(setToasts)
    return () => {
      listeners.delete(setToasts)
    }
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

// Individual Toast Item
interface ToastItemProps {
  toast: ToastMessage
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 200) // Wait for animation
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />
      case 'info':
        return <Info className="w-5 h-5" />
    }
  }

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIconColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      case 'warning':
        return 'text-yellow-500'
      case 'info':
        return 'text-blue-500'
    }
  }

  return (
    <div
      className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        min-w-[300px] max-w-md
        ${getColors()}
        transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      style={{
        animation: isExiting ? 'none' : 'slideIn 0.2s ease-out'
      }}
    >
      <div className={getIconColor()}>
        {getIcon()}
      </div>
      
      <p className="flex-1 text-sm font-medium leading-snug">
        {toast.message}
      </p>

      <button
        onClick={handleClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
