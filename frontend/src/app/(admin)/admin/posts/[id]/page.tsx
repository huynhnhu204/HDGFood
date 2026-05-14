'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Pencil, Loader2, Eye, Calendar, Tag,
  BookOpen, Star, Globe, Clock, User, FileText,
  AlertCircle, ChevronRight, ExternalLink, CheckCircle,
  XCircle, Image as ImageIcon, Type, Search,
} from 'lucide-react'
import { toast }            from 'sonner'
import { postService, type Post } from '@/services/post.service'
import Image                      from 'next/image'
import Link                       from 'next/link'
import { blogPostPublicPath }     from '@/lib/client-paths'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000'
const thumbUrl = (p?: string | null) =>
  p ? (p.startsWith('http') ? p : `${API_URL}/storage/${p}`) : null

const fmtDate = (s?: string | null) =>
  s
    ? new Date(s).toLocaleDateString('vi-VN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

/* ── SEO Audit helpers ── */
const seoAudit = (post: Post) => {
  const checks: { label: string; ok: boolean; detail: string }[] = []

  // Title length
  const titleLen = (post.meta_title || post.title || '').length
  checks.push({
    label: 'Độ dài tiêu đề',
    ok: titleLen >= 30 && titleLen <= 60,
    detail: titleLen === 0
      ? 'Chưa có tiêu đề'
      : titleLen < 30
        ? `Quá ngắn (${titleLen}/30-60 ký tự)`
        : titleLen <= 60
          ? `Tốt (${titleLen}/60 ký tự)`
          : `Quá dài (${titleLen}/60 ký tự)`,
  })

  // Meta description
  const descLen = (post.meta_description || '').length
  checks.push({
    label: 'Meta Description',
    ok: descLen >= 50 && descLen <= 160,
    detail: descLen === 0
      ? 'Chưa có — nên thêm 50-160 ký tự'
      : descLen < 50
        ? `Quá ngắn (${descLen}/50-160 ký tự)`
        : descLen <= 160
          ? `Tốt (${descLen}/160 ký tự)`
          : `Quá dài (${descLen}/160 ký tự)`,
  })

  // Thumbnail
  checks.push({
    label: 'Ảnh Thumbnail',
    ok: !!post.thumbnail,
    detail: post.thumbnail ? 'Đã có ảnh đại diện' : 'Chưa có — nên thêm để tăng CTR',
  })

  // Slug
  checks.push({
    label: 'Đường dẫn (Slug)',
    ok: !!post.slug && post.slug.length > 3,
    detail: post.slug ? blogPostPublicPath(post) : 'Chưa có slug',
  })

  // Content length
  const contentLen = (post.content || '').replace(/<[^>]*>/g, '').length
  checks.push({
    label: 'Độ dài nội dung',
    ok: contentLen >= 300,
    detail: contentLen === 0
      ? 'Chưa có nội dung'
      : contentLen < 300
        ? `Quá ngắn (${contentLen} ký tự — nên ≥300)`
        : `Tốt (${contentLen} ký tự)`,
  })

  return checks
}

/* ══════════════════════════════════════════════════════════════ */
export default function PostDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const [loading,    setLoading]    = useState(true)
  const [post,       setPost]       = useState<Post | null>(null)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!id) return
    postService.getById(Number(id))
      .then(d => setPost(d))
      .catch(() => {
        toast.error('Không tìm thấy bài viết')
        router.push('/admin/posts')
      })
      .finally(() => setLoading(false))
  }, [id, router])

  const handlePublish = async () => {
    if (!post) return
    setPublishing(true)
    try {
      const updated = await postService.publish(post.id)
      setPost({ ...post, status: updated.status, published_at: updated.published_at })
      toast.success(updated.status === 'published' ? 'Đã xuất bản bài viết!' : 'Đã chuyển về bản nháp')
    } catch {
      toast.error('Thao tác thất bại')
    } finally {
      setPublishing(false)
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin" />
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Đang tải bài viết...
          </span>
        </div>
      </div>
    )
  }

  if (!post) return null

  const thumb       = thumbUrl(post.thumbnail)
  const isPublished = post.status === 'published'
  const isDraft     = !isPublished
  const seoTitle    = post.meta_title || post.title
  const seoDesc     = post.meta_description || post.content?.replace(/<[^>]*>/g, '').slice(0, 160) || ''
  const checks      = seoAudit(post)
  const seoScore    = checks.filter(c => c.ok).length
  const seoTotal    = checks.length

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28 lg:pb-10">

      {/* ── Breadcrumbs ── */}
      <nav className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 overflow-x-auto whitespace-nowrap bg-white py-3 px-5 lg:px-6 rounded-2xl shadow-sm border border-slate-200">
        <Link href="/admin/post-topics" className="hover:text-[#ed2a2a] transition-colors flex items-center gap-1.5 shrink-0">
          <BookOpen className="w-4 h-4" /> Chủ đề bài viết
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <Link
          href={post.topic ? `/admin/posts?topic_id=${post.topic.id}` : '/admin/posts'}
          className="hover:text-[#ed2a2a] transition-colors shrink-0"
        >
          {post.topic ? post.topic.name : 'Tất cả bài viết'}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-800 truncate">{post.title}</span>
      </nav>

      {/* ── Sticky Header ── */}
      <div className="sticky top-[72px] lg:top-4 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-5 lg:p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => router.push('/admin/posts')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#ed2a2a] shrink-0" />
              <span className="truncate">Chi Tiết Bài Viết</span>
            </h1>
            <span className="text-sm font-medium text-slate-500 mt-0.5 block">
              Xem trước &amp; quản lý nội dung
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {/* Prominent publish button for drafts */}
          {isDraft && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60 bg-emerald-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600 hover:scale-[1.02] animate-pulse hover:animate-none"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Xuất Bản Ngay
            </button>
          )}

          {/* Toggle for published */}
          {isPublished && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-60 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Về Nháp
            </button>
          )}

          {/* View on Website */}
          <Link
            href={blogPostPublicPath(post)}
            target="_blank"
            className="hidden sm:flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" /> Xem Website
          </Link>

          {/* Edit */}
          <button
            onClick={() => router.push(`/admin/posts/${post.id}/edit`)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Pencil className="w-4 h-4" /> Chỉnh Sửa
          </button>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Article preview (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Article card — mimics frontend blog */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-[0_4px_24px_rgba(237,42,42,0.07)] overflow-hidden">

            {/* Thumbnail */}
            {thumb ? (
              <div className="relative w-full h-64 sm:h-80 bg-slate-100">
                <Image src={thumb} alt={post.title} fill className="object-cover" />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {/* Badges on image */}
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                  {post.is_featured && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-amber-400 text-white shadow">
                      <Star className="w-3 h-3 fill-white" /> Nổi bật
                    </span>
                  )}
                  {post.topic && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-white/90 text-[#ed2a2a] shadow">
                      <BookOpen className="w-3 h-3" /> {post.topic.name}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <FileText className="w-16 h-16 text-slate-300" />
              </div>
            )}

            {/* Article body */}
            <div className="p-6 lg:p-10">
              {/* Status + topic row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {isPublished ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-black bg-red-50 text-[#ed2a2a] border border-red-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ed2a2a]" />
                    </span>
                    Đã xuất bản
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-black bg-amber-50 text-amber-600 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Bản nháp
                  </span>
                )}
                {post.topic && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    <BookOpen className="w-3 h-3" /> {post.topic.name}
                  </span>
                )}
                {post.is_featured && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[12px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-400" /> Nổi bật
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight mb-4">
                {post.title}
              </h2>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-slate-100 mb-6">
                {post.author && (
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
                    <User className="w-4 h-4" /> {post.author.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
                  <Calendar className="w-4 h-4" />
                  {fmtDate(post.published_at || post.created_at)}
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
                  <Eye className="w-4 h-4" /> {post.view_count.toLocaleString()} lượt xem
                </span>
              </div>

              {/* Content — responsive images via [&_img]:max-w-full */}
              {post.content ? (
                <div
                  className="prose prose-slate max-w-none text-[15px] leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-4"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <div className="flex flex-col items-center py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
                  <span className="font-bold text-slate-500 block">Bài viết chưa có nội dung.</span>
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="mt-3 text-[13px] font-bold text-[#ed2a2a] hover:underline"
                  >
                    Thêm nội dung ngay →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Info cards (1/3) */}
        <div className="space-y-6">

          {/* ── View Count Card ── */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-[0_4px_24px_rgba(237,42,42,0.07)]">
            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" /> Thống Kê
            </h3>
            <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/50 flex items-center gap-4 group hover:bg-blue-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                  Tổng lượt xem
                </span>
                <span className="text-3xl font-black text-slate-800 leading-none block">
                  {post.view_count.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* ── SEO Audit Card ── */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-[0_4px_24px_rgba(237,42,42,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" /> SEO Audit
              </h3>
              <span className={`text-[12px] font-black px-2.5 py-1 rounded-lg border ${
                seoScore === seoTotal
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : seoScore >= 3
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-red-50 text-[#ed2a2a] border-red-200'
              }`}>
                {seoScore}/{seoTotal}
              </span>
            </div>
            <div className="space-y-3">
              {checks.map((c) => (
                <div key={c.label} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    c.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-[#ed2a2a]'
                  }`}>
                    {c.ok
                      ? <CheckCircle className="w-3.5 h-3.5" />
                      : <XCircle className="w-3.5 h-3.5" />
                    }
                  </div>
                  <div className="min-w-0">
                    <span className="text-[13px] font-bold text-slate-700 block">{c.label}</span>
                    <span className={`text-[12px] font-medium block ${c.ok ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {c.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SEO Preview ── */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-[0_4px_24px_rgba(237,42,42,0.07)]">
            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" /> Google Preview
            </h3>
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#ed2a2a] flex items-center justify-center text-white font-black text-[10px] shrink-0">
                  E
                </div>
                <div className="min-w-0">
                  <span className="text-[12px] text-slate-800 font-medium block">HDG Food</span>
                  <span className="text-[11px] text-slate-500 truncate block">
                    HDGfood.vn › blog › {post.slug}
                  </span>
                </div>
              </div>
              <span className="text-[16px] text-[#1a0dab] font-medium leading-tight block line-clamp-2 mb-1">
                {seoTitle}
              </span>
              <span className="text-[12px] text-[#4d5156] leading-relaxed block line-clamp-3">
                {seoDesc || 'Không có mô tả...'}
              </span>
            </div>
          </div>

          {/* ── Info Log ── */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-[0_4px_24px_rgba(237,42,42,0.06)]">
            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Nhật Ký
            </h3>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-slate-500">ID</span>
                <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md">
                  #{post.id}
                </span>
              </div>
              {post.topic && (
                <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-500">Chủ đề</span>
                  <Link
                    href={`/admin/post-topics/${post.topic.id}`}
                    className="font-semibold text-[#ed2a2a] hover:underline"
                  >
                    {post.topic.name}
                  </Link>
                </div>
              )}
              {post.author && (
                <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-500">Tác giả</span>
                  <span className="font-semibold text-slate-700">{post.author.name}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-500">Tạo lúc</span>
                <span className="font-semibold text-slate-700 text-right text-[12px]">{fmtDate(post.created_at)}</span>
              </div>
              <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-500">Cập nhật</span>
                <span className="font-semibold text-slate-700 text-right text-[12px]">{fmtDate(post.updated_at)}</span>
              </div>
              {post.published_at && (
                <div className="flex justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-500">Xuất bản</span>
                  <span className="font-semibold text-slate-700 text-right text-[12px]">{fmtDate(post.published_at)}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Mobile sticky footer ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 flex gap-3 z-30">
        {isDraft ? (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all disabled:opacity-60"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Xuất Bản Ngay
          </button>
        ) : (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 active:scale-95 transition-all disabled:opacity-60"
          >
            Về Nháp
          </button>
        )}
        <button
          onClick={() => router.push(`/admin/posts/${post.id}/edit`)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] active:scale-95 transition-all"
        >
          <Pencil className="w-4 h-4" /> Chỉnh Sửa
        </button>
      </div>
    </div>
  )
}
