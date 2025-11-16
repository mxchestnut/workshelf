import { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2, Shield, FileText } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

export default function UploadBook() {
  const [step, setStep] = useState<'form' | 'uploading' | 'verifying' | 'success' | 'error'>('form')
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    author_name: '',
    description: '',
    genres: '',
    isbn: '',
  })
  const [attestations, setAttestations] = useState({
    author_attestation: false,
    copyright_holder: false,
    original_work: false,
  })
  const [_submissionId, setSubmissionId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [verificationScore, setVerificationScore] = useState<number | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.epub')) {
        setError('Please select an EPUB file')
        return
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File too large (max 50MB)')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('Please select a file')
      return
    }

    if (!attestations.author_attestation || !attestations.copyright_holder || !attestations.original_work) {
      setError('You must confirm all attestations')
      return
    }

    setStep('uploading')
    setError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)
      formDataToSend.append('title', formData.title)
      formDataToSend.append('author_name', formData.author_name)
      if (formData.description) formDataToSend.append('description', formData.description)
      if (formData.genres) formDataToSend.append('genres', formData.genres)
      if (formData.isbn) formDataToSend.append('isbn', formData.isbn)
      formDataToSend.append('author_attestation', 'true')
      formDataToSend.append('copyright_holder', 'true')
      formDataToSend.append('original_work', 'true')

      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/epub-uploads/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Upload failed')
      }

      const result = await response.json()
      setSubmissionId(result.id)
      setStep('verifying')

      // Poll for verification results
      pollVerification(result.id)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setStep('error')
    }
  }

  const pollVerification = async (id: number) => {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes (5 second intervals)

    const poll = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`${API_URL}/api/v1/epub-uploads/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const submission = await response.json()
          
          if (submission.status !== 'pending' && submission.status !== 'verifying') {
            // Verification complete
            setVerificationScore(submission.verification_score)
            
            if (submission.status === 'verified' || submission.status === 'approved') {
              setStep('success')
            } else if (submission.status === 'needs_review') {
              setStep('success') // Show success with review notice
            } else {
              setError('Content verification failed. Please check the requirements.')
              setStep('error')
            }
            return
          }
        }

        // Continue polling
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setError('Verification is taking longer than expected. Check back later.')
          setStep('error')
        }
      } catch (err) {
        console.error('Polling error:', err)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        }
      }
    }

    poll()
  }

  const resetForm = () => {
    setStep('form')
    setFile(null)
    setFormData({
      title: '',
      author_name: '',
      description: '',
      genres: '',
      isbn: '',
    })
    setAttestations({
      author_attestation: false,
      copyright_holder: false,
      original_work: false,
    })
    setError('')
    setSubmissionId(null)
    setVerificationScore(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 pb-8">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => window.location.href = '/bookshelf'}
            className="text-white/80 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back to Bookshelf
          </button>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Upload className="w-10 h-10" />
            Upload Your Book
          </h1>
          <p className="text-indigo-100">Share your self-published work with the community</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          <div className={`flex items-center gap-2 ${step === 'form' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'form' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="font-medium">Upload Details</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-4"></div>
          <div className={`flex items-center gap-2 ${
            step === 'uploading' || step === 'verifying' ? 'text-indigo-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'uploading' || step === 'verifying' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="font-medium">Verification</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-4"></div>
          <div className={`flex items-center gap-2 ${
            step === 'success' ? 'text-green-600' : step === 'error' ? 'text-red-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'success' ? 'bg-green-600 text-white' : 
              step === 'error' ? 'bg-red-600 text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="font-medium">Complete</span>
          </div>
        </div>

        {/* Form Step */}
        {step === 'form' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EPUB File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
                  <input
                    type="file"
                    accept=".epub"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">Click to upload EPUB</p>
                        <p className="text-sm text-gray-500 mt-1">Max file size: 50MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Book Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author Name *
                  </label>
                  <input
                    type="text"
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Tell readers about your book..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Genres (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.genres}
                    onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Fiction, Mystery, Thriller"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ISBN (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="978-3-16-148410-0"
                  />
                </div>
              </div>

              {/* Attestations */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Shield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Author Verification Required</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Please confirm the following statements. Your book will be verified for plagiarism, AI content, and quality.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attestations.author_attestation}
                      onChange={(e) => setAttestations({ ...attestations, author_attestation: e.target.checked })}
                      className="mt-1 w-4 h-4 text-indigo-600"
                      required
                    />
                    <span className="text-sm text-gray-700">
                      I confirm that I am the author of this work
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attestations.copyright_holder}
                      onChange={(e) => setAttestations({ ...attestations, copyright_holder: e.target.checked })}
                      className="mt-1 w-4 h-4 text-indigo-600"
                      required
                    />
                    <span className="text-sm text-gray-700">
                      I confirm that I hold the copyright to this work
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attestations.original_work}
                      onChange={(e) => setAttestations({ ...attestations, original_work: e.target.checked })}
                      className="mt-1 w-4 h-4 text-indigo-600"
                      required
                    />
                    <span className="text-sm text-gray-700">
                      I confirm that this is my original work and not plagiarized
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || !formData.title || !formData.author_name}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Upload and Verify
              </button>
            </form>
          </div>
        )}

        {/* Uploading/Verifying Step */}
        {(step === 'uploading' || step === 'verifying') && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 'uploading' ? 'Uploading your book...' : 'Verifying content...'}
            </h2>
            <p className="text-gray-600 mb-6">
              {step === 'uploading' 
                ? 'Please wait while we upload your EPUB file'
                : 'Running AI-powered verification checks for plagiarism, AI content, and quality'
              }
            </p>
            <div className="max-w-md mx-auto">
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Plagiarism detection
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  AI content analysis
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Quality assessment
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Copyright verification
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Upload Successful!
            </h2>
            {verificationScore !== null && (
              <p className="text-lg text-gray-600 mb-6">
                Verification Score: {verificationScore.toFixed(0)}/100
              </p>
            )}
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {verificationScore && verificationScore >= 80
                ? 'Your book passed all verification checks and has been approved!'
                : 'Your book has been submitted for manual review by our moderators. We\'ll notify you once it\'s approved.'
              }
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                Upload Another Book
              </button>
              <button
                onClick={() => window.location.href = '/bookshelf'}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Go to Bookshelf
              </button>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Upload Failed
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
