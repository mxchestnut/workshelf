/**
 * MessagesChat Component
 * Real user-to-user messaging interface (placeholder for now)
 */
import { MessageCircle } from 'lucide-react'

export default function MessagesChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
      <MessageCircle className="w-16 h-16 mb-4 text-primary/50" />
      <p className="text-lg font-semibold mb-2">Messages</p>
      <p className="text-sm">User messaging coming soon!</p>
      <p className="text-xs mt-4 opacity-70">
        This will connect to your Matrix/Element messages
      </p>
    </div>
  )
}
