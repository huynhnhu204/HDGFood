'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, RefreshCw, Plus, Trash2, Pencil, FileText,
  MoreVertical, BookOpen, Star, Globe, Eye, EyeOff,
  Filter, Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { postService, type Post } from '@/services/post.service'
import { postTopicService } from '@/services/post-topic.service'
import AdminTrashLink from '@/components/admin/AdminTrashLink'
import type { PostTopic } from '@/types'
import Image from 'next/image'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000'

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const thumbUrl = (path?: string | null) =>
  path ? (path.startsWith('http') ? path : `${API_URL}/storage/${path}`) : null

/* ══════════════════════════════════════════════════════════════ */
export default function PostsPage() {
  const router = useRouter()

  const [posts,        setPosts]        = useState<Post[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all')
  const [topicFilter,  setTopicFilter]  = useState<string>('all')
  const [topics,       setTopics]       = useState<PostTopic[]>([])
  const [page,         setPage]         = useState(1)
  const [lastPage,     setLastPage]     = useState(1)
  const [total,        setTotal]        = useState(0)
  const [openMenuId,   setOpenMenuId]   = useState<number | null>(null)

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.action-menu-container')) setOpenMenuId(null)
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])

  /* ── load topics for filter ── */
  useEffect(() => {
    postTopicService.getAll({ per_page: 100 })
      .then(r => setTopics(r.data))
      .catch(() => {})
  }, [])

  /* ── load posts ── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await postService.getAll({
        search:   search || undefined,
        status:   statusFilter === 'all' ? undefined : statusFilter,
        topic_id: topicFilter  === 'all' ? undefined : topicFilter,
        page,
      })
      setPosts(res.data)
      setLastPage(res.meta.last_page)
      setTotal(res.meta.total)
    } catch {
      toast.error('Không tải được danh sách bài viết.')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, topicFilter, page])

  useEffect(() => { load() }, [load])

  /* ── actions ── */
  const handleDelete = async (id: number) => {
    if (!confirm('Chuyển bài viết vào thùng rác?')) return
    try {
      await postService.delete(id)
      toast.success('Đã chuyển vào thùng rác')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Xóa thất bại')
    }
  }

  const handlePublish = async (id: number) => {
    try {
      const updated = await postService.publish(id)
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: updated.status } : p))
      toast.success(updated.status === 'published' ? 'Đã xuất bản bài viết' : 'Đã chuyển về nháp')
    } catch {
      toast.error('Cập nhật thất bại')
    }
  }

  /* ── stat counts ── */
  const publishedCount = posts.filter(p => p.status === 'published').length
  const draftCount     = posts.filter(p => p.status === 'draft').length

  return (
    <div className="space-y-6 pb-24 lg:pb-10 relative">

      {/* Mobile FAB */}
      <button
        onClick={() => router.push('/admin/posts/create')}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-[60px] h-[60px] bg-[#ed2a2a] rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(237,42,42,0.35)] hover:scale-105 active:scale-90 transition-all"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#ed2a2a]" />
            Quản Lý Bài Viết
          </h1>
          <p className="text-[13px] font-medium text-slate-500 mt-1">
            Tổng cộng {total} bài viết trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AdminTrashLink trashType="post" />
          <button
            onClick={() => router.push('/admin/posts/create')}
            className="hidden lg:flex items-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> Viết Bài Mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
        <div className="bg-white rounded-[1.5rem] border border-slate-200 p-5 shadow-sm min-w-[140px] flex-shrink-0">
          <p className="text-3xl font-black text-slate-800 tracking-tight">{total}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng Bài Viết</p>
        </div>
        <div className="bg-green-50 rounded-[1.5rem] border border-green-200/60 p-5 shadow-sm min-w-[140px] flex-shrink-0">
          <p className="text-3xl font-black text-emerald-600 tracking-tight">{publishedCount}</p>
          <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mt-1">Đã Xuất Bản</p>
        </div>
        <div className="bg-amber-50 rounded-[1.5rem] border border-amber-200/60 p-5 shadow-sm min-w-[140px] flex-shrink-0">
          <p className="text-3xl font-black text-amber-500 tracking-tight">{draftCount}</p>
          <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mt-1">Bản Nháp</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-[72px] lg:top-4 z-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm theo tiêu đề bài viết..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] placeholder:text-slate-400 bg-white sm:bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
        </div>

        {/* Topic filter */}
        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={topicFilter}
            onChange={e => { setTopicFilter(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-[14px] font-medium appearance-none bg-white text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all"
          >
            <option value="all">Tất cả chủ đề</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1 sm:pb-0 w-full xl:w-auto shrink-0">
          {(['all', 'published', 'draft'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setStatusFilter(tab); setPage(1) }}
              className={`px-5 py-3 rounded-xl text-[14px] font-bold transition-all active:scale-95 border ${
                statusFilter === tab
                  ? 'bg-red-50 text-[#ed2a2a] border-red-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'all' ? 'Tất cả' : tab === 'published' ? '🟢 Đã xuất bản' : '✏️ Bản nháp'}
            </button>
          ))}
          <button
            onClick={load}
            className="p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors shadow-sm active:scale-95 shrink-0 ml-1"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        {loading && posts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 items-center">
                <div className="w-16 h-12 bg-slate-200 rounded-xl animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm text-center px-4">
            <div className="w-24 h-24 bg-slate-50 flex items-center justify-center rounded-full mb-4 ring-8 ring-slate-50/50">
              <FileText className="w-10 h-10 text-[#ed2a2a] opacity-50" />
            </div>
            <p className="font-black text-slate-700 text-[18px] mb-1">Chưa có bài viết nào!</p>
            <p className="text-[14px] font-medium text-slate-400 mb-6 max-w-md">
              Bắt đầu viết blog bằng cách tạo bài viết đầu tiên của bạn.
            </p>
            <button
              onClick={() => router.push('/admin/posts/create')}
              className="flex items-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl font-bold shadow-md shadow-red-500/20 hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" /> Viết bài mới
            </button>
          </div>
        ) : (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="hidden lg:block bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/95 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[11px] w-[80px]">Ảnh</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[11px]">Tiêu đề</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[11px] w-[140px]">Chủ đề</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[11px] w-[120px]">Tác giả</th>
                    <th className="px-4 py-4 text-center font-bold text-slate-500 uppercase tracking-widest text-[11px] w-[120px]">Trạng thái</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[11px] w-[110px]">Ngày đăng</th>
                    <th className="px-4 py-4 text-center font-bold text-slate-500 uppercase tracking-widest text-[11px] w-[120px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {posts.map(post => {
                    const thumb = thumbUrl(post.thumbnail)
                    return (
                      <tr key={post.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => router.push(`/admin/posts/${post.id}`)}>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {thumb ? (
                            <div className="relative w-16 h-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                              <Image src={thumb} alt={post.title} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800 text-[14px] line-clamp-2 leading-snug">{post.title}</p>
                          {post.is_featured && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 mt-1">
                              <Star className="w-3 h-3 fill-current" /> Nổi bật
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {post.topic ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                              <BookOpen className="w-3 h-3" />
                              {post.topic.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[12px] font-medium">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-semibold text-slate-600">
                            {post.author?.name ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          {post.status === 'published' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-red-50 text-[#ed2a2a] border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ed2a2a] inline-block" />
                              Đã xuất bản
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                              Bản nháp
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-semibold text-slate-500">
                            {fmtDate(post.published_at || post.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePublish(post.id)}
                              title={post.status === 'published' ? 'Về nháp' : 'Xuất bản'}
                              className={`p-2 rounded-xl border transition-all active:scale-95 ${
                                post.status === 'published'
                                  ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                  : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {post.status === 'published'
                                ? <EyeOff className="w-[16px] h-[16px]" />
                                : <Globe  className="w-[16px] h-[16px]" />
                              }
                            </button>
                            <button
                              onClick={() => router.push(`/admin/posts/${post.id}/edit`)}
                              className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all active:scale-95"
                            >
                              <Pencil className="w-[16px] h-[16px]" />
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 transition-all active:scale-95"
                            >
                              <Trash2 className="w-[16px] h-[16px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE CARD LIST ── */}
            <div className="block lg:hidden space-y-3">
              {posts.map(post => {
                const thumb = thumbUrl(post.thumbnail)
                return (
                  <div
                    key={post.id}
                    onClick={() => router.push(`/admin/posts/${post.id}`)}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex gap-4 cursor-pointer active:scale-[0.98] transition-all"
                  >
                    {/* Thumbnail */}
                    {thumb ? (
                      <div className="relative w-20 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <Image src={thumb} alt={post.title} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-slate-800 text-[15px] leading-snug line-clamp-2 flex-1">
                          {post.title}
                        </p>
                        {/* 3 dots */}
                        <div className="relative action-menu-container shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                            className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === post.id && (
                            <div className="absolute right-0 top-8 w-44 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden">
                              <button
                                onClick={() => { handlePublish(post.id); setOpenMenuId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors"
                              >
                                {post.status === 'published' ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Globe className="w-4 h-4 text-green-500" />}
                                {post.status === 'published' ? 'Về nháp' : 'Xuất bản'}
                              </button>
                              <button
                                onClick={() => router.push(`/admin/posts/${post.id}/edit`)}
                                className="w-full flex items-center gap-3 px-4 py-3.5 text-[14px] font-bold text-blue-600 hover:bg-blue-50 border-b border-slate-50 transition-colors"
                              >
                                <Pencil className="w-4 h-4" /> Chỉnh sửa
                              </button>
                              <button
                                onClick={() => { handleDelete(post.id); setOpenMenuId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 text-[14px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {post.status === 'published' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-[#ed2a2a] border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ed2a2a] inline-block" /> Đã xuất bản
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            ✏️ Nháp
                          </span>
                        )}
                        {post.topic && (
                          <span className="text-[12px] font-semibold text-slate-500">
                            {post.topic.name}
                          </span>
                        )}
                        <span className="text-[12px] font-medium text-slate-400 ml-auto">
                          {fmtDate(post.published_at || post.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
            Trang {page} / {lastPage}
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="flex-1 sm:flex-none px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Trở lại
            </button>
            <button
              disabled={page === lastPage}
              onClick={() => setPage(p => p + 1)}
              className="flex-1 sm:flex-none px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
