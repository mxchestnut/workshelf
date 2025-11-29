import { useState, useEffect, lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { ToastContainer } from './components/Toast'
import './App.css'
import { ChatManager } from './components/ChatManager'
import { ChatLauncher } from './components/ChatLauncher'
import { ChatBar } from './components/ChatBar'
import { authService } from './services/auth'

// Cache bust: 2025-11-09 14:00
// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-foreground" />
      <p className="text-foreground">Loading...</p>
    </div>
  </div>
)

// Lazy load ALL pages for optimal code splitting
const Home = lazy(() => import('./pages/Home'))
const Feed = lazy(() => import('./pages/Feed').then(module => ({ default: module.Feed })))
const Discover = lazy(() => import('./pages/Discover').then(module => ({ default: module.Discover })))
const Groups = lazy(() => import('./pages/Groups'))
const GroupDetail = lazy(() => import('./pages/GroupDetail'))
const Studio = lazy(() => import('./pages/StudioV2').then(module => ({ default: module.default })))
const Projects = lazy(() => import('./pages/Projects').then(module => ({ default: module.Projects })))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(module => ({ default: module.ProjectDetail })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })))
const ManageUsers = lazy(() => import('./pages/staff/ManageUsers').then(module => ({ default: module.ManageUsers })))
const ViewAllGroups = lazy(() => import('./pages/staff/ViewAllGroups').then(module => ({ default: module.ViewAllGroups })))
const GlobalModeration = lazy(() => import('./pages/staff/GlobalModeration').then(module => ({ default: module.GlobalModeration })))
const SystemSettings = lazy(() => import('./pages/staff/SystemSettings').then(module => ({ default: module.SystemSettings })))
const StoreAnalytics = lazy(() => import('./pages/staff/StoreAnalytics').then(module => ({ default: module.StoreAnalytics })))
const Documents = lazy(() => import('./pages/Documents').then(module => ({ default: module.Documents })))
const Document = lazy(() => import('./pages/Document').then(module => ({ default: module.Document })))
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))
const Bookshelf = lazy(() => import('./pages/Bookshelf'))
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
const HouseRules = lazy(() => import('./pages/HouseRules'))
const Sitemap = lazy(() => import('./pages/Sitemap').then(module => ({ default: module.Sitemap })))
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
const Messages = lazy(() => import('./pages/Messages').then(module => ({ default: module.Messages })))
const AIPolicy = lazy(() => import('./pages/AIPolicy'))
const Relationships = lazy(() => import('./pages/Relationships'))

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'feed' | 'discover' | 'groups' | 'group-detail' | 'profile' | 'studio' | 'projects' | 'project-detail' | 'dashboard' | 'admin' | 'staff' | 'staff-users' | 'staff-groups' | 'staff-moderation' | 'staff-settings' | 'staff-store' | 'documents' | 'document' | 'bookshelf' | 'authors' | 'author-profile' | 'free-books' | 'upload-book' | 'store' | 'store-success' | 'book-detail' | 'auth-callback' | 'onboarding' | 'terms' | 'rules' | 'public-profile' | 'admin-moderation' | 'group-admin' | 'beta-feed' | 'my-beta-profile' | 'beta-marketplace' | 'sitemap' | 'invite' | 'pending-approval' | 'content-integrity' | 'ai-assistance' | 'export-center' | 'accessibility' | 'advanced-search' | 'book-suggestions' | 'messages' | 'ai-policy' | 'relationships'>('home')

  useEffect(() => {
    // Check authentication and route
    const checkRoute = () => {
      const path = window.location.pathname
      const hostname = window.location.hostname
      const isAuthenticated = authService.isAuthenticated()

      // Check if we're on admin subdomain
      const isAdminSubdomain = hostname === 'admin.workshelf.dev' || hostname === 'admin.localhost'

      // If on admin subdomain and at root, redirect to /staff or /admin
      if (isAdminSubdomain && path === '/') {
        if (isAuthenticated) {
          // Check if user is staff - for now just redirect to admin dashboard
          window.location.href = '/admin'
          return
        } else {
          // Not authenticated on admin subdomain - redirect to main site
          window.location.href = 'https://workshelf.dev/'
          return
        }
      }

      // Public pages that don't require authentication
      const publicPaths = new Set<string>([
        '/', 
        '', 
        '/legal/terms', 
        '/legal/rules',
        '/sitemap',
        '/overview',
        '/pending-approval'
      ])
      
      // Always allowed (even when not authenticated)
      const alwaysAllowed = new Set<string>(['/callback'])

      // Check if current path or any parent path is public
      const isPublicPath = publicPaths.has(path) || 
                          path.startsWith('/invite/') || 
                          alwaysAllowed.has(path)

      if (!isAuthenticated && !isPublicPath) {
        // Redirect unauthenticated users to home for private routes
        if (path !== '/') {
          window.history.replaceState({}, '', '/')
        }
        setCurrentPage('home')
        return
      }
      
      // Removed approval redirect - unapproved users can browse public content
      // Staff approval is still required but doesn't block viewing
    
    if (path === '/callback') {
      setCurrentPage('auth-callback')
    } else if (path === '/onboarding') {
      setCurrentPage('onboarding')
    } else if (path === '/legal/terms') {
      setCurrentPage('terms')
    } else if (path === '/legal/rules') {
      setCurrentPage('rules')
    } else if (path === '/sitemap' || path === '/overview') {
      setCurrentPage('sitemap')
    } else if (path === '/feed') {
      setCurrentPage('feed')
    } else if (path === '/discover') {
      setCurrentPage('discover')
    } else if (path === '/groups') {
      setCurrentPage('groups')
    } else if (path === '/group') {
      setCurrentPage('group-detail')
    } else if (path === '/me') {
      setCurrentPage('profile')
    } else if (path === '/studio') {
      setCurrentPage('studio')
    } else if (path.startsWith('/project/')) {
      setCurrentPage('project-detail')
    } else if (path === '/projects') {
      setCurrentPage('projects')
    } else if (path === '/dashboard') {
      setCurrentPage('dashboard')
    } else if (path === '/admin') {
      setCurrentPage('admin')
    } else if (path === '/staff') {
      setCurrentPage('staff')
    } else if (path === '/staff/users') {
      setCurrentPage('staff-users')
    } else if (path === '/staff/groups') {
      setCurrentPage('staff-groups')
    } else if (path === '/staff/moderation') {
      setCurrentPage('staff-moderation')
    } else if (path === '/staff/settings') {
      setCurrentPage('staff-settings')
    } else if (path === '/staff/store') {
      setCurrentPage('staff-store')
    } else if (path === '/documents') {
      setCurrentPage('documents')
    } else if (path.startsWith('/document/')) {
      // Document editor page: /document/:id
      setCurrentPage('document')
    } else if (path === '/document') {
      setCurrentPage('document')
    } else if (path === '/bookshelf') {
      setCurrentPage('bookshelf')
    } else if (path === '/authors') {
      setCurrentPage('authors')
    } else if (path.startsWith('/authors/')) {
      // Author profile page: /authors/:id
      setCurrentPage('author-profile')
    } else if (path === '/admin/moderation') {
      setCurrentPage('admin-moderation')
    } else if (path.match(/^\/group\/[^/]+\/admin$/)) {
      // Group admin page: /group/:slug/admin
      setCurrentPage('group-admin')
    } else if (path === '/beta-feed') {
      setCurrentPage('beta-feed')
    } else if (path === '/my-beta-profile') {
      setCurrentPage('my-beta-profile')
    } else if (path === '/beta-marketplace') {
      setCurrentPage('beta-marketplace')
    } else if (path.match(/^\/profile\/\d+$/)) {
      // Beta profile viewer: /profile/:userId
      setCurrentPage('beta-profile')
    } else if (path.startsWith('/beta-request')) {
      setCurrentPage('beta-request')
    } else if (path === '/my-beta-requests') {
      setCurrentPage('my-beta-requests')
    } else if (path === '/free-books') {
      setCurrentPage('free-books')
    } else if (path === '/upload-book') {
      setCurrentPage('upload-book')
    } else if (path === '/store/success' || path === '/store/success/') {
      setCurrentPage('store-success')
    } else if (path === '/store' || path === '/store/') {
      setCurrentPage('store')
    } else if (path.startsWith('/book/')) {
      // Book detail page: /book/:id or /book/store-:id
      setCurrentPage('book-detail')
    } else if (path.startsWith('/invite/')) {
      // Invitation page: /invite/:token
      setCurrentPage('invite')
    } else if (path === '/pending-approval') {
      // Pending approval page
      setCurrentPage('pending-approval')
    } else if (path === '/content-integrity') {
      // Content integrity checking page
      setCurrentPage('content-integrity')
    } else if (path === '/ai-assistance') {
      // AI writing prompts and brainstorming tools
      setCurrentPage('ai-assistance')
    } else if (path === '/export-center') {
      // Export center for documents, data, and Matrix
      setCurrentPage('export-center')
    } else if (path === '/accessibility') {
      // Accessibility settings and WCAG checker
      setCurrentPage('accessibility')
    } else if (path === '/advanced-search') {
      // Advanced search page
      setCurrentPage('advanced-search')
    } else if (path === '/book-suggestions') {
      // Book suggestions page
      setCurrentPage('book-suggestions')
    } else if (path === '/messages') {
      setCurrentPage('messages')
    } else if (path === '/ai-policy') {
      // AI Policy and ethical use guidelines
      setCurrentPage('ai-policy')
    } else if (path === '/relationships') {
      setCurrentPage('relationships')
    } else if (path.startsWith('/users/')) {
      // Public profile: /users/:username
      setCurrentPage('public-profile')
    } else if (path === '/' || path === '') {
      setCurrentPage('home')
    } else {
      // Unknown route - redirect to home
      window.location.href = '/'
    }
    }
    
    // Run on mount
    checkRoute()
    
    // Listen for navigation events (back/forward buttons)
    window.addEventListener('popstate', checkRoute)
    
    return () => {
      window.removeEventListener('popstate', checkRoute)
    }
  }, [])

  const renderContent = () => {
    // Handle special pages
    if (currentPage === 'auth-callback') {
      return <AuthCallback />
    }
    
    if (currentPage === 'onboarding') {
      return <Onboarding />
    }
    
    if (currentPage === 'terms') {
      return <TermsOfService />
    }
    
    if (currentPage === 'rules') {
      return <HouseRules />
    }
    
    if (currentPage === 'sitemap') {
      return <Sitemap />
    }
    
    if (currentPage === 'invite') {
      return <Invite />
    }
    
    if (currentPage === 'pending-approval') {
      return <PendingApproval />
    }
    
    if (currentPage === 'feed') {
      return <Feed />
    }
    
    if (currentPage === 'discover') {
      return <Discover />
    }
    
    if (currentPage === 'groups') {
      return <Groups />
    }
    
    if (currentPage === 'group-detail') {
      return <GroupDetail />
    }
    
    if (currentPage === 'profile') {
      return <Profile />
    }
    
    if (currentPage === 'public-profile') {
      return <PublicProfile />
    }
    
    if (currentPage === 'studio') {
      return <Studio />
    }    if (currentPage === 'project-detail') {
      return <ProjectDetail />
    }
    
    if (currentPage === 'projects') {
      return <Projects />
    }
    
    if (currentPage === 'dashboard') {
      return <Dashboard />
    }
    
    if (currentPage === 'admin') {
      return <AdminDashboard />
    }
    
    if (currentPage === 'staff') {
      return <AdminDashboard embedded={false} />
    }
    
    if (currentPage === 'staff-users') {
      return <ManageUsers />
    }
    
    if (currentPage === 'staff-groups') {
      return <ViewAllGroups />
    }
    
    if (currentPage === 'staff-moderation') {
      return <GlobalModeration />
    }
    
    if (currentPage === 'staff-settings') {
      return <SystemSettings />
    }
    
    if (currentPage === 'staff-store') {
      return <StoreAnalytics />
    }
    
    if (currentPage === 'documents') {
      return <Documents />
    }
    
    if (currentPage === 'document') {
      return <Document />
    }
    
    if (currentPage === 'bookshelf') {
      return <Bookshelf />
    }

    if (currentPage === 'authors') {
      return <Authors />
    }

    if (currentPage === 'author-profile') {
      return <Author />
    }

    if (currentPage === 'admin-moderation') {
      return <AdminModeration />
    }

    if (currentPage === 'group-admin') {
      return <GroupAdmin />
    }

    if (currentPage === 'beta-feed') {
      return <BetaFeed />
    }

    if (currentPage === 'my-beta-profile') {
      return <MyBetaProfile />
    }

    if (currentPage === 'beta-marketplace') {
      return <BetaMarketplace />
    }
    
    if (currentPage === 'beta-profile') {
      return <BetaProfileView />
    }
    
    if (currentPage === 'beta-request') {
      return <BetaRequest />
    }
    
    if (currentPage === 'my-beta-requests') {
      return <MyBetaRequests />
    }

    if (currentPage === 'free-books') {
      return <FreeBooks />
    }

    if (currentPage === 'upload-book') {
      return <UploadBook />
    }

    if (currentPage === 'store') {
      return <Store />
    }

    if (currentPage === 'store-success') {
      return <StoreSuccess />
    }

    if (currentPage === 'book-detail') {
      return <BookDetail />
    }

    if (currentPage === 'content-integrity') {
      return <ContentIntegrity />
    }

    if (currentPage === 'ai-assistance') {
      return <AIAssistance />
    }

    if (currentPage === 'export-center') {
      return <ExportCenter />
    }

    if (currentPage === 'accessibility') {
      return <AccessibilitySettings />
    }

    if (currentPage === 'advanced-search') {
      return <AdvancedSearch />
    }

    if (currentPage === 'book-suggestions') {
      return <BookSuggestions />
    }
    if (currentPage === 'messages') {
      return <Messages />
    }
    if (currentPage === 'relationships') {
      return <Relationships />
    }
    if (currentPage === 'ai-policy') {
      return <AIPolicy />
    }

    // Home page - new dedicated landing page
    return <Home />
  }

  // All pages now have their own Navigation component
  // Wrap everything in Suspense for lazy loading
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        {renderContent()}
      </Suspense>
      {/* Global chat UI */}
      <ChatManager />
      <ChatLauncher />
      <ChatBar />
      <ToastContainer />
    </>
  )
}

export default App
