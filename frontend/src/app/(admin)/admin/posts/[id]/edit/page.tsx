'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, FileText, Save, Loader2, Type, Link2,
  BookOpen, CheckCircle, Hash, Tag, Star, X, ImageIcon,
} from 'lucide-react'
import { toast }            from 'sonner'
import { postService, type Post } from '@/services/post.service'
import { postTopicService }       from '@/services/post-topic.service'
import type { PostTopic }         from '@/types'
import Image                      from 'next/image'
import Link                       from 'next/link'
import { ChevronRight }           from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000'
const thumbUrl = (path?: string | null) =>
  path ? (path.startsWith('http') ? path : `${API_URL}/storage/${path}`) : null

/* ══════════════════════════════════════════════════════════════ */
export default function EditPostPage() {
  const MAX_THUMB_SIZE = 10 * 1024 * 1024
  // Herd/PHP local đang để 2M, giữ buffer để không chạm ngưỡng 413.
  const SAFE_UPLOAD_SIZE = 1800 * 1024
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [topics,       setTopics]       = useState<PostTopic[]>([])
  const [post,         setPost]         = useState<Post | null>(null)

  /* form state */
  const [title,      setTitle]      = useState('')
  const [slug,       setSlug]       = useState('')
  const [topicId,    setTopicId]    = useState<string>('')
  const [status,     setStatus]     = useState<'draft' | 'published'>('draft')
  const [isFeatured, setIsFeatured] = useState(false)
  const [metaTitle,  setMetaTitle]  = useState('')
  const [metaDesc,   setMetaDesc]   = useState('')
  const [thumbFile,  setThumbFile]  = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [existingThumb, setExistingThumb] = useState<string | null>(null)

  /* ── load topics & post ── */
  useEffect(() => {
    postTopicService.getAll({ per_page: 100 }).then(r => setTopics(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    postService.getById(Number(id))
      .then(data => {
        setPost(data)
        setTitle(data.title || '')
        setSlug(data.slug   || '')
        setTopicId(data.topic_id ? String(data.topic_id) : '')
        setStatus(data.status)
        setIsFeatured(data.is_featured)
        setMetaTitle(data.meta_title  || '')
        setMetaDesc(data.meta_description || '')
        setExistingThumb(thumbUrl(data.thumbnail))
        // inject HTML into editor
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || ''
        }
      })
      .catch(() => {
        toast.error('Không tìm thấy bài viết')
        router.push('/admin/posts')
      })
      .finally(() => setLoading(false))
  }, [id, router])

  /* auto slug from title */
  const handleTitleChange = (val: string) => {
    setTitle(val)
    const auto = val
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-')
    setSlug(auto)
  }

  const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (file.size <= SAFE_UPLOAD_SIZE) return file

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Không đọc được ảnh để nén'))
      reader.readAsDataURL(file)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Không tải được ảnh để nén'))
      image.src = dataUrl
    })

    const maxWidth = 1920
    const scale = img.width > maxWidth ? maxWidth / img.width : 1
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    let quality = 0.9
    let blob: Blob | null = null
    while (quality >= 0.45) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', quality)
      )
      if (blob && blob.size <= SAFE_UPLOAD_SIZE) break
      quality -= 0.1
    }

    if (!blob) return file

    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-compressed.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  }

  /* ── thumbnail pick ── */
  const handleThumbPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_THUMB_SIZE) {
      toast.error('Ảnh thumbnail không được vượt quá 10MB')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    try {
      const uploadFile = await compressImageIfNeeded(f)
      if (uploadFile.size > SAFE_UPLOAD_SIZE) {
        toast.error('Ảnh quá lớn cho cấu hình server hiện tại. Vui lòng chọn ảnh nhẹ hơn hoặc tăng giới hạn PHP.')
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      setThumbFile(uploadFile)
      setThumbPreview(URL.createObjectURL(uploadFile))

      if (uploadFile !== f) {
        toast.success('Ảnh đã được nén tự động để phù hợp giới hạn upload.')
      }
    } catch {
      toast.error('Không thể xử lý ảnh đã chọn. Vui lòng thử ảnh khác.')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeCurrThumb = () => {
    setThumbFile(null)
    setThumbPreview(null)
    setExistingThumb(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const displayThumb = thumbPreview || existingThumb

  /* ── submit ── */
  const handleSubmit = async (asDraft = false) => {
    if (!title.trim()) return toast.error('Vui lòng nhập tiêu đề bài viết')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title',       title)
      fd.append('slug',        slug)
      fd.append('content',     editorRef.current?.innerHTML || '')
      fd.append('status',      asDraft ? 'draft' : status)
      fd.append('is_featured', isFeatured ? '1' : '0')
      if (topicId)   fd.append('topic_id',         topicId)
      if (metaTitle) fd.append('meta_title',        metaTitle)
      if (metaDesc)  fd.append('meta_description',  metaDesc)
      if (thumbFile) fd.append('thumbnail',         thumbFile)

      await postService.update(Number(id), fd)
      toast.success('Đã cập nhật bài viết thành công!')
      router.push('/admin/posts')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  /* ── SEO preview ── */
  const seoTitle = metaTitle || title || 'Tiêu đề bài viết...'
  const seoDesc  = metaDesc || 'Mô tả bài viết sẽ hiển thị tại đây trên Google...'

  const selectedTopic = topics.find(t => String(t.id) === topicId)
  const topicName = selectedTopic ? selectedTopic.name : 'Tất cả bài viết'

  /* ── loading ── */
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
        <span className="text-slate-800">Cập nhật: {post?.title || ''}</span>
      </nav>

      {/* ── Header ── */}
      <div className="sticky top-[72px] lg:top-4 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-5 lg:p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/posts')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#ed2a2a]" />
              Chỉnh Sửa Bài Viết
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5 line-clamp-1">
              {post?.title}
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => router.push(`/admin/posts/${id}`)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200 active:scale-95 transition-all"
          >
            Xem trước
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu Thay Đổi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left ── */}
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
                  placeholder="Tiêu đề bài viết..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-800 text-[15px] focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all"
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Đường dẫn (Slug)</label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
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
            <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-[#ed2a2a]/10 focus-within:border-[#ed2a2a] transition-all">
              {/* Toolbar */}
              <div className="flex gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
                {[
                  { cmd: 'bold',               label: 'B',      cls: 'font-black' },
                  { cmd: 'italic',             label: 'I',      cls: 'italic' },
                  { cmd: 'underline',          label: 'U',      cls: 'underline' },
                  { cmd: 'insertUnorderedList',label: '• List', cls: '' },
                  { cmd: 'insertOrderedList',  label: '1. List',cls: '' },
                  { cmd: 'formatBlock',        label: 'H2',     cls: 'font-bold', arg: 'h2' },
                  { cmd: 'formatBlock',        label: 'H3',     cls: 'font-bold', arg: 'h3' },
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
              {/* Editor */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Nội dung bài viết..."
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
          </div>

        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-6">

          {/* Thumbnail */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-400" /> Ảnh Thumbnail
            </h3>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleThumbPick} />
            {displayThumb ? (
              <div className="relative">
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200">
                  <Image src={displayThumb} alt="thumbnail" fill unoptimized className="object-cover" />
                </div>
                <button
                  onClick={removeCurrThumb}
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
                  Chọn ảnh mới
                </span>
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-3 w-full py-2 text-[13px] font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {displayThumb ? 'Đổi ảnh khác' : 'Tải ảnh lên'}
            </button>
          </div>

          {/* Publish settings */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-slate-400" /> Cài Đặt Xuất Bản
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600">Trạng thái</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as 'draft' | 'published')}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-700 appearance-none bg-white focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all"
                >
                  <option value="draft">✏️ Bản nháp</option>
                  <option value="published">🟢 Xuất bản</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
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

          {/* SEO */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-700 mb-1 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" /> Tối Ưu SEO
            </h3>
            <div className="space-y-4 mt-4">
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
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600">Meta Description</label>
                <textarea
                  value={metaDesc}
                  onChange={e => setMetaDesc(e.target.value)}
                  placeholder="Mô tả trên Google..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 min-h-[80px] focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all resize-none"
                />
              </div>
            </div>
            {/* Google preview */}
            <div className="mt-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preview Google</p>
              <p className="text-[15px] text-[#1a0dab] font-medium leading-tight line-clamp-2 mb-1">{seoTitle}</p>
              <p className="text-[12px] text-[#4d5156] leading-relaxed line-clamp-2">{seoDesc}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile sticky footer */}
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
          Lưu Thay Đổi
        </button>
      </div>
    </div>
  )
}
