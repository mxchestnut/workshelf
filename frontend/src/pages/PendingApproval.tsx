import { Clock } from 'lucide-react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"

export default function PendingApproval() {
  const { login, logout } = useAuth()
  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={null} onLogin={() => login()} onLogout={handleLogout} />
      
      {/* Main content with left margin for sidebar */}
      <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#524944' }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#B34B0C' }}>
            <Clock className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">
            Registration Pending Approval
          </h1>
          
          <p className="text-lg mb-6" style={{ color: '#B3B2B0' }}>
            Thank you for registering! Workshelf is currently in beta, and all new accounts require staff approval.
          </p>
          
          <p className="mb-8" style={{ color: '#B3B2B0' }}>
            You'll receive an email once your account has been approved. This usually takes 1-2 business days.
          </p>
          
          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#37322E' }}>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>
              <strong className="text-white">Need immediate access?</strong><br />
              If you were invited by a beta tester, please contact them to expedite your approval.
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#B34B0C', color: 'white' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7C3306'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#B34B0C'}
          >
            Sign Out
          </button>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
