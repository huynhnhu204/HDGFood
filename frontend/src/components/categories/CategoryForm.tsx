'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { categoryService, type CategoryPayload } from '@/services/category.service'
import type { Category } from '@/types'

interface Props { category?: Category }

export default function CategoryForm({ category }: Props) {
  const router = useRouter()
  const isEdit = !!category
  const [saving, setSaving] = useState(false)
  const [allCats, setAllCats] = useState<Category[]>([])
  const [form, setForm] = useState<CategoryPayload>({
    name:        category?.name ?? '',
    parent_id:   category?.parent_id ?? null,
    description: category?.description ?? '',
    image:       category?.image ?? '',
    is_active:   category?.is_active ?? true,
    sort_order:  category?.sort_order ?? 0,
  })
  const [slug, setSlug] = useState(category?.slug ?? '')

  useEffect(() => {
    categoryService.getAll().then(res => {
      const data = (res as any).data as Category[]
      // Loại bỏ chính nó và các con của nó
      setAllCats(data.filter(c => c.id !== category?.id))
    }).catch(() => {})
  }, [category?.id])

  // Auto slug
  useEffect(() => {
    if (!isEdit) {
      setSlug(form.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
        .trim().replace(/\s+/g, '-'))
    }
  }, [form.name, isEdit])

  const set = (k: keyof CategoryPayload, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Chưa nhập tên danh mục.'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await categoryService.update(category!.id, form)
        toast.success('Đã cập nhật danh mục.')
      } else {
        await categoryService.create(form)
        toast.success('Đã thêm danh mục.')
      }
      router.push('/admin/categories')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Có lỗi xảy ra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'Sửa danh mục' : 'Thêm danh mục'}</h1>
        </div>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 shadow-sm">
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Lưu danh mục'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
        {/* Tên */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên danh mục *</label>
          <input
            value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="VD: Trà sữa, Món chính..."
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Slug {!isEdit && <span className="text-xs font-normal text-slate-400">— tự động tạo</span>}
          </label>
          <input
            value={slug} onChange={e => setSlug(e.target.value)}
            readOnly={!isEdit}
            className="w-full border rounded-xl px-4 py-2.5 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        {/* Danh mục cha */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Danh mục cha</label>
          <select
            value={form.parent_id ?? ''}
            onChange={e => set('parent_id', e.target.value ? Number(e.target.value) : null)}
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">— Không có (danh mục gốc) —</option>
            {allCats.map(c => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? `  └ ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ảnh */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">URL ảnh / icon</label>
          <input
            value={form.image ?? ''} onChange={e => set('image', e.target.value)}
            placeholder="https://..."
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          {form.image && (
            <img src={form.image} alt="preview" className="mt-2 w-20 h-20 rounded-xl object-cover border" />
          )}
        </div>

        {/* Mô tả */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mô tả</label>
          <textarea
            rows={3} value={form.description ?? ''}
            onChange={e => set('description', e.target.value)}
            placeholder="Mô tả ngắn, dùng cho SEO hoặc hiển thị frontend..."
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>

        {/* Cài đặt */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Trạng thái</label>
            <select
              value={form.is_active ? '1' : '0'}
              onChange={e => set('is_active', e.target.value === '1')}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="1">👁 Hiển thị</option>
              <option value="0">🙈 Ẩn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Thứ tự hiển thị</label>
            <input
              type="number" min={0} value={form.sort_order ?? 0}
              onChange={e => set('sort_order', Number(e.target.value))}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
      </form>
    </div>
  )
}
