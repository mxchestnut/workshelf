# TipTap AI Assistant Integration

## How to add "Send to AI Assistant" to TipTap context menu

Add this to your TipTap editor configuration (in Studio or Document editor):

```typescript
import { chatBarEvents } from '../utils/chatBarEvents'

// Add to your TipTap extensions array:
import { Extension } from '@tiptap/core'

const AIAssistantExtension = Extension.create({
  name: 'aiAssistant',
  
  addKeyboardShortcuts() {
    return {
      // Optional: Add keyboard shortcut Cmd/Ctrl + Shift + A
      'Mod-Shift-a': () => {
        const { state } = this.editor
        const { from, to } = state.selection
        const selectedText = state.doc.textBetween(from, to, ' ')
        
        if (selectedText) {
          chatBarEvents.openAIChat(selectedText)
          return true
        }
        return false
      },
    }
  },
})

// Add to extensions array:
const editor = useEditor({
  extensions: [
    StarterKit,
    // ... other extensions
    AIAssistantExtension,
  ],
})
```

## Context Menu Integration

For right-click context menu, add this to your editor wrapper:

```typescript
const handleContextMenu = (e: React.MouseEvent) => {
  const selection = editor?.state.selection
  if (!selection || selection.empty) return
  
  const from = selection.from
  const to = selection.to
  const selectedText = editor?.state.doc.textBetween(from, to, ' ')
  
  if (selectedText && selectedText.trim().length > 0) {
    e.preventDefault()
    
    // Show custom context menu or use browser menu
    const menu = document.createElement('div')
    menu.className = 'absolute bg-card border border-border rounded-lg shadow-lg p-2 z-50'
    menu.style.left = `${e.clientX}px`
    menu.style.top = `${e.clientY}px`
    
    const button = document.createElement('button')
    button.textContent = '🤖 Send to AI Assistant'
    button.className = 'px-3 py-2 hover:bg-accent rounded transition-colors w-full text-left'
    button.onclick = () => {
      chatBarEvents.openAIChat(selectedText)
      document.body.removeChild(menu)
    }
    
    menu.appendChild(button)
    document.body.appendChild(menu)
    
    // Remove menu on click outside
    const removeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu)
      }
      document.removeEventListener('click', removeMenu)
    }
    setTimeout(() => document.addEventListener('click', removeMenu), 100)
  }
}

// Add to editor wrapper:
<div onContextMenu={handleContextMenu}>
  <EditorContent editor={editor} />
</div>
```

## Simple Text Selection Button

Alternatively, add a floating toolbar button that appears on text selection:

```typescript
const [showAIButton, setShowAIButton] = useState(false)
const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })

useEffect(() => {
  const handleSelection = () => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()
    
    if (selectedText && selectedText.length > 0) {
      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()
      
      if (rect) {
        setButtonPosition({
          x: rect.right + 10,
          y: rect.top
        })
        setShowAIButton(true)
      }
    } else {
      setShowAIButton(false)
    }
  }
  
  document.addEventListener('selectionchange', handleSelection)
  return () => document.removeEventListener('selectionchange', handleSelection)
}, [])

// Render floating button:
{showAIButton && (
  <button
    style={{
      position: 'fixed',
      left: `${buttonPosition.x}px`,
      top: `${buttonPosition.y}px`,
      zIndex: 1000
    }}
    onClick={() => {
      const selectedText = window.getSelection()?.toString()
      if (selectedText) {
        chatBarEvents.openAIChat(selectedText)
      }
    }}
    className="px-3 py-1 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
  >
    🤖 Ask AI
  </button>
)}
```

## Usage

Once integrated, users can:
1. Select text in the editor
2. Right-click → "Send to AI Assistant"
3. Or use keyboard shortcut (Cmd/Ctrl + Shift + A)
4. AI chat opens automatically with their selected text as context
5. AI provides suggestions based on the selected content
