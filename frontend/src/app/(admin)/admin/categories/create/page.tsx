'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Loader2, Tag, LayoutDashboard,
  RefreshCw, Upload, X, Link, AlertCircle, CheckCircle2, Globe
} from 'lucide-react'
import { toast } from 'sonner'
import { categoryService, type CategoryPayload } from '@/services/category.service'
import type { Category } from '@/types'
import api from '@/services/api'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Chuyển tiếng Việt có dấu → slug chuẩn */
function toSlug(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')      // chỉ giữ chữ, số, khoảng trắng, gạch ngang
    .trim()
    .replace(/\s+/g, '-')              // khoảng trắng → gạch ngang
    .replace(/-+/g, '-')               // nhiều gạch ngang → 1
}

/** Render danh mục phân cấp dạng cây */
function flattenCategories(
  cats: Category[],
  parentId: number | null = null,
  depth = 0
): { cat: Category; depth: number }[] {
  const result: { cat: Category; depth: number }[] = []
  cats
    .filter(c => (c.parent_id ?? null) === parentId)
    .forEach(c => {
      result.push({ cat: c, depth })
      result.push(...flattenCategories(cats, c.id, depth + 1))
    })
  return result
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CreateCategoryPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [slugManual, setSlugManual] = useState(false)   // true = user đã tự sửa slug
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [imageError, setImageError] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState<CategoryPayload & { slug?: string }>({
    name: '',
    slug: '',
    description: '',
    image: '',
    sort_order: 0,
    is_active: true,
    parent_id: null,
  })

  // Load danh mục cha
  useEffect(() => {
    categoryService.getAll({ per_page: 200 }).then(res => {
      const data = Array.isArray(res) ? res : (res as any).data ?? []
      setCategories(data)
    })
  }, [])

  // Auto-slug từ tên (chỉ khi chưa tự sửa)
  useEffect(() => {
    if (!slugManual) {
      setForm(f => ({ ...f, slug: toSlug(f.name ?? '') }))
    }
  }, [form.name, slugManual])

  // Kiểm tra slug trùng (debounce 500ms)
  useEffect(() => {
    if (!form.slug) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const t = setTimeout(async () => {
      try {
        await api.get(`/admin/categories/check-slug?slug=${form.slug}`)
        setSlugStatus('ok')
      } catch {
        setSlugStatus('taken')
      }
    }, 500)
    return () => clearTimeout(t)
  }, [form.slug])

  // Ctrl/Cmd + S → lưu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        document.getElementById('btn-save')?.click()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Upload ảnh
  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ url: string }>('/admin/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm(f => ({ ...f, image: res.data.url }))
      setImageError(false)
    } catch {
      toast.error('Upload ảnh thất bại.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên danh mục.')
    if (slugStatus === 'taken') return toast.error('Slug đã tồn tại, vui lòng chọn slug khác.')

    setSaving(true)
    try {
      await categoryService.create(form)
      toast.success('Đã tạo danh mục thành công.')
      router.push('/admin/categories')
    } catch {
      toast.error('Có lỗi xảy ra khi tạo danh mục.')
    } finally {
      setSaving(false)
    }
  }

  const tree = flattenCategories(categories)
  const domain = typeof window !== 'undefined' ? window.location.origin : 'https://HDGfood.vn'
  const parentSlug = categories.find(c => c.id === form.parent_id)?.slug
  const urlPreview = `${domain}/categories${parentSlug ? `/${parentSlug}` : ''}/${form.slug || '...'}`

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5 pb-24 lg:pb-10">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-white/95 backdrop-blur-sm p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button" onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#ed2a2a]" /> Thêm Danh Mục
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Tạo mới phân loại sản phẩm</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => router.back()}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            Huỷ
          </button>
          <button
            id="btn-save" type="submit" disabled={saving || slugStatus === 'taken'}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_16px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu <span className="hidden sm:inline text-white/60 text-xs ml-1">Ctrl+S</span>
          </button>
        </div>
      </div>

      {/* ── Main Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">

        {/* Tên & Thứ tự */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">
              Tên Danh Mục <span className="text-[#ed2a2a]">*</span>
            </label>
            <input
              required type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="VD: Trà sữa, Món chính..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">Thứ Tự Sắp Xếp</label>
            <input
              type="number" min={0} value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
            />
          </div>
        </div>

        {/* Slug + URL Preview */}
        <div className="p-6 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">Slug (URL)</label>
              <button
                type="button"
                onClick={() => { setSlugManual(false); setForm(f => ({ ...f, slug: toSlug(f.name ?? '') })) }}
                className="flex items-center gap-1 text-[11px] text-[#ed2a2a] font-semibold hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Từ tên
              </button>
            </div>

            <div className="relative">
              <input
                type="text" value={form.slug ?? ''}
                onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })) }}
                placeholder="ten-danh-muc"
                className={`w-full px-4 py-2.5 pr-10 bg-slate-50 border rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                  slugStatus === 'taken'
                    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                    : slugStatus === 'ok'
                      ? 'border-green-400 focus:ring-green-200 focus:border-green-400'
                      : 'border-slate-200 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a]'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {slugStatus === 'checking' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                {slugStatus === 'ok'       && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {slugStatus === 'taken'    && <AlertCircle className="w-4 h-4 text-red-500" />}
              </div>
            </div>

            {slugStatus === 'taken' && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Slug này đã tồn tại, vui lòng chọn slug khác.
              </p>
            )}
          </div>

          {/* URL Preview */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium truncate">
              <span className="text-slate-500">{domain}/categories</span>
              {parentSlug && <span className="text-slate-500">/{parentSlug}</span>}
              <span className="text-[#ed2a2a] font-bold">/{form.slug || '...'}</span>
            </span>
          </div>
        </div>

        {/* Danh mục cha */}
        <div className="p-6 space-y-1.5">
          <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">Danh Mục Cha</label>
          <select
            value={form.parent_id ?? ''}
            onChange={e => setForm(f => ({ ...f, parent_id: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
          >
            <option value="">— Không có (danh mục gốc)</option>
            {tree.map(({ cat, depth }) => (
              <option key={cat.id} value={cat.id}>
                {'—'.repeat(depth)} {depth > 0 ? ' ' : ''}{cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mô tả */}
        <div className="p-6 space-y-1.5">
          <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">Mô Tả</label>
          <textarea
            rows={3} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Mô tả tóm tắt về danh mục này..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all resize-none"
          />
        </div>

        {/* Hình ảnh */}
        <div className="p-6 space-y-3">
          <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">Hình Ảnh</label>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" value={form.image}
                onChange={e => { setForm(f => ({ ...f, image: e.target.value })); setImageError(false) }}
                placeholder="https://example.com/image.jpg"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
              />
            </div>
            <button
              type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50 shrink-0"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
            />
          </div>

          {/* Preview */}
          {form.image && !imageError && (
            <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
              <img
                src={form.image} alt="Preview"
                className="w-full h-48 object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => { setForm(f => ({ ...f, image: '' })); setImageError(false) }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/90 text-red-600 rounded-xl text-sm font-bold hover:bg-white transition-all"
                >
                  <X className="w-4 h-4" /> Xoá ảnh
                </button>
              </div>
            </div>
          )}

          {imageError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 font-medium">Link ảnh không hợp lệ hoặc không tải được.</p>
              <button type="button" onClick={() => { setForm(f => ({ ...f, image: '' })); setImageError(false) }} className="ml-auto text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Trạng thái */}
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${form.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{form.is_active ? 'Đang Hiển Thị' : 'Đang Ẩn'}</p>
                <p className="text-xs text-slate-500">Người dùng sẽ {form.is_active ? 'thấy' : 'không thấy'} danh mục này</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-[#ed2a2a]' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile fixed button */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40">
        <button
          type="submit" disabled={saving || slugStatus === 'taken'}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#ed2a2a] text-white rounded-2xl text-[15px] font-black shadow-[0_8px_30px_rgba(237,42,42,0.4)] active:scale-95 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Tạo Danh Mục
        </button>
      </div>
    </form>
  )
}
