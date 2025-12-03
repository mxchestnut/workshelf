/**
 * Toast Helper Functions
 * Toast notification system - separated for fast refresh compatibility
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
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

export function addToast(toast: Omit<ToastMessage, 'id'>) {
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

export function removeToast(id: string) {
  messages = messages.filter(m => m.id !== id)
  notifyListeners()
}

export function notifyListeners() {
  listeners.forEach(listener => listener([...messages]))
}

export { listeners }
