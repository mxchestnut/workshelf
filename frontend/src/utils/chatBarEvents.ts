/**
 * ChatBar Event Bus
 * Allows other components to open the chat bar with context
 */

type ChatEventListener = (data: { initialContext?: string }) => void

class ChatBarEventBus {
  private listeners: ChatEventListener[] = []

  subscribe(listener: ChatEventListener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  openAIChat(initialContext?: string) {
    this.listeners.forEach(listener => listener({ initialContext }))
  }
}

export const chatBarEvents = new ChatBarEventBus()
