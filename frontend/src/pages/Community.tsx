import { 
  Users, 
  MessageCircle, 
  Heart, 
  Bookmark,
  UserPlus,
  TrendingUp
} from 'lucide-react'

interface Post {
  id: string
  author: string
  avatar: string
  content: string
  timeAgo: string
  likes: number
  comments: number
  bookmarks: number
}

export function Community() {
  const posts: Post[] = [
    {
      id: '1',
      author: 'Sarah Mitchell',
      avatar: 'SM',
      content: 'Just finished the first draft of my novel! 50,000 words in 30 days. The journey was intense but so rewarding. Huge thanks to everyone who cheered me on!',
      timeAgo: '2 hours ago',
      likes: 42,
      comments: 12,
      bookmarks: 8
    },
    {
      id: '2',
      author: 'James Chen',
      avatar: 'JC',
      content: 'Looking for beta readers for my sci-fi short story collection. If anyone is interested in space opera with a twist, DM me!',
      timeAgo: '5 hours ago',
      likes: 28,
      comments: 15,
      bookmarks: 5
    },
    {
      id: '3',
      author: 'Emma Rodriguez',
      avatar: 'ER',
      content: 'Hot take: The best writing happens when you stop trying to be perfect and just let the words flow. Edit later, create now.',
      timeAgo: '1 day ago',
      likes: 156,
      comments: 34,
      bookmarks: 23
    },
    {
      id: '4',
      author: 'Marcus Williams',
      avatar: 'MW',
      content: 'Starting a new writing group focused on fantasy world-building. Meeting every Tuesday at 7 PM EST. Comment below if you want to join!',
      timeAgo: '2 days ago',
      likes: 67,
      comments: 28,
      bookmarks: 19
    },
  ]

  const trendingTopics = [
  { name: 'NaNoWriMo', posts: 42 },
  { name: 'BetaReaders', posts: 38 },
  { name: 'WritingTips', posts: 31 },
  { name: 'Fantasy', posts: 27 },
  { name: 'Publishing', posts: 19 },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-neutral-light rounded-xl shadow-sm p-6">
          <textarea
            placeholder="Share your thoughts with the community..."
            className="w-full p-4 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-4">
            <button className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium">
              Post
            </button>
          </div>
        </div>

        {posts.map((post) => (
          <div key={post.id} className="bg-white border border-neutral-light rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                {post.avatar}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-neutral-darkest">{post.author}</h3>
                  <span className="text-sm text-neutral">• {post.timeAgo}</span>
                </div>
                
                <p className="text-neutral-dark mb-4">{post.content}</p>
                
                <div className="flex items-center gap-6 text-neutral">
                  <button className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-primary transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Bookmark className="w-5 h-5" />
                    <span className="text-sm">{post.bookmarks}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-neutral-light rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-neutral-darkest mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Suggested Connections
          </h3>
          
          <div className="space-y-4">
            {['Alex Turner', 'Lisa Park', 'David Brown'].map((name, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center font-semibold text-sm">
                    {name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-neutral-darkest text-sm">{name}</div>
                    <div className="text-xs text-neutral">Writer</div>
                  </div>
                </div>
                <button className="text-primary hover:bg-primary/10 px-3 py-1 rounded-lg text-sm font-medium">
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-light rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-neutral-darkest mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Trending Topics
          </h3>
          
          <div className="space-y-3">
            {trendingTopics.map((topic, i) => (
              <div key={i} className="hover:bg-neutral-light/50 p-2 rounded-lg cursor-pointer transition-colors">
                <div className="font-medium text-neutral-darkest">#{topic.name}</div>
                <div className="text-xs text-neutral">{topic.posts.toLocaleString()} posts</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-xl shadow-lg p-6">
          <Users className="w-8 h-8 opacity-80 mb-3" />
          <h3 className="font-bold mb-2">Join Writing Groups</h3>
          <p className="text-sm opacity-90 mb-4">Connect with writers who share your interests and goals.</p>
          <button className="bg-white text-primary hover:bg-white/90 px-4 py-2 rounded-lg font-medium text-sm w-full">
            Explore Groups
          </button>
        </div>
      </div>
    </div>
  )
}
