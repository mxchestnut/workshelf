/**
 * PublishModal - Multi-step publishing workflow
 * 
 * Step 1: Preview & Format - See how book will look in Readium
 * Step 2: Set Pricing - Choose free or paid, set price
 * Step 3: Confirm & Publish - Review and confirm publication
 */
import { useState } from 'react'
import { X, Eye, DollarSign, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'

interface PublishModalProps {
  document: {
    id: number
    title: string
    content: any
    word_count?: number
  }
  onClose: () => void
  onPublish: (publishData: PublishData) => Promise<void>
}

export interface PublishData {
  price_usd: number
  is_free: boolean
  description?: string
  genres?: string[]
}

type Step = 'preview' | 'pricing' | 'confirm'

export default function PublishModal({ document, onClose, onPublish }: PublishModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('preview')
  const [isFree, setIsFree] = useState(true)
  const [price, setPrice] = useState('0.00')
  const [description, setDescription] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      await onPublish({
        price_usd: isFree ? 0 : parseFloat(price),
        is_free: isFree,
        description: description || undefined,
        genres: genres.length > 0 ? genres : undefined
      })
    } catch (error) {
      console.error('Publishing failed:', error)
      setIsPublishing(false)
    }
  }

  const readingTime = document.word_count 
    ? Math.ceil(document.word_count / 200) 
    : 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Publish to WorkShelf</h2>
            <p className="text-sm text-gray-600 mt-1">Make your work available for readers</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'preview' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-green-100 text-green-600'
              }`}>
                {currentStep === 'preview' ? '1' : <CheckCircle className="w-5 h-5" />}
              </div>
              <span className="font-medium text-sm">Preview</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'pricing' 
                  ? 'bg-purple-600 text-white' 
                  : currentStep === 'confirm'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {currentStep === 'confirm' ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium text-sm">Pricing</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'confirm' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-400'
              }`}>
                3
              </div>
              <span className="font-medium text-sm">Confirm</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Preview */}
          {currentStep === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Preview Your Published Work</h3>
                  <p className="text-sm text-blue-700">
                    Your document will be available in the WorkShelf reading experience with 
                    formatting optimized for all devices. Readers will access it through our 
                    Readium-powered reader with features like:
                  </p>
                  <ul className="mt-2 text-sm text-blue-700 space-y-1">
                    <li>• Adjustable font size and themes (light/dark/sepia)</li>
                    <li>• Text-to-speech with natural voices</li>
                    <li>• Progress tracking and bookmarks</li>
                    <li>• Mobile and desktop reading</li>
                  </ul>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-xl text-gray-900 mb-2">{document.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  {document.word_count && (
                    <>
                      <span>{document.word_count.toLocaleString()} words</span>
                      <span>•</span>
                    </>
                  )}
                  {readingTime > 0 && (
                    <span>{readingTime} min read</span>
                  )}
                </div>

                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-700 line-clamp-6">
                    {/* Show a preview of the content */}
                    {typeof document.content === 'string' 
                      ? document.content.substring(0, 300) + '...'
                      : 'Rich text content preview...'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing */}
          {currentStep === 'pricing' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">Set Your Price</h3>
                  <p className="text-sm text-purple-700">
                    Choose whether to offer your work for free or set a price. 
                    You can change this later from your published works dashboard.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Free or Paid Toggle */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsFree(true)}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      isFree 
                        ? 'border-purple-600 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-lg mb-1">Free</div>
                    <div className="text-sm text-gray-600">Share your work with everyone</div>
                  </button>
                  <button
                    onClick={() => setIsFree(false)}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      !isFree 
                        ? 'border-purple-600 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-lg mb-1">Paid</div>
                    <div className="text-sm text-gray-600">Set a price for your work</div>
                  </button>
                </div>

                {/* Price Input (if paid) */}
                {!isFree && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.99"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="9.99"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum price is $0.99. You'll receive 70% after platform fees.
                    </p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Tell readers what your work is about..."
                  />
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Genres (Optional)
                  </label>
                  <input
                    type="text"
                    value={genres.join(', ')}
                    onChange={(e) => setGenres(e.target.value.split(',').map(g => g.trim()).filter(Boolean))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Fiction, Romance, Thriller"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate genres with commas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Ready to Publish</h3>
                  <p className="text-sm text-green-700">
                    Review your publication details below. Once published, your work will 
                    be available to readers immediately.
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Title</div>
                  <div className="font-semibold text-gray-900">{document.title}</div>
                </div>
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Price</div>
                  <div className="font-semibold text-gray-900">
                    {isFree ? 'Free' : `$${parseFloat(price).toFixed(2)} USD`}
                  </div>
                </div>
                {description && (
                  <div className="p-4">
                    <div className="text-sm text-gray-600 mb-1">Description</div>
                    <div className="text-gray-900">{description}</div>
                  </div>
                )}
                {genres.length > 0 && (
                  <div className="p-4">
                    <div className="text-sm text-gray-600 mb-1">Genres</div>
                    <div className="flex flex-wrap gap-2">
                      {genres.map((genre, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="font-semibold text-yellow-900 mb-2">Important Information</div>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Your work will be publicly available in the WorkShelf reading library</li>
                  <li>• Readers will access it through our Readium-powered reader</li>
                  <li>• You can unpublish or update pricing at any time</li>
                  <li>• Analytics and reader feedback will be available in your dashboard</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep === 'preview') {
                onClose()
              } else if (currentStep === 'pricing') {
                setCurrentStep('preview')
              } else if (currentStep === 'confirm') {
                setCurrentStep('pricing')
              }
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 'preview' ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={() => {
              if (currentStep === 'preview') {
                setCurrentStep('pricing')
              } else if (currentStep === 'pricing') {
                setCurrentStep('confirm')
              } else if (currentStep === 'confirm') {
                handlePublish()
              }
            }}
            disabled={isPublishing || (!isFree && parseFloat(price) < 0.99)}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {currentStep === 'confirm' 
              ? (isPublishing ? 'Publishing...' : 'Publish Now')
              : 'Continue'
            }
            {currentStep !== 'confirm' && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
