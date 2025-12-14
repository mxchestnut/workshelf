/**
 * Passage Editor - Rich text editor for roleplay posts
 * Simplified version of the main Editor for IC (in-character) writing
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect } from 'react'
import { Bold, Italic, List, Quote, Undo, Redo } from 'lucide-react'

interface PassageEditorProps {
  content?: any // TipTap JSON content
  onChange: (content: any) => void
  placeholder?: string
  minHeight?: string
}

export function PassageEditor({
  content,
  onChange,
  placeholder = "Write your passage...",
  minHeight = "200px"
}: PassageEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder
      }),
      CharacterCount,
      Typography,
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      })
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none'
      }
    }
  })

  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  const wordCount = editor.storage.characterCount.words()
  const charCount = editor.storage.characterCount.characters()

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex items-center gap-1 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive('bold') ? 'bg-accent' : ''
          }`}
          title="Bold"
          type="button"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive('italic') ? 'bg-accent' : ''
          }`}
          title="Italic"
          type="button"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive('bulletList') ? 'bg-accent' : ''
          }`}
          title="Bullet List"
          type="button"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-accent ${
            editor.isActive('blockquote') ? 'bg-accent' : ''
          }`}
          title="Quote"
          type="button"
        >
          <Quote className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-accent disabled:opacity-50"
          title="Undo"
          type="button"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-accent disabled:opacity-50"
          title="Redo"
          type="button"
        >
          <Redo className="w-4 h-4" />
        </button>
        
        <div className="ml-auto text-xs text-muted-foreground">
          {wordCount} words · {charCount} characters
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="p-4"
        style={{ minHeight }}
      />
    </div>
  )
}
