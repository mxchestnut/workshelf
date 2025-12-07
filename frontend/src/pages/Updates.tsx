import { ArrowLeft, Calendar, User as UserIcon } from 'lucide-react'
import { Navigation } from '../components/Navigation'
import { useState, useEffect } from 'react'
import { authService } from '../services/auth'

/**
 * Blog Post Interface
 */
interface BlogPost {
  id: string
  title: string
  date: string
  author: string
  content: string
  excerpt: string
}

/**
 * Site Updates / Blog Feed
 * Shows announcements and updates about the WorkShelf platform
 */
export default function Updates() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const handleLogin = () => {
    authService.login()
  }

  const handleLogout = () => {
    authService.logout()
  }

  const posts: BlogPost[] = [
    {
      id: '1',
      title: 'Hello Creative Universe! 👋',
      date: 'December 7, 2025',
      author: 'Kit (WorkShelf Team)',
      excerpt: 'Welcome to WorkShelf - a creative writing platform built by writers, for writers.',
      content: `
# Hello Creative Universe! 👋

Welcome to **WorkShelf** - your new home for creative writing, collaboration, and community.

## What is WorkShelf?

WorkShelf is a platform designed from the ground up for writers. Whether you're working on your first novel, collaborating with beta readers, or building a community around your work, WorkShelf is here to help.

## What We're Building

- **Studio Workspace**: Your personal writing environment with projects, documents, and organization tools
- **Collaboration**: Work with beta readers, editors, and co-authors in real-time
- **Community**: Connect with other writers, join groups, and share your work
- **Publishing**: Share your finished work with readers and build your audience

## Our Philosophy

We believe in:
- **Writers first**: Every feature is designed with writers' needs in mind
- **Privacy**: Your work is yours - we'll never claim rights to what you create
- **Community**: Great writing happens when creative minds come together
- **Simplicity**: Powerful tools that don't get in your way

## What's Next?

We're just getting started. Over the coming weeks and months, we'll be adding:
- Enhanced collaboration features
- Better document organization
- Community features
- Publishing tools
- And much more based on YOUR feedback

## Join Us

This is more than just a platform - it's a community. We want to hear from you:
- What features do you need?
- What's working well?
- What could be better?

Drop us a line at hello@workshelf.dev or join the conversation in our community groups.

Here's to your next great story! 📖✨

— Kit & the WorkShelf Team
      `
    },
    {
      id: '2',
      title: '⚠️ Beta Status & Data Safety',
      date: 'December 7, 2025',
      author: 'Kit (WorkShelf Team)',
      excerpt: 'Important information about beta status and protecting your work.',
      content: `
# ⚠️ Beta Status & Data Safety

## We're in Beta!

WorkShelf is currently in **beta testing**. This means we're actively building, testing, and improving the platform. While we're working hard to make everything stable and reliable, there are a few important things you should know.

## Protect Your Work

**IMPORTANT**: While in beta, please take these precautions:

### 1. Back Up Your Data
- **Keep copies of your work elsewhere** (Google Docs, Dropbox, local files, etc.)
- Don't rely solely on WorkShelf for your only copy
- We're implementing robust backup systems, but until we're out of beta, please maintain your own backups

### 2. Don't Reuse Passwords
- **Use a unique password** for WorkShelf
- Don't use the same password you use for other services
- Consider using a password manager (1Password, LastPass, Bitwarden, etc.)

### 3. Expect Changes
- Features may change or evolve
- We may need to reset data during major updates
- Your feedback helps us improve!

## What We're Doing

Behind the scenes, we're working on:

### Database Protection
- ✅ Separated document storage from database (now using S3)
- ✅ Implemented database safety procedures
- ✅ Set up staging environment for testing
- 🔄 Working on automated backups
- 🔄 Testing disaster recovery procedures

### Security
- ✅ Keycloak authentication
- ✅ Encrypted connections (HTTPS)
- ✅ Secure password storage
- 🔄 Two-factor authentication (coming soon)
- 🔄 Enhanced privacy controls

### Stability
- ✅ Error tracking with Sentry
- ✅ Performance monitoring
- 🔄 Load testing
- 🔄 Automated testing suite

## When Will We Leave Beta?

We'll move out of beta when:
1. ✅ Core features are stable
2. ✅ Database protection is in place
3. 🔄 Disaster recovery is tested
4. 🔄 Security audit is complete
5. 🔄 Performance is optimized
6. 🔄 Documentation is complete

**Current Progress**: 50% complete

## Your Feedback Matters

Found a bug? Have a suggestion? We want to hear from you!

- **Email**: support@workshelf.dev
- **Report bugs**: Use the feedback button in the app
- **Community**: Join our discussion groups

## Thank You!

Thank you for being an early adopter and helping us build something great. Your feedback and patience during beta is invaluable.

We're committed to making WorkShelf the best writing platform out there, and we're doing it with your help.

Stay creative! ✍️

— Kit & the WorkShelf Team

---

**Last Updated**: December 7, 2025
      `
    }
  ]

  const handleBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} currentPage="updates" />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl mb-20">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Site Updates
          </h1>
          <p className="text-muted-foreground">
            Latest news, announcements, and updates from the WorkShelf team
          </p>
        </div>

        {/* Blog Posts */}
        <div className="space-y-12">
          {posts.map((post) => (
            <article 
              key={post.id}
              className="bg-card border border-border rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Post Header */}
              <header className="mb-6">
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  {post.title}
                </h2>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <time dateTime={post.date}>{post.date}</time>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span>{post.author}</span>
                  </div>
                </div>
              </header>

              {/* Post Content */}
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {post.content.split('\n').map((line, idx) => {
                  // Handle markdown-style formatting
                  if (line.startsWith('# ')) {
                    return <h1 key={idx} className="text-3xl font-bold mt-8 mb-4">{line.slice(2)}</h1>
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={idx} className="text-2xl font-bold mt-6 mb-3">{line.slice(3)}</h2>
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={idx} className="text-xl font-bold mt-4 mb-2">{line.slice(4)}</h3>
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <li key={idx} className="ml-6 mb-1">
                        {line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/✅/g, '✅ ').replace(/🔄/g, '🔄 ')}
                      </li>
                    )
                  }
                  if (line.startsWith('---')) {
                    return <hr key={idx} className="my-8 border-border" />
                  }
                  if (line.trim() === '') {
                    return <br key={idx} />
                  }
                  
                  // Regular paragraph with bold/emoji support
                  const formatted = line
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  
                  return (
                    <p 
                      key={idx} 
                      className="mb-3 text-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatted }}
                    />
                  )
                })}
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-muted-foreground text-sm">
          <p>Check back for more updates as we continue building WorkShelf!</p>
        </div>
      </main>
    </div>
  )
}
