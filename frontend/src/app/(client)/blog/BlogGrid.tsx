'use client'

import Link from 'next/link'
import { blogPostPublicPath } from '@/lib/client-paths'
import { resolveMediaUrl } from '@/lib/media-url'
import { motion } from 'framer-motion'

function readingTime(content?: string) {
  const words = content?.replace(/<[^>]*>/g, '').split(/\s+/).length ?? 300
  return Math.max(1, Math.ceil(words / 200))
}

export default function BlogGrid({ posts }: { posts: any[] }) {
  if (!posts.length) return (
    <div className="text-center py-20 text-slate-400">
      <p className="text-lg font-medium">Chưa có bài viết nào.</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
        >
          <PostCard post={post} />
        </motion.div>
      ))}
    </div>
  )
}

function PostCard({ post }: { post: any }) {
  const href = blogPostPublicPath(post)
  const mins = readingTime(post.content)
  const thumbUrl = resolveMediaUrl(post.thumbnail)

  return (
    <Link href={href} className="group block h-full">
      <article className="h-full flex flex-col rounded-3xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-500 bg-white">
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
          {thumbUrl
            ? <img src={thumbUrl} alt={post.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
            : <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-slate-50 to-slate-100">🍽️</div>
          }
          {/* Category badge on image */}
          {post.topic && (
            <span className="absolute top-4 left-4 text-[10px] font-black text-white uppercase tracking-[0.15em] bg-[#ed2a2a]/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {post.topic.name}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-6">
          <h3 className="font-black text-slate-900 text-lg leading-snug mb-3 line-clamp-2 group-hover:text-[#ed2a2a] transition-colors duration-300">
            {post.title}
          </h3>
          {post.meta_description && (
            <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4 flex-1">
              {post.meta_description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50 mt-auto">
            <span>{new Date(post.published_at ?? post.created_at).toLocaleDateString('vi-VN')}</span>
            <div className="flex items-center gap-3">
              <span>👁 {post.view_count ?? 0}</span>
              <span>· {mins} phút đọc</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
