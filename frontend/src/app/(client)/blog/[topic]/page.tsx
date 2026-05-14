import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import api from '@/services/api'
import { blogPostPathFromSlugs } from '@/lib/client-paths'
import { resolveMediaUrl } from '@/lib/media-url'

interface Props {
  params: Promise<{ topic: string }>
}

async function getTopic(slug: string) {
  try {
    const res = await api.get(`/post-topics/${slug}`)
    return res.data?.data ?? res.data
  } catch { return null }
}

async function getPostsByTopic(topicId: number) {
  try {
    const res = await api.get('/posts', { params: { topic_id: topicId, status: 'published', per_page: 20 } })
    return res.data?.data ?? []
  } catch { return [] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: slug } = await params
  const topic = await getTopic(slug)
  if (!topic) return { title: 'Chủ đề | HDG Food' }
  return {
    title: topic.meta_title ?? `${topic.name} | HDG Food Blog`,
    description: topic.meta_description ?? topic.description ?? `Bài viết về ${topic.name}`,
  }
}

export default async function TopicPage({ params }: Props) {
  const { topic: slug } = await params
  const topic = await getTopic(slug)
  if (!topic) notFound()

  const posts = await getPostsByTopic(topic.id)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-400 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-[#ed2a2a]">Trang chủ</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-[#ed2a2a]">Blog</Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">{topic.name}</span>
      </nav>

      {/* Topic header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">{topic.name}</h1>
        {topic.description && <p className="text-slate-500">{topic.description}</p>}
        <p className="text-sm text-slate-400 mt-2">{posts.length} bài viết</p>
      </div>

      {/* Posts grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: any) => {
            const thumbUrl = resolveMediaUrl(post.thumbnail)
            return (
            <Link key={post.id} href={blogPostPathFromSlugs(post.slug, slug)}
              className="group block rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
              <div className="aspect-video overflow-hidden bg-slate-100">
                {thumbUrl
                  ? <img src={thumbUrl} alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">📝</div>
                }
              </div>
              <div className="p-5">
                <h2 className="font-black text-slate-800 mb-2 line-clamp-2 group-hover:text-[#ed2a2a] transition-colors">
                  {post.title}
                </h2>
                {post.meta_description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{post.meta_description}</p>
                )}
                <p className="text-xs text-slate-400 mt-3">
                  {new Date(post.published_at ?? post.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <p>Chưa có bài viết nào trong chủ đề này.</p>
          <Link href="/blog" className="mt-4 inline-block text-[#ed2a2a] font-bold hover:underline">
            Xem tất cả bài viết →
          </Link>
        </div>
      )}
    </div>
  )
}
