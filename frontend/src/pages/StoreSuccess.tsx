import { useEffect, useState } from 'react'
import { CheckCircle, BookOpen, Home } from 'lucide-react'

export default function StoreSuccess() {
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    // Get session ID from URL
    const params = new URLSearchParams(window.location.search)
    const id = params.get('session_id')
    if (id) {
      setSessionId(id)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 rounded-full p-6">
            <CheckCircle className="w-20 h-20 text-green-600" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Purchase Successful!
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Your book has been added to your bookshelf. Start reading instantly!
        </p>

        {/* Session ID (for debugging) */}
        {sessionId && (
          <p className="text-sm text-gray-400 mb-8">
            Order ID: {sessionId.substring(0, 20)}...
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/bookshelf'}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <BookOpen className="w-5 h-5" />
            Go to My Bookshelf
          </button>

          <button
            onClick={() => window.location.href = '/store'}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-all duration-300"
          >
            <Home className="w-5 h-5" />
            Continue Shopping
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">What happens next?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div>
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto md:mx-0">
                <span className="text-purple-600 font-bold text-lg">1</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Added to Bookshelf</h4>
              <p className="text-sm text-gray-600">Your book is now available in your personal bookshelf</p>
            </div>

            <div>
              <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto md:mx-0">
                <span className="text-pink-600 font-bold text-lg">2</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Start Reading</h4>
              <p className="text-sm text-gray-600">Open the book and start reading in our beautiful EPUB reader</p>
            </div>

            <div>
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto md:mx-0">
                <span className="text-blue-600 font-bold text-lg">3</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Sync Everywhere</h4>
              <p className="text-sm text-gray-600">Your progress syncs across all your devices automatically</p>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Need help? <a href="/support" className="text-purple-600 hover:underline">Contact support</a></p>
        </div>
      </div>
    </div>
  )
}
