/**
 * Sitemap / Overview Page
 * Shows all available features and pages in the application
 */
import { 
  Home, 
  FileText, 
  BookMarked, 
  PenTool, 
  ShoppingBag, 
  Upload,
  UserCircle,
  Users,
  Shield,
  BookOpen,
  Heart,
  Star,
  TrendingUp,
  Award
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FeatureItem {
  name: string
  path: string
  description: string
  icon: LucideIcon
  status: string
  features?: string[]
  restricted?: string
}

export function Sitemap() {
  const features: Array<{
    category: string
    icon: LucideIcon
    color: string
    items: FeatureItem[]
  }> = [
    {
      category: "Core Features",
      icon: Home,
      color: "bg-indigo-100 text-indigo-700",
      items: [
        {
          name: "Feed",
          path: "/feed",
          description: "Your personalized content feed with posts, recommendations, and updates",
          icon: Home,
          status: "active"
        },
        {
          name: "Documents",
          path: "/documents",
          description: "Create and manage your writing documents with AI assistance",
          icon: FileText,
          status: "active"
        },
        {
          name: "Profile",
          path: "/me",
          description: "Your personal profile, stats, and achievements",
          icon: UserCircle,
          status: "active"
        }
      ]
    },
    {
      category: "Reading & Discovery",
      icon: BookOpen,
      color: "bg-blue-100 text-blue-700",
      items: [
        {
          name: "My Vault",
          path: "/vault",
          description: "Your personal collection of saved and purchased books",
          icon: BookMarked,
          status: "active"
        },
        {
          name: "Free Books",
          path: "/free-books",
          description: "Discover free books from Standard Ebooks and public domain",
          icon: BookOpen,
          status: "active"
        },
        {
          name: "Authors",
          path: "/authors",
          description: "Browse and follow your favorite authors",
          icon: PenTool,
          status: "active"
        }
      ]
    },
    {
      category: "Store & Publishing",
      icon: ShoppingBag,
      color: "bg-green-100 text-green-700",
      items: [
        {
          name: "Store",
          path: "/store",
          description: "Browse and purchase books from indie authors",
          icon: ShoppingBag,
          status: "active",
          features: [
            "Author earnings tracking",
            "Direct support to writers",
            "Stripe integration",
            "Instant downloads"
          ]
        },
        {
          name: "Upload Book",
          path: "/upload-book",
          description: "Submit your EPUB for sale or free distribution",
          icon: Upload,
          status: "active",
          features: [
            "EPUB validation",
            "Metadata extraction",
            "Moderation workflow",
            "Automated publishing"
          ]
        }
      ]
    },
    {
      category: "Community",
      icon: Users,
      color: "bg-purple-100 text-purple-700",
      items: [
        {
          name: "Public Profiles",
          path: "/users/:username",
          description: "View other users' public profiles and content",
          icon: UserCircle,
          status: "active"
        },
        {
          name: "Author Profiles",
          path: "/authors/:id",
          description: "Detailed author pages with books, bio, and stats",
          icon: PenTool,
          status: "active"
        },
        {
          name: "Groups",
          path: "/groups",
          description: "Writing groups and communities (coming soon)",
          icon: Users,
          status: "planned"
        }
      ]
    },
    {
      category: "Administration",
      icon: Shield,
      color: "bg-red-100 text-red-700",
      items: [
        {
          name: "EPUB Moderation",
          path: "/admin/moderation",
          description: "Review and moderate submitted books (staff only)",
          icon: Shield,
          status: "active",
          restricted: "Staff only"
        },
        {
          name: "Group Admin",
          path: "/group/:slug/admin",
          description: "Manage your writing groups",
          icon: Users,
          status: "planned",
          restricted: "Group owners"
        }
      ]
    }
  ]

  const backendFeatures = [
    {
      category: "Authentication & Security",
      items: [
        "Keycloak OAuth2/OIDC integration",
        "JWT token verification with JWKS",
        "Role-based access control (RBAC)",
        "Staff and moderator permissions",
        "Studio membership access control",
        "Document collaborator permissions"
      ]
    },
    {
      category: "Content Management",
      items: [
        "Document creation and editing",
        "Project organization",
        "Tag-based content warnings",
        "Include/exclude tag filtering",
        "Author tracking and following",
        "Vault management"
      ]
    },
    {
      category: "Store & Monetization",
      items: [
        "EPUB upload and validation",
        "Author earnings tracking",
        "Stripe Connect integration",
        "Payment processing",
        "Automatic metadata extraction",
        "Book recommendations"
      ]
    },
    {
      category: "AI & Analysis",
      items: [
        "Claude 4 Sonnet integration",
        "Writing assistance",
        "Content analysis",
        "AI-powered recommendations",
        "Template generation"
      ]
    }
  ]

  const navigateTo = (path: string) => {
    if (!path.includes(':')) {
      window.location.href = path
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Workshelf Platform Overview
          </h1>
          <p className="text-xl text-gray-600">
            A comprehensive platform for writers, readers, and indie publishers
          </p>
        </div>

        {/* Status Legend */}
        <div className="flex items-center justify-center gap-6 mb-12 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-gray-700">Planned</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-12">
          {features.map((section) => {
            const CategoryIcon = section.icon
            return (
              <div key={section.category} className="bg-white rounded-xl shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <CategoryIcon className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{section.category}</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon
                    const isClickable = item.status === 'active' && !item.path.includes(':')
                    
                    return (
                      <div
                        key={item.name}
                        onClick={() => isClickable && navigateTo(item.path)}
                        className={`border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-300 hover:shadow-md transition-all ${
                          isClickable ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <ItemIcon className="w-6 h-6 text-indigo-600" />
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${
                            item.status === 'active' ? 'bg-green-500' : 
                            item.status === 'progress' ? 'bg-yellow-500' : 
                            'bg-gray-400'
                          }`}></div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                        {item.restricted && (
                          <div className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full mb-3">
                            {item.restricted}
                          </div>
                        )}

                        {item.features && (
                          <ul className="space-y-1 mt-3">
                            {item.features.map((feature, idx) => (
                              <li key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}

                        {isClickable && (
                          <div className="mt-4 text-indigo-600 text-sm font-medium">
                            Visit →
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Backend Features */}
        <div className="mt-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">Backend Features & Integrations</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {backendFeatures.map((section) => (
              <div key={section.category}>
                <h3 className="text-lg font-semibold mb-4 text-indigo-300">{section.category}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2"></div>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-12 grid md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">20+</div>
            <div className="text-sm text-gray-600">Pages</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">5</div>
            <div className="text-sm text-gray-600">Security Fixes</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">100%</div>
            <div className="text-sm text-gray-600">Security Complete</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900">77%</div>
            <div className="text-sm text-gray-600">Overall Progress</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
