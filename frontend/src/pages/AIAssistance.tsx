/**
 * AI Assistance Page - Creative Writing Prompts & Brainstorming Tools
 * 
 * IMPORTANT: This tool generates PROMPTS and QUESTIONS to inspire YOUR creativity.
 * It does NOT write content for you. All actual writing must be done by you.
 * Your work will be checked for AI-generated content - use these as inspiration only!
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"
import { 
  Sparkles, Lightbulb, Users, TrendingUp, BookOpen, 
  List, Type, RefreshCw, AlertCircle, Zap, HelpCircle
} from 'lucide-react'
import { toast } from '../services/toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

type AssistanceTab = 'prompts' | 'character' | 'plot' | 'pacing' | 'synonyms' | 'titles' | 'outline'

interface PromptResult {
  prompts?: string[]
  questions?: string[]
  suggestions?: string[]
  structure?: any
  synonyms?: string[]
  titles?: string[]
  outline?: any
}

export function AIAssistance() {
  const { user, login, logout, getAccessToken } = useAuth()
  const [activeTab, setActiveTab] = useState<AssistanceTab>('prompts')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PromptResult | null>(null)
  const [error, setError] = useState('')

  // Form states
  const [genre, setGenre] = useState('')
  const [theme, setTheme] = useState('')
  const [style, setStyle] = useState('')
  const [characterType, setCharacterType] = useState('')
  const [plotType, setPlotType] = useState('')
  const [storyText, setStoryText] = useState('')
  const [word, setWord] = useState('')
  const [context, setContext] = useState('')
  const [titleGenre, setTitleGenre] = useState('')
  const [titleTheme, setTitleTheme] = useState('')
  const [outlineGenre, setOutlineGenre] = useState('')
  const [outlineLength, setOutlineLength] = useState('medium')

  useEffect(() => {
    const fetchUser = async () => {
    }
    fetchUser()
  }, [])

  const callAPI = async (endpoint: string, body: any) => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/ai-assist/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        const message = errorData.detail || 'Failed to generate prompts'
        toast.error(message)
        throw new Error(message)
      }

      const data = await response.json()
      setResult(data)
      toast.success('AI assistance complete')
    } catch (err: any) {
      setError(err.message)
      toast.error(err?.message || 'AI assistance failed')
    } finally {
      setLoading(false)
    }
  }

  const generatePrompts = () => {
    callAPI('writing-prompts', {
      genre: genre || undefined,
      theme: theme || undefined,
      style: style || undefined,
      count: 5
    })
  }

  const generateCharacterQuestions = () => {
    callAPI('character-questions', {
      character_type: characterType || undefined,
      genre: genre || undefined
    })
  }

  const generatePlotStructure = () => {
    callAPI('plot-structure', {
      genre: genre || undefined,
      plot_type: plotType || undefined,
      theme: theme || undefined
    })
  }

  const analyzePacing = () => {
    callAPI('pacing-analysis', {
      story_text: storyText,
      target_word_count: undefined
    })
  }

  const getSynonyms = () => {
    callAPI('synonyms', {
      word: word,
      context: context || undefined,
      pos: undefined
    })
  }

  const generateTitles = () => {
    callAPI('title-ideas', {
      genre: titleGenre || undefined,
      theme: titleTheme || undefined,
      style: style || undefined,
      count: 10
    })
  }

  const generateOutline = () => {
    callAPI('outline-structure', {
      genre: outlineGenre || undefined,
      story_length: outlineLength,
      theme: theme || undefined
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        user={user} 
        onLogin={() => login()} 
        onLogout={() => logout()}
        currentPage="ai-assistance" 
      />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Important Warning */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">AI Writing Prompts</h1>
          </div>
          <p className="text-muted-foreground text-lg mb-4">
            Get creative prompts, questions, and brainstorming ideas to inspire YOUR writing
          </p>

          {/* Critical Warning */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-1">
                  ⚠️ IMPORTANT: These are PROMPTS and IDEAS only
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This tool generates <strong>questions, prompts, and suggestions</strong> to inspire YOUR creativity. 
                  It does NOT write content for you. All actual writing must be done by you. 
                  Your work will be checked for AI-generated content - use these as inspiration only!
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-border">
            <div className="flex gap-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('prompts')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'prompts'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="h-4 w-4" />
                Writing Prompts
              </button>
              <button
                onClick={() => setActiveTab('character')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'character'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" />
                Character Questions
              </button>
              <button
                onClick={() => setActiveTab('plot')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'plot'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Plot Structure
              </button>
              <button
                onClick={() => setActiveTab('pacing')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'pacing'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Pacing Analysis
              </button>
              <button
                onClick={() => setActiveTab('synonyms')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'synonyms'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Type className="h-4 w-4" />
                Synonyms
              </button>
              <button
                onClick={() => setActiveTab('titles')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'titles'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Title Ideas
              </button>
              <button
                onClick={() => setActiveTab('outline')}
                className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'outline'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-4 w-4" />
                Outline Structure
              </button>
            </div>
          </div>
        </div>

        {/* Writing Prompts Tab */}
        {activeTab === 'prompts' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Generate Writing Prompts</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Get creative prompts to spark story ideas. These are starting points - you write the actual story!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Genre (optional)</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g., fantasy, sci-fi, romance"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Theme (optional)</label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., redemption, love, revenge"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Style (optional)</label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="e.g., dark, humorous, dramatic"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <button
                  onClick={generatePrompts}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4" />
                      Generate Prompts
                    </>
                  )}
                </button>
              </div>
            </div>

            {result?.prompts && (
              <div className="bg-muted border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Your Writing Prompts</h3>
                <div className="space-y-3">
                  {result.prompts.map((prompt, idx) => (
                    <div key={idx} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <p className="text-sm">{prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Character Questions Tab */}
        {activeTab === 'character' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Character Development Questions</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Get thought-provoking questions to help you develop YOUR characters. Answer these yourself!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Character Type (optional)</label>
                  <input
                    type="text"
                    value={characterType}
                    onChange={(e) => setCharacterType(e.target.value)}
                    placeholder="e.g., protagonist, villain, mentor"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Genre (optional)</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g., fantasy, thriller, romance"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <button
                  onClick={generateCharacterQuestions}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <HelpCircle className="h-4 w-4" />
                      Generate Questions
                    </>
                  )}
                </button>
              </div>
            </div>

            {result?.questions && (
              <div className="bg-muted border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Character Development Questions</h3>
                <div className="space-y-3">
                  {result.questions.map((question, idx) => (
                    <div key={idx} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{question}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plot Structure Tab */}
        {activeTab === 'plot' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Plot Structure Suggestions</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Get structural suggestions for your plot. These are frameworks - you create the actual story!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Genre (optional)</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g., mystery, adventure, drama"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Plot Type (optional)</label>
                  <input
                    type="text"
                    value={plotType}
                    onChange={(e) => setPlotType(e.target.value)}
                    placeholder="e.g., hero's journey, rags to riches"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Theme (optional)</label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., coming of age, survival"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <button
                  onClick={generatePlotStructure}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      Generate Structure
                    </>
                  )}
                </button>
              </div>
            </div>

            {result?.suggestions && (
              <div className="bg-muted border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Plot Structure Suggestions</h3>
                <div className="space-y-3">
                  {result.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="p-4 bg-background rounded-lg border border-border">
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pacing Analysis Tab */}
        {activeTab === 'pacing' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Pacing Analysis</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Analyze the pacing of YOUR existing text. Get suggestions on rhythm and flow.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Story Text</label>
                  <textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="Paste a section of your story here..."
                    className="w-full min-h-[200px] px-3 py-2 bg-background border border-input rounded-md font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Word count: {storyText.trim().split(/\s+/).filter(w => w.length > 0).length}
                  </p>
                </div>

                <button
                  onClick={analyzePacing}
                  disabled={loading || !storyText.trim()}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      Analyze Pacing
                    </>
                  )}
                </button>
              </div>
            </div>

            {result?.structure && (
              <div className="bg-muted border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Pacing Analysis</h3>
                <div className="space-y-4">
                  <pre className="text-sm whitespace-pre-wrap bg-background p-4 rounded-lg border border-border">
                    {JSON.stringify(result.structure, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Synonyms Tab */}
        {activeTab === 'synonyms' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Type className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Find Synonyms</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Find alternative words to vary your vocabulary and improve your writing.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Word</label>
                  <input
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="Enter a word..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Context (optional)</label>
                  <input
                    type="text"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="e.g., The hero was very ___"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <button
                  onClick={getSynonyms}
                  disabled={loading || !word.trim()}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Finding...
                    </>
                  ) : (
                    <>
                      <Type className="h-4 w-4" />
                      Find Synonyms
                    </>
                  )}
                </button>
              </div>
            </div>

            {result?.synonyms && (
              <div className="bg-muted border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Synonyms for "{word}"</h3>
                <div className="flex flex-wrap gap-2">
                  {result.synonyms.map((synonym, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-background rounded-full border border-border text-sm hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors"
                      onClick={() => setWord(synonym)}
                    >
                      {synonym}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Title Ideas Tab */}
        {activeTab === 'titles' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Generate Title Ideas</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Get creative title suggestions for your story. Use as inspiration or starting points!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Genre (optional)</label>
                  <input
                    type="text"
                    value={titleGenre}
                    onChange={(e) => setTitleGenre(e.target.value)}
                    placeholder="e.g., horror, romance, sci-fi"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Theme (optional)</label>
                  <input
                    type="text"
                    value={titleTheme}
                    onChange={(e) => setTitleTheme(e.target.value)}
                    placeholder="e.g., betrayal, discovery, hope"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Style (optional)</label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="e.g., poetic, stark, mysterious"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <button
                  onClick={generateTitles}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Generate Titles
                    </>
                  )}
                </button>
              </div>
            </div>

            {result?.titles && (
              <div className="bg-muted border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Title Ideas</h3>
                <div className="space-y-2">
                  {result.titles.map((title, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                    >
                      <p className="font-medium">{title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Outline Structure Tab */}
        {activeTab === 'outline' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <List className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Generate Story Outline</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Get a structural outline framework for your story. Fill in YOUR own details!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Genre (optional)</label>
                  <input
                    type="text"
                    value={outlineGenre}
                    onChange={(e) => setOutlineGenre(e.target.value)}
                    placeholder="e.g., fantasy, thriller, literary"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Story Length</label>
                  <select
                    value={outlineLength}
                    onChange={(e) => setOutlineLength(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  >
                    <option value="short">Short Story (1,000-7,500 words)</option>
                    <option value="medium">Novella (7,500-40,000 words)</option>
                    <option value="long">Novel (40,000-120,000 words)</option>
                    <option value="epic">Epic (120,000+ words)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Theme (optional)</label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., identity, family, freedom"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>

                <button
                  onClick={generateOutline}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <List className="h-4 w-4" />
                      Generate Outline
                    </>
                  )}
                </button>
              </div>
            </div>

            {result?.outline && (
              <div className="bg-muted border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Story Outline Structure</h3>
                <div className="space-y-4">
                  <pre className="text-sm whitespace-pre-wrap bg-background p-4 rounded-lg border border-border">
                    {JSON.stringify(result.outline, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            How to Use These Tools Ethically
          </h4>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-1">✓</span>
              <span><strong>Use prompts as inspiration</strong> - Let them spark YOUR creative ideas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-1">✓</span>
              <span><strong>Answer character questions yourself</strong> - Build YOUR unique characters</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-1">✓</span>
              <span><strong>Use structure as a framework</strong> - Fill in with YOUR original content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-1">✗</span>
              <span><strong>Don't use AI to write your actual story</strong> - All content will be checked for AI generation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-1">✗</span>
              <span><strong>Don't copy prompts verbatim</strong> - Transform them into YOUR unique vision</span>
            </li>
          </ul>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
