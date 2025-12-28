import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ToastContainer } from './components/Toast'
import BetaBanner from './components/BetaBanner'
import ChatBar from './components/ChatBar'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { trackPageView } from './matomo'

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-foreground" />
      <p className="text-foreground">Loading...</p>
    </div>
  </div>
)

// Lazy load ALL pages
const Home = lazy(() => import('./pages/Home'))
const Feed = lazy(() => import('./pages/Feed').then(module => ({ default: module.Feed })))
const Discover = lazy(() => import('./pages/Discover').then(module => ({ default: module.Discover })))
const Groups = lazy(() => import('./pages/Groups'))
const GroupDetail = lazy(() => import('./pages/GroupDetail'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const GroupSettings = lazy(() => import('./pages/GroupSettings'))
const GroupRoles = lazy(() => import('./pages/GroupRoles'))
const Studio = lazy(() => import('./pages/StudioV2').then(module => ({ default: module.default })))
const StudioSettings = lazy(() => import('./pages/StudioSettings').then(module => ({ default: module.default })))
const Projects = lazy(() => import('./pages/Projects').then(module => ({ default: module.Projects })))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(module => ({ default: module.ProjectDetail })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })))
const ManageUsers = lazy(() => import('./pages/staff/ManageUsers').then(module => ({ default: module.ManageUsers })))
const ViewAllGroups = lazy(() => import('./pages/staff/ViewAllGroups').then(module => ({ default: module.ViewAllGroups })))
const GlobalModeration = lazy(() => import('./pages/staff/GlobalModeration').then(module => ({ default: module.GlobalModeration })))
const SystemSettings = lazy(() => import('./pages/staff/SystemSettings').then(module => ({ default: module.SystemSettings })))
const StoreAnalytics = lazy(() => import('./pages/staff/StoreAnalytics').then(module => ({ default: module.StoreAnalytics })))
const Documents = lazy(() => import('./pages/Documents'))
const Document = lazy(() => import('./pages/Document').then(module => ({ default: module.Document })))
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))
const Vault = lazy(() => import('./pages/Vault'))
const Authors = lazy(() => import('./pages/Authors'))
const Author = lazy(() => import('./pages/Author'))
const FreeBooks = lazy(() => import('./pages/FreeBooks'))
const UploadBook = lazy(() => import('./pages/UploadBook'))
const Store = lazy(() => import('./pages/Store'))
const StoreSuccess = lazy(() => import('./pages/StoreSuccess'))
const BookDetail = lazy(() => import('./pages/BookDetail'))
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(module => ({ default: module.AuthCallback })))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const HouseRules = lazy(() => import('./pages/HouseRules'))
const DeleteAccount = lazy(() => import('./pages/DeleteAccount'))
const Trash = lazy(() => import('./pages/Trash'))
const Sitemap = lazy(() => import('./pages/Sitemap').then(module => ({ default: module.Sitemap })))
const TagDiscovery = lazy(() => import('./pages/TagDiscovery').then(module => ({ default: module.TagDiscovery })))
const AdminModeration = lazy(() => import('./pages/AdminModeration'))
const GroupAdmin = lazy(() => import('./pages/GroupAdmin'))
const BetaFeed = lazy(() => import('./pages/BetaFeed'))
const MyBetaProfile = lazy(() => import('./pages/MyBetaProfile'))
const BetaMarketplace = lazy(() => import('./pages/BetaMarketplace'))
const BetaProfileView = lazy(() => import('./pages/BetaProfileView'))
const BetaRequest = lazy(() => import('./pages/BetaRequest'))
const MyBetaRequests = lazy(() => import('./pages/MyBetaRequests'))
const Invite = lazy(() => import('./pages/Invite'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const ContentIntegrity = lazy(() => import('./pages/ContentIntegrity').then(module => ({ default: module.ContentIntegrity })))
const AIAssistance = lazy(() => import('./pages/AIAssistance').then(module => ({ default: module.AIAssistance })))
const ExportCenter = lazy(() => import('./pages/ExportCenter').then(module => ({ default: module.ExportCenter })))
const AccessibilitySettings = lazy(() => import('./pages/AccessibilitySettings').then(module => ({ default: module.AccessibilitySettings })))
const AdvancedSearch = lazy(() => import('./pages/AdvancedSearch').then(module => ({ default: module.AdvancedSearch })))
const BookSuggestions = lazy(() => import('./pages/BookSuggestions').then(module => ({ default: module.BookSuggestions })))
const Messages = lazy(() => import('./pages/Messages'))
const AIPolicy = lazy(() => import('./pages/AIPolicy'))
const Relationships = lazy(() => import('./pages/Relationships'))
const CreatorEarnings = lazy(() => import('./pages/CreatorEarnings'))
const ReadingListsBrowse = lazy(() => import('./pages/ReadingListsBrowse'))
const StaffPanel = lazy(() => import('./pages/StaffPanel').then(module => ({ default: module.StaffPanel })))
const ReadPage = lazy(() => import('./pages/ReadPage'))

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return <PageLoader />
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

function AppContent() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    // Track page views
    trackPageView(location.pathname)
  }, [location.pathname])

  // Check admin subdomain redirects
  useEffect(() => {
    const hostname = window.location.hostname
    const isAdminSubdomain = hostname === 'admin.nerdchurchpartners.org' || hostname === 'admin.localhost'

    if (isAdminSubdomain && location.pathname === '/') {
      if (isAuthenticated) {
        window.location.href = '/admin'
      } else {
        window.location.href = 'https://nerdchurchpartners.org/'
      }
    }
  }, [location.pathname, isAuthenticated])

  return (
    <>
      <ToastContainer />
      <BetaBanner />
      
      <div className="min-h-screen bg-background">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/callback" element={<AuthCallback />} />
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/legal/rules" element={<HouseRules />} />
            <Route path="/sitemap" element={<Sitemap />} />
            <Route path="/overview" element={<Sitemap />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            
            {/* Groups - partially public */}
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:slug" element={<GroupDetail />} />
            <Route path="/groups/:slug/posts/:postId" element={<PostDetail />} />
            <Route path="/groups/:slug/roles" element={<ProtectedRoute><GroupRoles /></ProtectedRoute>} />
            <Route path="/group/:slug/admin" element={<ProtectedRoute><GroupAdmin /></ProtectedRoute>} />
            
            {/* Invites */}
            <Route path="/invite/:code" element={<Invite />} />
            
            {/* Protected routes */}
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/tags" element={<ProtectedRoute><TagDiscovery /></ProtectedRoute>} />
            
            {/* Group management */}
            <Route path="/group-settings" element={<ProtectedRoute><GroupSettings /></ProtectedRoute>} />
            
            {/* Profile */}
            <Route path="/me" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<BetaProfileView />} />
            <Route path="/users/:username" element={<PublicProfile />} />
            
            {/* Studio */}
            <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
            <Route path="/studio/:projectId/settings" element={<ProtectedRoute><StudioSettings /></ProtectedRoute>} />
            
            {/* Projects */}
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/project/:projectId" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            
            {/* Dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Admin/Staff */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/moderation" element={<ProtectedRoute><AdminModeration /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><StaffPanel /></ProtectedRoute>} />
            <Route path="/staff/users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
            <Route path="/staff/groups" element={<ProtectedRoute><ViewAllGroups /></ProtectedRoute>} />
            <Route path="/staff/moderation" element={<ProtectedRoute><GlobalModeration /></ProtectedRoute>} />
            <Route path="/staff/settings" element={<ProtectedRoute><SystemSettings /></ProtectedRoute>} />
            <Route path="/staff/store" element={<ProtectedRoute><StoreAnalytics /></ProtectedRoute>} />
            
            {/* Documents */}
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/document/:documentId" element={<ProtectedRoute><Document /></ProtectedRoute>} />
            <Route path="/document" element={<ProtectedRoute><Document /></ProtectedRoute>} />
            
            {/* Books/Store */}
            <Route path="/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
            <Route path="/authors" element={<Authors />} />
            <Route path="/authors/:authorId" element={<Author />} />
            <Route path="/free-books" element={<FreeBooks />} />
            <Route path="/upload-book" element={<ProtectedRoute><UploadBook /></ProtectedRoute>} />
            <Route path="/store" element={<Store />} />
            <Route path="/store/success" element={<ProtectedRoute><StoreSuccess /></ProtectedRoute>} />
            <Route path="/book/:bookId" element={<BookDetail />} />
            <Route path="/read/:bookId" element={<ProtectedRoute><ReadPage /></ProtectedRoute>} />
            
            {/* Beta */}
            <Route path="/beta-feed" element={<ProtectedRoute><BetaFeed /></ProtectedRoute>} />
            <Route path="/my-beta-profile" element={<ProtectedRoute><MyBetaProfile /></ProtectedRoute>} />
            <Route path="/beta-marketplace" element={<ProtectedRoute><BetaMarketplace /></ProtectedRoute>} />
            <Route path="/beta-request/:requestId" element={<ProtectedRoute><BetaRequest /></ProtectedRoute>} />
            <Route path="/my-beta-requests" element={<ProtectedRoute><MyBetaRequests /></ProtectedRoute>} />
            
            {/* Settings/Utilities */}
            <Route path="/content-integrity" element={<ProtectedRoute><ContentIntegrity /></ProtectedRoute>} />
            <Route path="/ai-assistance" element={<ProtectedRoute><AIAssistance /></ProtectedRoute>} />
            <Route path="/export-center" element={<ProtectedRoute><ExportCenter /></ProtectedRoute>} />
            <Route path="/accessibility" element={<ProtectedRoute><AccessibilitySettings /></ProtectedRoute>} />
            <Route path="/advanced-search" element={<ProtectedRoute><AdvancedSearch /></ProtectedRoute>} />
            <Route path="/book-suggestions" element={<ProtectedRoute><BookSuggestions /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/relationships" element={<ProtectedRoute><Relationships /></ProtectedRoute>} />
            <Route path="/creator-earnings" element={<ProtectedRoute><CreatorEarnings /></ProtectedRoute>} />
            <Route path="/reading-lists" element={<ProtectedRoute><ReadingListsBrowse /></ProtectedRoute>} />
            <Route path="/delete-account" element={<ProtectedRoute><DeleteAccount /></ProtectedRoute>} />
            <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
            
            {/* Legal */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/ai-policy" element={<AIPolicy />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      
      {/* Only show ChatBar when user is authenticated */}
      {isAuthenticated && <ChatBar />}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
