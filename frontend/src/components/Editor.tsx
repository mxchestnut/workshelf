/**
 * NPC Editor - Beautiful, distraction-free writing
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
import TextAlign from '@tiptap/extension-text-align'
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
import Youtube from '@tiptap/extension-youtube'
import Mention from '@tiptap/extension-mention'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'

const lowlight = createLowlight()
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('css', css)
lowlight.register('html', html)
lowlight.register('json', json)
lowlight.register('markdown', markdown)
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
  Check,
  MessageSquare,
  ChevronDown,
  FileEdit,
  Radio,
  Globe,
  Send
} from 'lucide-react'

interface EditorProps {
  content?: any // TipTap JSON content
  title: string
  status?: 'draft' | 'beta' | 'published'
  onTitleChange: (title: string) => void
  onContentChange: (content: any) => void
  onSave: () => Promise<void>
  onStatusChange?: (status: 'draft' | 'beta' | 'published') => Promise<void>
  autoSave?: boolean
  placeholder?: string
}

export function Editor({
  content,
  title,
  status = 'draft',
  onTitleChange,
  onContentChange,
  onSave,
  onStatusChange,
  autoSave = true,
  placeholder = "Start writing..."
}: EditorProps) {
  const [immersiveMode, setImmersiveMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  const editor = useEditor({
    editable: status !== 'published',
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        codeBlock: false, // Disable default code block to use CodeBlockLowlight
        dropcursor: false, // Will use Dropcursor extension instead
        gapcursor: false, // Will use Gapcursor extension instead
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder
      }),
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
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
          <button
            onClick={() => {
              const sel = window.getSelection()
              const text = sel?.toString() || ''
              if (!text.trim()) return
              const anchor = {
                text: text.trim(),
                length: text.trim().length,
                created_at: Date.now()
              }
              ;(window as any).setPendingCommentAnchor?.(anchor)
            }}
            className="p-2 rounded hover:bg-neutral-lightest transition-colors"
            title="Comment on selection"
          >
            <MessageSquare className="w-4 h-4" />
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
            disabled={isSaving || status === 'published'}
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

          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-border hover:bg-accent transition-colors"
            >
              <span className="text-sm font-medium capitalize">{status}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {statusMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onStatusChange?.('draft')
                      setStatusMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                  >
                    <FileEdit className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Draft</div>
                      <div className="text-xs text-muted-foreground">Private editing mode</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onStatusChange?.('beta')
                      setStatusMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                  >
                    <Radio className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Beta</div>
                      <div className="text-xs text-muted-foreground">Share with beta readers</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onStatusChange?.('published')
                      setStatusMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                  >
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Published</div>
                      <div className="text-xs text-muted-foreground">Make public (read-only)</div>
                    </div>
                  </button>

                  <div className="border-t border-border my-1"></div>

                  <button
                    onClick={() => {
                      // TODO: Implement send functionality
                      setStatusMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                  >
                    <Send className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Send</div>
                      <div className="text-xs text-muted-foreground">Send as message</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`flex flex-col h-full ${immersiveMode ? 'fixed inset-0 z-50 bg-neutral-lightest' : ''}`}>
      {!immersiveMode && <MenuBar />}
      
      <div className={`flex-1 overflow-y-auto ${immersiveMode ? 'flex items-center justify-center' : ''}`}>
        <div className={`${immersiveMode ? 'max-w-3xl w-full px-8' : 'max-w-4xl mx-auto'}`}>
          {/* Title with status badge */}
          <div className={`flex items-center gap-3 ${immersiveMode ? 'py-8' : 'px-8 pt-8 pb-4'}`}>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled Document"
              readOnly={status === 'published'}
              className={`flex-1 bg-transparent border-none outline-none font-bold text-neutral-darkest placeholder-neutral ${
                immersiveMode ? 'text-5xl' : 'text-4xl'
              } ${status === 'published' ? 'cursor-default' : ''}`}
            />
            {status !== 'draft' && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                status === 'beta' ? 'bg-purple-100 text-purple-700' :
                status === 'published' ? 'bg-green-100 text-green-700' : ''
              }`}>
                {status === 'beta' ? 'Beta' : 'Published'}
              </span>
            )}
          </div>

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
