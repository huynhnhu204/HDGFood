'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronRight, ArrowRight, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import api from '@/services/api'
import { blogPostPublicPath } from '@/lib/client-paths'
import { resolveMediaUrl } from '@/lib/media-url'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface Post {
  id: number
  title: string
  slug: string
  thumbnail: string
  content: string
  created_at: string
  topic?: { name: string; slug: string }
}

export default function BlogSection() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
       try {
          const response = await api.get('/posts?per_page=4')
          const data = response.data?.data || []
          setPosts(data)
       } catch (err) {
          console.error("[BlogSection] Fetch error:", err)
       } finally {
          setLoading(false)
       }
    }
    fetchPosts()
  }, [])

  if (loading) return <BlogSkeleton />
  if (posts.length === 0) return null

  // BlogPosting Schema for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "blogPost": posts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "image": resolveMediaUrl(post.thumbnail) ?? '',
      "datePublished": post.created_at,
      "url": `${typeof window !== 'undefined' ? window.location.origin : ''}${blogPostPublicPath(post)}`
    }))
  }

  return (
    <section className="py-20 md:py-32 bg-white">
      {/* SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4">
         
         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
               <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 text-[#ed2a2a] text-[10px] font-black uppercase tracking-widest rounded-full"
               >
                  <MessageSquare className="w-3.5 h-3.5" />
                  HDG Journal
               </motion.div>
               <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none uppercase italic">
                  Cẩm nang ẩm thực <br/> & Tin tức
               </h2>
               <p className="text-slate-400 font-bold max-w-xl">
                  Cập nhật những xu hướng ẩm thực mới nhất, bí quyết nấu ăn đỉnh cao và các chương trình ưu đãi đặc quyền cho tín đồ HDG Food.
               </p>
            </div>

            <Link 
              href="/blog" 
              className="group flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900 hover:text-[#ed2a2a] transition-colors"
            >
               Tất cả bài viết
               <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#ed2a2a] group-hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
               </div>
            </Link>
         </div>

         {/* Posts Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            {posts.map((post, idx) => (
               <PostCard key={post.id} post={post} delay={idx * 0.1} />
            ))}
         </div>

      </div>
    </section>
  )
}

function PostCard({ post, delay }: { post: Post; delay: number }) {
  const thumbUrl = resolveMediaUrl(post.thumbnail) ?? '/placeholder-thumb.png'

  // Simple excerpt from content (remove HTML tags if any)
  const excerpt = post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 100) : 'Khám phá ngay bài viết mới nhất...'

  return (
    <motion.div
       initial={{ opacity: 0, y: 20 }}
       whileInView={{ opacity: 1, y: 0 }}
       transition={{ delay }}
       viewport={{ once: true }}
       className="flex flex-col group"
    >
       {/* Thumbnail */}
       <Link href={blogPostPublicPath(post)} className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-6 block bg-slate-100 ring-1 ring-slate-100 group-hover:ring-[#ed2a2a]/20 transition-all">
          <img 
            src={thumbUrl} 
            alt={post.title} 
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 group-hover:brightness-90 transition-all duration-700 ease-out"
          />
          <div className="absolute top-4 left-4">
             <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                {post.topic?.name || 'Tin tức'}
             </span>
          </div>
       </Link>

       {/* Content */}
       <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <Calendar className="w-3 h-3" />
             {format(new Date(post.created_at), 'dd/MM/yyyy', { locale: vi })}
          </div>
          
          <Link href={blogPostPublicPath(post)}>
             <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight line-clamp-2 group-hover:text-[#ed2a2a] transition-all">
               {post.title}
             </h3>
          </Link>

          <p className="text-sm font-semibold text-slate-400 line-clamp-2 leading-relaxed">
             {excerpt}...
          </p>

          <Link 
            href={blogPostPublicPath(post)}
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#ed2a2a] group-hover:gap-4 transition-all"
          >
             Đọc tiếp
             <ChevronRight className="w-4 h-4" />
          </Link>
       </div>
    </motion.div>
  )
}

function BlogSkeleton() {
  return (
    <div className="py-32 container mx-auto px-4 space-y-16">
       <div className="flex justify-between items-end"><div className="space-y-4"><div className="w-64 h-10 bg-slate-100 rounded-xl"/><div className="w-32 h-4 bg-slate-50 rounded-lg"/></div><div className="w-40 h-10 bg-slate-100 rounded-full"/></div>
       <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[1,2,3,4].map(i => (
             <div key={i} className="space-y-6">
                <div className="aspect-[16/10] bg-slate-50 rounded-[2rem] animate-pulse"/>
                <div className="h-6 bg-slate-100 rounded-lg w-3/4"/>
                <div className="space-y-2"><div className="h-4 bg-slate-50 rounded w-full"/><div className="h-4 bg-slate-50 rounded w-5/6"/></div>
             </div>
          ))}
       </div>
    </div>
  )
}
