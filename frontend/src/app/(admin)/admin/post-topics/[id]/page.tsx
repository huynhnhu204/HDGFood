'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, BookOpen, Pencil, Loader2, Eye, FileText,
  Calendar, Tag, AlertCircle, PlusCircle, CheckCircle,
  Power, PowerOff, Globe, BarChart3, Clock, ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { postTopicService } from '@/services/post-topic.service'
import type { PostTopic } from '@/types'
import Link from 'next/link'
import { blogTopicListingPath } from '@/lib/client-paths'

/* ─────────────────────────────────────────────── helpers ── */
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const fmtDateShort = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

const fmtNum = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

/* ═══════════════════════════════════════════════════════════ */
export default function PostTopicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [loading,  setLoading]  = useState(true)
  const [topic,    setTopic]    = useState<PostTopic | null>(null)
  const [toggling, setToggling] = useState(false)

  /* ── fetch ── */
  const loadData = async () => {
    if (!id) return
    try {
      const data = await postTopicService.getById(Number(id))
      setTopic(data)
    } catch {
      toast.error('Không tìm thấy chủ đề hoặc đã bị xóa')
      router.push('/admin/post-topics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id]) // eslint-disable-line

  /* ── quick toggle ── */
  const handleToggle = async () => {
    if (!topic) return
    setToggling(true)
    try {
      await postTopicService.toggle(topic.id)
      const next = topic.status === 'active' ? 'inactive' : 'active'
      setTopic({ ...topic, status: next })
      toast.success(next === 'active' ? 'Đã bật hiển thị chủ đề' : 'Đã tạm ẩn chủ đề')
    } catch {
      toast.error('Cập nhật thất bại')
    } finally {
      setToggling(false)
    }
  }

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin" />
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Đang tải dữ liệu...
          </span>
        </div>
      </div>
    )
  }

  if (!topic) return null

  /* ── derived ── */
  const seoTitle   = topic.meta_title || topic.name
  const seoDesc    = topic.meta_description || topic.description ||
    `Xem chi tiết bài viết thuộc danh mục ${topic.name} tại HDG Food.`
  const isActive   = topic.status === 'active'
  const postsCount = topic.posts_count ?? 0
  const totalViews = topic.total_views  ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28 lg:pb-10">

      {/* ── Breadcrumbs ── */}
      <nav className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 overflow-x-auto whitespace-nowrap bg-white py-3 px-5 lg:px-6 rounded-2xl shadow-sm border border-slate-200">
        <Link href="/admin/post-topics" className="hover:text-[#ed2a2a] transition-colors flex items-center gap-1.5 shrink-0">
          <BookOpen className="w-4 h-4" /> Chủ đề bài viết
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-800 truncate">{topic.name}</span>
      </nav>

      {/* ══ STICKY HEADER ══ */}
      <div className="sticky top-[72px] lg:top-4 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-5 lg:p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
        {/* Left: back + title */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => router.push('/admin/post-topics')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#ed2a2a] shrink-0" />
              <span className="truncate">Chi Tiết Chủ Đề</span>
            </h1>
            <span className="text-sm font-medium text-slate-500 mt-0.5 block">
              Thống kê &amp; thông tin danh mục bài viết
            </span>
          </div>
        </div>

        {/* Right: toggle + edit */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {/* Quick Toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={isActive ? 'Nhấn để tạm ẩn chủ đề' : 'Nhấn để bật hiển thị'}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-60 ${
              isActive
                ? 'bg-red-50 text-[#ed2a2a] border-red-200 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {toggling
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isActive
                ? <PowerOff className="w-4 h-4" />
                : <Power    className="w-4 h-4" />
            }
            {isActive ? 'Tạm Ẩn' : 'Bật Hiển Thị'}
          </button>

          {/* View on Website */}
          <Link
            href={blogTopicListingPath(topic.slug)}
            target="_blank"
            className="hidden sm:flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" /> Website
          </Link>

          {/* Edit */}
          <button
            onClick={() => router.push(`/admin/post-topics/${topic.id}/edit`)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Pencil className="w-4 h-4" /> Chỉnh Sửa
          </button>
        </div>
      </div>

      {/* ══ MAIN GRID ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card 1: Thông tin chính */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 lg:p-8 shadow-[0_4px_24px_rgba(237,42,42,0.07)] relative overflow-hidden hover:shadow-[0_6px_32px_rgba(237,42,42,0.12)] transition-shadow">
            {/* Red accent bar */}
            <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-[#ed2a2a] to-[#ff6b6b] rounded-l-[1.5rem]" />

            <div className="space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Đang Hiển Thị
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    Đang Tạm Ẩn
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-bold text-slate-500 bg-slate-50 border border-slate-100">
                  <Calendar className="w-3.5 h-3.5" />
                  Tạo: {fmtDate(topic.created_at)}
                </span>
              </div>

              {/* Name */}
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
                {topic.name}
              </h2>

              {/* Slug */}
              <div className="flex items-center gap-2 w-fit px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-[14px] font-semibold text-slate-600">/{topic.slug}</span>
              </div>

              {/* Description */}
              {topic.description && (
                <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                  <span className="text-[15px] font-medium text-slate-700 leading-relaxed block">
                    {topic.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Bài Viết Mới Nhất */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 lg:p-8 shadow-[0_4px_24px_rgba(237,42,42,0.07)] hover:shadow-[0_6px_32px_rgba(237,42,42,0.11)] transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-red-50 text-[#ed2a2a] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                Bài Viết Mới Nhất
              </h3>
              {postsCount > 0 && (
                <Link
                  href={`/admin/posts?topic_id=${topic.id}`}
                  className="text-[13px] font-bold text-[#ed2a2a] hover:underline flex items-center gap-1"
                >
                  Xem tất cả ({postsCount}) <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Empty state */}
            {postsCount === 0 || !topic.latest_posts?.length ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-[0_4px_20px_rgba(237,42,42,0.1)]">
                  <AlertCircle className="w-8 h-8 text-[#ed2a2a]/60" />
                </div>
                <span className="text-[15px] font-bold text-slate-700 mb-1 block">
                  Chủ đề này hiện chưa có bài viết.
                </span>
                <span className="text-[13px] font-medium text-slate-500 mb-5 block">
                  Hãy tạo những nội dung blog hấp dẫn để thu hút độc giả!
                </span>
                <Link
                  href="/admin/posts/create"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-[#ed2a2a] text-[#ed2a2a] rounded-xl font-bold shadow-sm hover:bg-red-50 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" /> Tạo bài viết ngay
                </Link>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead className="border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                          Tiêu đề bài viết
                        </th>
                        <th className="px-4 py-3 text-center font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">
                          Trạng thái
                        </th>
                        <th className="px-4 py-3 text-center font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">
                          Lượt xem
                        </th>
                        <th className="px-4 py-3 text-center font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">
                          Ngày đăng
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topic.latest_posts.map((post: any, idx: number) => (
                        <tr
                          key={post.id ?? idx}
                          onClick={() => router.push(`/admin/posts/${post.id}`)}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-800 line-clamp-2 block">
                              {post.title || `Bài viết #${post.id}`}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {post.status === 'published' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-[#ed2a2a] border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ed2a2a] inline-block" />
                                Xuất bản
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                                Nháp
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                              <Eye className="w-3 h-3" />
                              {fmtNum(post.view_count ?? 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-[13px] font-semibold text-slate-500 whitespace-nowrap">
                              {fmtDateShort(post.created_at)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="block sm:hidden space-y-3">
                  {topic.latest_posts.map((post: any, idx: number) => (
                    <div
                      key={post.id ?? idx}
                      onClick={() => router.push(`/admin/posts/${post.id}`)}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/30 cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <span className="font-bold text-slate-800 text-[14px] line-clamp-2 block mb-2">
                        {post.title || `Bài viết #${post.id}`}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {post.status === 'published' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-[#ed2a2a] border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ed2a2a] inline-block" />
                            Xuất bản
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Nháp
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600">
                          <Eye className="w-3 h-3" /> {fmtNum(post.view_count ?? 0)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 ml-auto">
                          {fmtDateShort(post.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* ── Right (1/3) ── */}
        <div className="space-y-6">

          {/* Thống Kê Nhanh */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 lg:p-8 shadow-[0_4px_24px_rgba(237,42,42,0.07)] hover:shadow-[0_6px_32px_rgba(237,42,42,0.11)] transition-shadow">
            <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#ed2a2a]/10 text-[#ed2a2a] flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </span>
              Thống Kê Tổng Quan
            </h3>

            <div className="flex flex-col gap-4">
              {/* Total posts */}
              <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/50 flex items-center gap-4 group hover:bg-blue-50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                    Tổng bài viết
                  </span>
                  <span className="text-3xl font-black text-slate-800 leading-none block">
                    {postsCount}
                  </span>
                </div>
              </div>

              {/* Total views */}
              <div className="p-5 rounded-2xl border border-orange-100 bg-orange-50/50 flex items-center gap-4 group hover:bg-orange-50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-110 transition-transform">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                    Tổng lượt xem
                  </span>
                  <span className="text-3xl font-black text-slate-800 leading-none block">
                    {fmtNum(totalViews)}
                  </span>
                </div>
              </div>

              {/* Status summary */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                isActive
                  ? 'border-emerald-100 bg-emerald-50/50'
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isActive
                    ? <CheckCircle className="w-5 h-5" />
                    : <PowerOff    className="w-5 h-5" />
                  }
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Trạng thái
                  </span>
                  <span className={`text-[15px] font-black ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {isActive ? 'Đang hiển thị' : 'Đang tạm ẩn'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SEO Preview */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 lg:p-8 shadow-[0_4px_24px_rgba(237,42,42,0.07)] hover:shadow-[0_6px_32px_rgba(237,42,42,0.11)] transition-shadow">
            <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </span>
              SEO Preview
            </h3>

            {/* Google-style card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#ed2a2a] flex items-center justify-center text-white shrink-0 font-black text-[11px]">
                  E
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] text-slate-800 font-medium leading-tight">HDG Food</span>
                  <span className="text-[11px] text-slate-500 leading-tight truncate">
                    https://HDGfood.vn › blog › {topic.slug}
                  </span>
                </div>
              </div>
              <span className="text-[17px] text-[#1a0dab] font-medium leading-tight hover:underline cursor-pointer block line-clamp-2 mb-1">
                {seoTitle}
              </span>
              <span className="text-[13px] text-[#4d5156] leading-relaxed block line-clamp-3">
                {seoDesc}
              </span>
            </div>

            {/* Meta info summary */}
            <div className="mt-4 space-y-2">
              <div className="flex items-start gap-2 text-[13px]">
                <span className="font-bold text-slate-500 shrink-0 w-24">Meta Title:</span>
                <span className="font-medium text-slate-700 line-clamp-2">
                  {topic.meta_title || <span className="text-slate-400 italic">Dùng tên chủ đề</span>}
                </span>
              </div>
              <div className="flex items-start gap-2 text-[13px]">
                <span className="font-bold text-slate-500 shrink-0 w-24">Meta Desc:</span>
                <span className="font-medium text-slate-700 line-clamp-2">
                  {topic.meta_description || <span className="text-slate-400 italic">Dùng mô tả chủ đề</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Nhật ký */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-[0_4px_24px_rgba(237,42,42,0.06)]">
            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Nhật Ký
            </h3>
            <div className="space-y-3 text-[13px]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-slate-500">ID</span>
                <span className="font-mono font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md">
                  #{topic.id}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-500">Ngày tạo</span>
                <span className="font-semibold text-slate-700 text-right">{fmtDate(topic.created_at)}</span>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-500">Cập nhật</span>
                <span className="font-semibold text-slate-700 text-right">{fmtDate(topic.updated_at)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Mobile sticky footer ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 flex gap-3 z-30">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold border active:scale-95 transition-all disabled:opacity-60 ${
            isActive
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}
        >
          {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          {isActive ? 'Tạm Ẩn' : 'Bật Hiển Thị'}
        </button>
        <button
          onClick={() => router.push(`/admin/post-topics/${topic.id}/edit`)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] active:scale-95 transition-all"
        >
          <Pencil className="w-4 h-4" /> Chỉnh Sửa
        </button>
      </div>
    </div>
  )
}
