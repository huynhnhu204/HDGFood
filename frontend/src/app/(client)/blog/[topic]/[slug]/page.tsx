import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import api from '@/services/api'
import { blogPostPathFromSlugs, blogTopicListingPath, productPublicPath } from '@/lib/client-paths'
import { resolveMediaUrl } from '@/lib/media-url'
import PostContent from './PostContent'

interface Props { params: Promise<{ topic: string; slug: string }> }

async function getPost(slug: string) {
  try {
    const res = await api.get(`/posts/${slug}`)
    return res.data?.data ?? res.data
  } catch { return null }
}

async function getRelated(topicId: number, currentId: number) {
  try {
    const res = await api.get('/posts', { params: { topic_id: topicId, status: 'published', per_page: 5 } })
    return (res.data?.data ?? []).filter((p: any) => p.id !== currentId).slice(0, 3)
  } catch { return [] }
}

async function getTopProducts() {
  try {
    const res = await api.get('/products', { params: { sort: 'best_selling', limit: 4 } })
    return res.data?.data ?? []
  } catch { return [] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Bài viết | HDG Food' }
  const thumbnailUrl = resolveMediaUrl(post.thumbnail)
  return {
    title: post.meta_title ?? `${post.title} | HDG Food`,
    description: post.meta_description ?? post.title,
    openGraph: {
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? '',
      images: thumbnailUrl ? [thumbnailUrl] : [],
      type: 'article',
    },
  }
}

function readingTime(content?: string) {
  const words = content?.replace(/<[^>]*>/g, '').split(/\s+/).length ?? 300
  return Math.max(1, Math.ceil(words / 200))
}

export default async function PostDetailPage({ params }: Props) {
  const { topic: topicSlug, slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const [related, topProducts] = await Promise.all([
    post.topic_id ? getRelated(post.topic_id, post.id) : [],
    getTopProducts(),
  ])

  const mins = readingTime(post.content)
  const topicPathSlug = post.topic?.slug ?? topicSlug
  const thumbnailUrl = resolveMediaUrl(post.thumbnail)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: post.title, description: post.meta_description ?? '',
        image: thumbnailUrl ?? '',
        author: { '@type': 'Person', name: post.author?.name ?? 'HDG Food' },
        publisher: { '@type': 'Organization', name: 'HDG Food' },
        datePublished: post.published_at ?? post.created_at,
        dateModified: post.updated_at,
      })}} />

      <div className="min-h-screen bg-white">
        {/* Hero image */}
        {thumbnailUrl && (
          <div className="w-full aspect-[21/9] overflow-hidden bg-slate-100">
            <img src={thumbnailUrl} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <nav className="text-xs text-slate-400 mb-8 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-[#ed2a2a] transition-colors">Trang chủ</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#ed2a2a] transition-colors">Blog</Link>
            {post.topic && (
              <>
                <span>/</span>
                <Link href={blogTopicListingPath(topicPathSlug)} className="hover:text-[#ed2a2a] transition-colors">{post.topic.name}</Link>
              </>
            )}
            <span>/</span>
            <span className="text-slate-600 truncate max-w-[200px]">{post.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
            {/* Main content */}
            <main>
              {/* Category */}
              {post.topic && (
                <Link href={blogTopicListingPath(topicPathSlug)}
                  className="inline-block text-[10px] font-black text-[#ed2a2a] uppercase tracking-[0.2em] bg-red-50 px-4 py-1.5 rounded-full mb-5 hover:bg-red-100 transition-colors">
                  {post.topic.name}
                </Link>
              )}

              {/* Title */}
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                {post.title}
              </h1>

              {/* Meta bar */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 pb-6 mb-8 border-b border-slate-100">
                {post.author && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#ed2a2a] flex items-center justify-center text-white text-xs font-black">
                      {post.author.name[0]}
                    </div>
                    <span className="font-medium text-slate-600">{post.author.name}</span>
                  </div>
                )}
                <span>·</span>
                <span>{new Date(post.published_at ?? post.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {mins} phút đọc
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {post.view_count ?? 0} lượt xem
                </span>
              </div>

              {/* Article content */}
              <PostContent content={post.content ?? ''} />

              {/* Back */}
              <div className="mt-12 pt-8 border-t border-slate-100">
                <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#ed2a2a] transition-colors">
                  ← Quay lại Blog
                </Link>
              </div>
            </main>

            {/* Sidebar */}
            <aside className="space-y-8">
              {/* Related posts */}
              {related.length > 0 && (
                <div className="bg-slate-50 rounded-3xl p-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5">Bài viết liên quan</h3>
                  <div className="space-y-4">
                    {related.map((r: any) => {
                      const relatedThumbUrl = resolveMediaUrl(r.thumbnail)
                      return (
                      <Link key={r.id} href={blogPostPathFromSlugs(r.slug, topicPathSlug)}
                        className="group flex gap-3 items-start">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                          {relatedThumbUrl
                            ? <img src={relatedThumbUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            : <div className="w-full h-full flex items-center justify-center text-xl">📝</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 line-clamp-2 group-hover:text-[#ed2a2a] transition-colors leading-snug">
                            {r.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {Math.max(1, Math.ceil((r.content?.split(' ').length ?? 300) / 200))} phút đọc
                          </p>
                        </div>
                      </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Top products */}
              {topProducts.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5">🔥 Đang bán chạy</h3>
                  <div className="space-y-4">
                    {topProducts.map((p: any) => (
                      <Link key={p.id} href={productPublicPath(p.slug)}
                        className="group flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                          {p.image
                            ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 line-clamp-1 group-hover:text-[#ed2a2a] transition-colors">
                            {p.name}
                          </p>
                          <p className="text-sm font-black text-[#ed2a2a] mt-0.5">
                            {(p.final_price ?? p.price).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href="/products"
                    className="mt-5 block text-center py-2.5 bg-[#ed2a2a] text-white text-xs font-black rounded-2xl hover:bg-red-600 transition-colors">
                    Xem tất cả món ăn →
                  </Link>
                </div>
              )}

              {/* CTA */}
              <div className="bg-slate-900 rounded-3xl p-6 text-white text-center">
                <p className="text-2xl mb-2">🍽️</p>
                <h4 className="font-black text-lg mb-2">Đặt món ngay</h4>
                <p className="text-slate-400 text-xs mb-4">Thưởng thức ẩm thực HDG Food tại nhà</p>
                <Link href="/products"
                  className="block py-2.5 bg-[#ed2a2a] text-white text-xs font-black rounded-2xl hover:bg-red-600 transition-colors">
                  Xem thực đơn
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
