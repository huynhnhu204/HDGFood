'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Tag, LayoutDashboard, Globe, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { categoryService, type CategoryPayload } from '@/services/category.service'

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const categoryId = Number(resolvedParams.id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState<CategoryPayload & { is_active: boolean }>({
    name: '',
    description: '',
    image: '',
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    categoryService.getById(categoryId)
      .then(cat => {
        setForm({
          name: cat.name,
          description: cat.description ?? '',
          image: cat.image ?? '',
          sort_order: cat.sort_order ?? 0,
          is_active: cat.is_active,
        })
        setLoading(false)
      })
      .catch(() => {
        toast.error('Không tìm thấy danh mục.')
        router.push('/admin/categories')
      })
  }, [categoryId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên danh mục.')
    
    setSaving(true)
    try {
      await categoryService.update(categoryId, form)
      toast.success('Đã cập nhật danh mục thành công.')
      router.push('/admin/categories')
    } catch {
      toast.error('Có lỗi xảy ra khi cập nhật.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <RefreshCcw className="w-10 h-10 text-slate-300 animate-spin" />
      <p className="mt-4 text-slate-400 font-bold tracking-widest uppercase text-xs">Đang tải dữ liệu...</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-24 lg:pb-10">
      {/* Action Bar (Sticky Top) */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
              <Tag className="w-6 h-6 text-[#ed2a2a]" />
              Sửa Danh Mục
            </h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Cập nhật thông tin phân loại</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="hidden sm:flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Cập Nhật
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Tên Danh Mục <span className="text-[#ed2a2a]">*</span></label>
            <input
              required
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="VD: Trà sữa, Món chính..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Thứ Tự Sắp Xếp</label>
            <input
              type="number"
              min={0}
              value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Mô Tả Danh Mục</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Mô tả tóm tắt về danh mục này..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide flex justify-between">
            <span>URL Hình Ảnh</span>
            {form.image && <span className="text-[#ed2a2a] normal-case">Ảnh Hiện Tại</span>}
          </label>
          <div className="relative group">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ed2a2a] transition-colors" />
            <input
              type="text"
              value={form.image}
              onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
            />
          </div>
          {form.image && (
             <div className="mt-4 relative w-full aspect-[21/9] rounded-2xl overflow-hidden border-2 border-slate-100 group">
                <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">Ảnh Xem Trước</span>
                </div>
             </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-[14px] font-bold text-slate-800">{form.is_active ? 'Đang Hiển Thị' : 'Mục Đang Ẩn'}</p>
                   <p className="text-xs text-slate-500">Người dùng sẽ {form.is_active ? 'thấy' : 'không thấy'} danh mục này trên web</p>
                </div>
            </div>
            <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-[#ed2a2a]' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.is_active ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40">
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#ed2a2a] text-white rounded-2xl text-[15px] font-black shadow-[0_8px_30px_rgba(237,42,42,0.4)] active:scale-95 transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Cập Nhật Danh Mục
        </button>
      </div>
    </form>
  )
}
