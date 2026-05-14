'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, FileText, Save, Loader2, Type, Link2,
  BookOpen, CheckCircle, Hash, Tag, Star, ImageIcon, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { postService }       from '@/services/post.service'
import { postTopicService }  from '@/services/post-topic.service'
import type { PostTopic }    from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000'

/* ══════════════════════════════════════════════════════════════ */
export default function CreatePostPage() {
  const MAX_THUMB_SIZE = 10 * 1024 * 1024
  const router  = useRouter()
  const [saving, setSaving] = useState(false)
  const [topics, setTopics] = useState<PostTopic[]>([])

  /* form state */
  const [title,           setTitle]           = useState('')
  const [slug,            setSlug]            = useState('')
  const [content,         setContent]         = useState('')
  const [topicId,         setTopicId]         = useState<string>('')
  const [status,          setStatus]          = useState<'draft' | 'published'>('draft')
  const [isFeatured,      setIsFeatured]      = useState(false)
  const [metaTitle,       setMetaTitle]       = useState('')
  const [metaDesc,        setMetaDesc]        = useState('')
  const [thumbFile,       setThumbFile]       = useState<File | null>(null)
  const [thumbPreview,    setThumbPreview]    = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    postTopicService.getAll({ per_page: 100 }).then(r => setTopics(r.data)).catch(() => {})
  }, [])

  /* auto slug from title */
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!slug) {
      const auto = val
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
        .trim().replace(/\s+/g, '-')
      setSlug(auto)
    }
  }

  /* thumbnail pick */
  const handleThumbPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_THUMB_SIZE) {
      toast.error('Ảnh thumbnail không được vượt quá 10MB')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setThumbFile(file)
    const url = URL.createObjectURL(file)
    setThumbPreview(url)
  }

  const handleSubmit = async (asDraft = false) => {
    if (!title.trim()) return toast.error('Vui lòng nhập tiêu đề bài viết')

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title',            title)
      fd.append('slug',             slug)
      fd.append('content',          content)
      fd.append('status',           asDraft ? 'draft' : status)
      fd.append('is_featured',      isFeatured ? '1' : '0')
      if (topicId) fd.append('topic_id', topicId)
      if (metaTitle) fd.append('meta_title', metaTitle)
      if (metaDesc)  fd.append('meta_description', metaDesc)
      if (thumbFile) fd.append('thumbnail', thumbFile)

      await postService.create(fd)
      toast.success('Đã tạo bài viết thành công!')
      router.push('/admin/posts')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  /* ── SEO preview ── */
  const seoTitle = metaTitle || title || 'Tiêu đề bài viết...'
  const seoDesc  = metaDesc  || content.replace(/<[^>]*>/g, '').slice(0, 160) || 'Mô tả bài viết sẽ hiển thị tại đây trên Google...'

  const selectedTopic = topics.find(t => String(t.id) === topicId)
  const topicName = selectedTopic ? selectedTopic.name : 'Tất cả bài viết'

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28 lg:pb-10">

      {/* ── Breadcrumbs ── */}
      <nav className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 overflow-x-auto whitespace-nowrap bg-white py-3 px-5 lg:px-6 rounded-2xl shadow-sm border border-slate-200">
        <Link href="/admin/post-topics" className="hover:text-[#ed2a2a] transition-colors flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" /> Chủ đề bài viết
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link href="/admin/posts" className="hover:text-[#ed2a2a] transition-colors">{topicName}</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800">Thêm bài viết mới</span>
      </nav>

      {/* ── Header ── */}
      <div className="sticky top-[72px] lg:top-4 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-5 lg:p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#ed2a2a]" />
              Viết Bài Mới
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Tạo bài viết blog, tin tức hoặc giới thiệu món ăn
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu nháp
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Xuất Bản
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Main content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Thông tin chính */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 lg:p-8 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-[#ed2a2a] flex items-center justify-center shrink-0">
                <Type className="w-4 h-4" />
              </span>
              Thông Tin Bài Viết
            </h2>

            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Tiêu Đề <span className="text-red-500">*</span>
                </label>
                <input
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="VD: 10 Món ăn ngon nhất mùa hè..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-800 text-[15px] focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all"
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Đường dẫn (Slug)
                  <span className="text-slate-400 font-normal ml-2 text-xs">Tự động tạo từ tiêu đề</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="ten-bai-viet-cua-ban"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl font-mono text-[14px] text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all"
                  />
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Chủ Đề</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={topicId}
                    onChange={e => setTopicId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-700 appearance-none bg-white focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all"
                  >
                    <option value="">-- Chọn chủ đề --</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Nội dung */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 lg:p-8 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              Nội Dung Bài Viết
            </h2>

            {/* Rich Text Area — toolbar + textarea */}
            <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-[#ed2a2a]/10 focus-within:border-[#ed2a2a] transition-all">
              {/* Toolbar */}
              <div className="flex gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
                {[
                  { cmd: 'bold',          label: 'B',   cls: 'font-black' },
                  { cmd: 'italic',        label: 'I',   cls: 'italic' },
                  { cmd: 'underline',     label: 'U',   cls: 'underline' },
                  { cmd: 'insertUnorderedList', label: '• List', cls: '' },
                  { cmd: 'insertOrderedList',   label: '1. List', cls: '' },
                  { cmd: 'formatBlock',   label: 'H2',  cls: 'font-bold', arg: 'h2' },
                  { cmd: 'formatBlock',   label: 'H3',  cls: 'font-bold', arg: 'h3' },
                ].map(({ cmd, label, cls, arg }) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      document.execCommand(cmd, false, arg ?? '')
                    }}
                    className={`px-3 py-1.5 text-[12px] text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg border border-transparent hover:border-slate-200 transition-all ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ContentEditable editor */}
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={e => setContent((e.target as HTMLDivElement).innerHTML)}
                data-placeholder="Bắt đầu viết nội dung bài viết tại đây..."
                className="
                  min-h-[320px] p-4 text-[15px] text-slate-800 leading-relaxed
                  focus:outline-none
                  [&:empty]:before:content-[attr(data-placeholder)]
                  [&:empty]:before:text-slate-400
                  [&:empty]:before:pointer-events-none
                  prose prose-sm max-w-none
                "
              />
            </div>
            <p className="text-[12px] text-slate-400 mt-2 font-medium">
              Hỗ trợ định dạng văn bản cơ bản. Bạn có thể paste nội dung từ Word/Google Docs.
            </p>
          </div>

        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-6">

          {/* Thumbnail */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-400" /> Ảnh Đại Diện (Thumbnail)
            </h3>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleThumbPick} />
            {thumbPreview ? (
              <div className="relative">
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200">
                  <Image src={thumbPreview} alt="preview" fill className="object-cover" />
                </div>
                <button
                  onClick={() => { setThumbFile(null); setThumbPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#ed2a2a] hover:bg-red-50/30 transition-all group"
              >
                <ImageIcon className="w-8 h-8 text-slate-300 group-hover:text-[#ed2a2a] transition-colors" />
                <span className="text-[13px] font-bold text-slate-400 group-hover:text-[#ed2a2a] transition-colors">
                  Chọn ảnh thumbnail
                </span>
                <span className="text-[11px] text-slate-300">JPG, PNG, WEBP – tối đa 10MB</span>
              </button>
            )}
            {!thumbPreview && (
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-3 w-full py-2 text-[13px] font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {thumbFile ? 'Đổi ảnh' : 'Tải ảnh lên'}
              </button>
            )}
          </div>

          {/* Status & Options */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-slate-400" /> Cài Đặt Xuất Bản
            </h3>

            <div className="space-y-4">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600">Trạng thái</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as 'draft' | 'published')}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-700 appearance-none bg-white focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all"
                >
                  <option value="draft">✏️ Bản nháp</option>
                  <option value="published">🟢 Xuất bản ngay</option>
                </select>
              </div>

              {/* Is Featured */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setIsFeatured(!isFeatured)}
                  className={`relative w-11 h-6 rounded-full border-2 transition-all ${
                    isFeatured ? 'bg-amber-400 border-amber-400' : 'bg-slate-200 border-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      isFeatured ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
                <span className="flex items-center gap-1.5 text-[14px] font-bold text-slate-700">
                  <Star className="w-4 h-4 text-amber-400" />
                  Bài viết nổi bật
                </span>
              </label>
            </div>
          </div>

          {/* SEO Section */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-700 mb-1 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" /> Tối Ưu SEO
            </h3>
            <p className="text-[12px] text-slate-400 mb-4">Để trống sẽ dùng tiêu đề & nội dung bài viết.</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600">Meta Title</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={metaTitle}
                    onChange={e => setMetaTitle(e.target.value)}
                    placeholder="Tiêu đề trên Google..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">{metaTitle.length}/60 ký tự</p>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600">Meta Description</label>
                <textarea
                  value={metaDesc}
                  onChange={e => setMetaDesc(e.target.value)}
                  placeholder="Mô tả hiển thị trên kết quả tìm kiếm..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 min-h-[90px] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all resize-none"
                />
                <p className="text-[11px] text-slate-400">{metaDesc.length}/160 ký tự</p>
              </div>
            </div>

            {/* Google preview */}
            <div className="mt-5 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preview Google</p>
              <p className="text-[16px] text-[#1a0dab] font-medium leading-tight line-clamp-2 mb-1">{seoTitle}</p>
              <p className="text-[12px] text-[#4d5156] leading-relaxed line-clamp-2">{seoDesc}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 flex gap-3 z-30">
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 active:scale-95 transition-all disabled:opacity-60"
        >
          Lưu nháp
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] active:scale-95 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Xuất Bản
        </button>
      </div>
    </div>
  )
}
