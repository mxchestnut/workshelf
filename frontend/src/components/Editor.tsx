/**
 * WorkShelf Editor - Beautiful, distraction-free writing
 * 
 * Features:
 * - Rich text editing with TipTap
 * - Distraction-free immersive mode
 * - Auto-save every 2 seconds
 * - Word count & reading time
 * - Beautiful typography
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Focus from '@tiptap/extension-focus'
import Gapcursor from '@tiptap/extension-gapcursor'
import Dropcursor from '@tiptap/extension-dropcursor'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import FloatingMenu from '@tiptap/extension-floating-menu'
import Youtube from '@tiptap/extension-youtube'
import Mention from '@tiptap/extension-mention'
import { useState, useCallback } from 'react'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Maximize,
  Minimize,
  Save,
  Check
} from 'lucide-react'

interface EditorProps {
  content?: any // TipTap JSON content
  title: string
  onTitleChange: (title: string) => void
  onContentChange: (content: any) => void
  onSave: () => Promise<void>
  autoSave?: boolean
  placeholder?: string
}

export function Editor({
  content,
  title,
  onTitleChange,
  onContentChange,
  onSave,
  autoSave = true,
  placeholder = "Start writing..."
}: EditorProps) {
  const [immersiveMode, setImmersiveMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

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
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-orange-600 hover:text-orange-700 underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Subscript,
      Superscript,
      TextStyle,
      Color,
      FontFamily,
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      Gapcursor,
      Dropcursor,
      BubbleMenu,
      FloatingMenu,
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }: { editor: any }) => {
      const json = editor.getJSON()
      onContentChange(json)
      
      // Trigger auto-save
      if (autoSave) {
        if (saveTimeout) {
          clearTimeout(saveTimeout)
        }
        const timeout = setTimeout(() => {
          handleAutoSave()
        }, 2000) // Save 2 seconds after user stops typing
        setSaveTimeout(timeout)
      }
    },
  })

  const handleAutoSave = useCallback(async () => {
    if (!editor) return
    
    setIsSaving(true)
    try {
      await onSave()
      setLastSaved(new Date())
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editor, onSave])

  const handleManualSave = async () => {
    setIsSaving(true)
    try {
      await onSave()
      setLastSaved(new Date())
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate reading time (average 200 words per minute)
  const wordCount = editor?.storage.characterCount.words() || 0
  const readingTime = Math.ceil(wordCount / 200)

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return ''
    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  if (!editor) {
    return null
  }

  const MenuBar = () => (
    <div className="border-b border-neutral-light bg-white sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-neutral-lightest transition-colors ${
              editor.isActive('bold') ? 'bg-neutral-lightest text-primary' : ''
            }`}
            title="Bold (Cmd+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-neutral-lightest transition-colors ${
              editor.isActive('italic') ? 'bg-neutral-lightest text-primary' : ''
            }`}
            title="Italic (Cmd+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={`p-2 rounded hover:bg-neutral-lightest transition-colors ${
              editor.isActive('strike') ? 'bg-neutral-lightest text-primary' : ''
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={`p-2 rounded hover:bg-neutral-lightest transition-colors ${
              editor.isActive('code') ? 'bg-neutral-lightest text-primary' : ''
            }`}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-neutral-light mx-2" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-neutral-lightest transition-colors ${
              editor.isActive('bulletList') ? 'bg-neutral-lightest text-primary' : ''
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-neutral-lightest transition-colors ${
              editor.isActive('orderedList') ? 'bg-neutral-lightest text-primary' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-neutral-lightest transition-colors ${
              editor.isActive('blockquote') ? 'bg-neutral-lightest text-primary' : ''
            }`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-neutral-light mx-2" />

          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="p-2 rounded hover:bg-neutral-lightest transition-colors disabled:opacity-50"
            title="Undo (Cmd+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="p-2 rounded hover:bg-neutral-lightest transition-colors disabled:opacity-50"
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setImmersiveMode(!immersiveMode)}
            className="p-2 rounded hover:bg-neutral-lightest transition-colors"
            title={immersiveMode ? "Exit immersive mode" : "Enter immersive mode"}
          >
            {immersiveMode ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
            title="Save now (Cmd+S)"
          >
            {isSaving ? (
              <>
                <Save className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-sm">{formatLastSaved()}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="text-sm">Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`flex flex-col h-full ${immersiveMode ? 'fixed inset-0 z-50 bg-neutral-lightest' : ''}`}>
      {!immersiveMode && <MenuBar />}
      
      <div className={`flex-1 overflow-y-auto ${immersiveMode ? 'flex items-center justify-center' : ''}`}>
        <div className={`${immersiveMode ? 'max-w-3xl w-full px-8' : 'max-w-4xl mx-auto'}`}>
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Document"
            className={`w-full bg-transparent border-none outline-none font-bold text-neutral-darkest placeholder-neutral ${
              immersiveMode ? 'text-5xl py-8' : 'text-4xl px-8 pt-8 pb-4'
            }`}
          />

          {/* Editor */}
          <EditorContent 
            editor={editor} 
            className={immersiveMode ? 'text-xl leading-relaxed' : ''}
          />
        </div>
      </div>

      {/* Footer with stats */}
      {!immersiveMode && (
        <div className="border-t border-neutral-light bg-white px-8 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-neutral">
            <div className="flex items-center gap-6">
              <span>{wordCount.toLocaleString()} words</span>
              <span>{readingTime} min read</span>
              <span>{editor.storage.characterCount.characters().toLocaleString()} characters</span>
            </div>
            {autoSave && (
              <div className="flex items-center gap-2 text-xs text-neutral">
                {isSaving ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-pulse">●</span> Saving...
                  </span>
                ) : lastSaved ? (
                  <span>Last saved {formatLastSaved()}</span>
                ) : (
                  <span>Auto-save enabled</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
