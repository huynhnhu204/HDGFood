import { Metadata } from 'next'
import Link from 'next/link'
import api from '@/services/api'
import { blogPostPublicPath, blogTopicListingPath } from '@/lib/client-paths'
import { resolveMediaUrl } from '@/lib/media-url'
import BlogGrid from './BlogGrid'
export const metadata: Metadata = {
  title: 'Blog & Tin tức | HDG Food',
  description: 'Cập nhật tin khuyến mãi, thông báo hệ thống và các thông tin mới nhất từ website HDG Food.',
}

async function getPosts() {
  try {
    const res = await api.get('/posts', { params: { status: 'published', per_page: 12 } })
    return res.data?.data ?? []
  } catch { return [] }
}

async function getTopics() {
  try {
    const res = await api.get('/post-topics', { params: { status: 'active' } })
    return res.data?.data ?? []
  } catch { return [] }
}

export default async function BlogPage() {
  const [posts, topics] = await Promise.all([getPosts(), getTopics()])
  const featured = posts.find((p: any) => p.is_featured) ?? posts[0]
  const rest = posts.filter((p: any) => p.id !== featured?.id)
  const featuredThumb = resolveMediaUrl(featured?.thumbnail)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="border-b border-slate-100 py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-2">
            <Link href="/" className="hover:text-[#ed2a2a] transition-colors">Trang chủ</Link>
            <span>/</span>
            <span className="text-slate-600">Blog</span>
          </nav>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-3">Blog & Tin tức</h1>
          <p className="text-slate-500 text-lg">Cập nhật khuyến mãi, thông báo và các bản tin mới từ HDG Food</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Topic pills */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <Link href="/blog"
              className="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-bold transition-all">
              Tất cả
            </Link>
            {topics.map((t: any) => (
              <Link key={t.id} href={blogTopicListingPath(t.slug)}
                className="px-5 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all">
                {t.name}
              </Link>
            ))}
          </div>
        )}

        {/* Featured post */}
        {featured && (
          <Link href={blogPostPublicPath(featured)}
            className="group block mb-14 rounded-3xl overflow-hidden bg-slate-50 hover:shadow-2xl transition-all duration-500">
            <div className="grid md:grid-cols-5">
              <div className="md:col-span-3 aspect-video md:aspect-auto overflow-hidden">
                {featuredThumb
                  ? <img src={featuredThumb} alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  : <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-6xl">🍽️</div>
                }
              </div>
              <div className="md:col-span-2 p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  {featured.topic && (
                    <span className="text-[10px] font-black text-[#ed2a2a] uppercase tracking-[0.2em] bg-red-50 px-3 py-1 rounded-full">
                      {featured.topic.name}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nổi bật</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-4 group-hover:text-[#ed2a2a] transition-colors duration-300">
                  {featured.title}
                </h2>
                {featured.meta_description && (
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6">{featured.meta_description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{new Date(featured.published_at ?? featured.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  <span>·</span>
                  <span>{Math.ceil((featured.content?.split(' ').length ?? 300) / 200)} phút đọc</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Grid with animation */}
        <BlogGrid posts={rest} />
      </div>
    </div>
  )
}
