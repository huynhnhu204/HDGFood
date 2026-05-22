'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, X, Plus, Trash2, ChevronDown, ChevronUp, Package,
  Star, Clock, AlertCircle, Link2, Link2Off, Layers, DollarSign, 
  Settings2, Camera, StickyNote, Copy, History, Minus, CheckCircle2,
  XCircle, TrendingUp, RefreshCw, ExternalLink
} from 'lucide-react'
import ImageUploader from './ImageUploaderV2'
import NutritionConfig, { type NutritionData } from './NutritionConfig'
import { toast } from 'sonner'
import { productService, type ProductPayload } from '@/services/product.service'
import api from '@/services/api'
import type { Category, Product } from '@/types'
import { emptyOption, TIME_OPTS, type OptionDraft } from './types'

/* ── Helpers ───────────────────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

function slugify(str: string): string {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

interface ValidationErrors {
  name?: string
  category_id?: string
  price?: string
  stock?: string
  image?: string
  options?: string
  [key: string]: string | undefined
}

interface Props {
  product?: Product
  productId?: number
}

export default function ProductCreateForm({ product: initialProduct, productId }: Props) {
  const router = useRouter()
  const isEdit = !!(initialProduct || productId)
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit && !initialProduct)
  const [product, setProduct] = useState<Product | null>(initialProduct || null)
  const [categories, setCategories] = useState<Category[]>([])
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [autoSlug, setAutoSlug] = useState(true)
  const [slug, setSlug] = useState('')
  const [stats, setStats] = useState<{ total_orders: number; total_revenue: number } | null>(null)
  const [cloning, setCloning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Inventory Modals
  const [showLogModal, setShowLogModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)

  const [form, setForm] = useState<ProductPayload>({
    category_id:      initialProduct?.category?.id ?? 0,
    name:             initialProduct?.name ?? '',
    description:      initialProduct?.description ?? '',
    long_description: (initialProduct as any)?.long_description ?? '',
    price:            initialProduct?.price ?? 0,
    stock:            initialProduct?.stock ?? 0,
    image:            initialProduct?.image ?? '',
    extra_images:     (initialProduct as any)?.extra_images ?? [],
    is_active:        initialProduct?.is_active ?? true,
    is_featured:      initialProduct?.is_featured ?? false,
    is_available:     initialProduct?.is_available ?? true,
    available_time:   initialProduct?.available_time ?? 'all',
    internal_note:    initialProduct?.internal_note ?? '',
    stock_note:       '',
    options:          (initialProduct?.options as OptionDraft[] | undefined) ?? [],
    nutrition:        (initialProduct as any)?.nutrition ?? {},
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isEdit && !initialProduct && productId) {
          const p = await productService.getById(productId)
          setProduct(p)
          setForm({
             category_id:      p.category?.id ?? 0,
             name:             p.name ?? '',
             description:      p.description ?? '',
             long_description: (p as any).long_description ?? '',
             price:            p.price ?? 0,
             stock:            p.stock ?? 0,
             image:            p.image ?? '',
             extra_images:     (p as any).extra_images ?? [],
             is_active:        p.is_active ?? true,
             is_featured:      p.is_featured ?? false,
             is_available:     p.is_available ?? true,
             available_time:   p.available_time ?? 'all',
             internal_note:    p.internal_note ?? '',
             stock_note:       '',
             options:          (p.options as OptionDraft[] | undefined) ?? [],
             nutrition:        (p as any).nutrition ?? {},
          })
          setSlug(p.slug || '')
          if (p.slug) setAutoSlug(false)
        }

        const id = initialProduct?.id || productId
        if (id) {
          productService.getStats(id).then(setStats)
        }

        const res = await api.get<{ data: Category[] }>('/categories')
        setCategories(res.data.data)
        if (!isEdit && res.data.data.length > 0 && !form.category_id) {
          setForm(f => ({ ...f, category_id: res.data.data[0].id }))
        }
      } catch (err) {
        if (isEdit) {
           toast.error('Không tìm thấy sản phẩm.')
           router.push('/admin/products')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [productId, initialProduct, isEdit, router])

  useEffect(() => {
    if (autoSlug && form.name) {
      setSlug(slugify(form.name))
    }
  }, [form.name, autoSlug])

  const set = useCallback((k: keyof ProductPayload, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(prev => {
      if (prev[k]) { const next = { ...prev }; delete next[k]; return next }
      return prev
    })
  }, [])

  const handleClone = async () => {
    const id = product?.id || productId
    if (!id) return
    setCloning(true)
    try {
      const cloned = await productService.clone(id)
      toast.success('Đã nhân bản sản phẩm thành công!')
      router.push(`/admin/products/${cloned.id}/edit`)
    } catch (err) { toast.error('Không thể nhân bản.') }
    finally { setCloning(false) }
  }

  const handleDelete = async () => {
    const id = product?.id || productId
    if (!id) return
    if (!confirm('Xác nhận xóa sản phẩm này?')) return
    setDeleting(true)
    try {
      await productService.remove(id)
      toast.success('Đã xóa sản phẩm.')
      router.push('/admin/products')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(typeof msg === 'string' && msg.trim() ? msg : 'Không thể xóa.')
    }
    finally { setDeleting(false) }
  }

  const handleSubmit = async () => {
    const e: ValidationErrors = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên sản phẩm.'
    if (!form.category_id) e.category_id = 'Vui lòng chọn danh mục.'
    if (!form.price || form.price <= 0) e.price = 'Giá bán phải lớn hơn 0.'
    setErrors(e)
    if (Object.keys(e).length > 0) { toast.error('Vui lòng kiểm tra lại form.'); return }

    setSaving(true)
    try {
      const targetId = product?.id || productId
      const payload = { ...form, slug }
      
      if (isEdit && targetId) {
        const updated = await productService.update(targetId, payload)
        setProduct(updated)
        toast.success('Cập nhật thành công!')
        
        // Reload product data to get latest info including health score
        const refreshed = await productService.getById(targetId)
        setProduct(refreshed)
        setForm({
          category_id:      refreshed.category?.id ?? 0,
          name:             refreshed.name ?? '',
          description:      refreshed.description ?? '',
          long_description: (refreshed as any).long_description ?? '',
          price:            refreshed.price ?? 0,
          stock:            refreshed.stock ?? 0,
          image:            refreshed.image ?? '',
          extra_images:     (refreshed as any).extra_images ?? [],
          is_active:        refreshed.is_active ?? true,
          is_featured:      refreshed.is_featured ?? false,
          is_available:     refreshed.is_available ?? true,
          available_time:   refreshed.available_time ?? 'all',
          internal_note:    refreshed.internal_note ?? '',
          stock_note:       '',
          options:          (refreshed.options as OptionDraft[] | undefined) ?? [],
          nutrition:        (refreshed as any).nutrition ?? {},
        })
        
        // Trigger a custom event to notify other components
        window.dispatchEvent(new CustomEvent('product-updated', { 
          detail: { productId: targetId, product: refreshed } 
        }))
      } else {
        const created = await productService.create(payload)
        toast.success('Tạo thành công!')
        router.push(`/admin/products/${created.id}/edit`)
      }
    } catch (err: any) {
      toast.error('Có lỗi xảy ra.')
      console.error('Submit error:', err)
    } finally { setSaving(false) }
  }

  const inputCls = (field?: string) =>
    `w-full border rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 outline-none
     bg-slate-50/80 focus:bg-white
     ${field && errors[field]
       ? 'border-red-300 ring-4 ring-red-50 focus:border-[#ed2a2a]'
       : 'border-slate-200 focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50'}`

  if (loading) return <div className="p-8"><div className="h-20 bg-slate-100 rounded-xl animate-pulse mb-6"/><div className="grid grid-cols-3 gap-6"><div className="col-span-2 h-[500px] bg-slate-50 rounded-2xl animate-pulse"/><div className="h-[500px] bg-slate-50 rounded-2xl animate-pulse"/></div></div>

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-[#ed2a2a] transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
               <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                 {isEdit ? `Chỉnh sửa: ${product?.name}` : 'Thêm sản phẩm mới'}
               </h1>
               {isEdit && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    form.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {form.is_active ? 'Đang bán' : 'Tạm dừng'}
                  </span>
               )}
            </div>
            <p className="text-[13px] font-medium text-slate-400 mt-0.5">
              {isEdit ? `ID: SP-${String(product?.id).padStart(5, '0')}` : 'Điền thông tin món mới'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEdit && (
             <>
               <button onClick={handleClone} disabled={cloning} className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-blue-50 transition-all shadow-sm">
                 <Copy className="w-4 h-4" /> {cloning ? '...' : 'Nhân bản'}
               </button>
               <button onClick={handleDelete} disabled={deleting} className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white border border-red-100 rounded-xl text-xs font-black text-red-500 hover:bg-red-50 transition-all shadow-sm">
                 <Trash2 className="w-4 h-4" /> Xóa
               </button>
             </>
          )}
          <button onClick={handleSubmit} disabled={saving} className="btn-primary text-xs shadow-xl shadow-red-500/20">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {isEdit && (
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Đơn hàng" value={stats?.total_orders.toLocaleString() || '0'} icon={<TrendingUp className="w-4 h-4 text-blue-600"/>} color="blue"/>
            <StatCard label="Doanh thu" value={fmt(stats?.total_revenue || 0)} icon={<DollarSign className="w-4 h-4 text-emerald-600"/>} color="emerald"/>
            <StatCard label="Tồn kho" value={(form.stock || 0) + ' món'} icon={<Package className="w-4 h-4 text-amber-600"/>} color="amber" warning={form.stock !== undefined && form.stock < 10}/>
            <StatCard label="Rating" value="4.9" icon={<Star className="w-4 h-4 text-violet-600"/>} color="violet"/>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Thông tin chung" icon={<Package className="text-blue-500" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên sản phẩm *</label>
                <div className="flex gap-2">
                   <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls('name')} placeholder="Nhập tên món ăn..." />
                   <button type="button" onClick={() => { setSlug(slugify(form.name)); setAutoSlug(true); }} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:text-[#ed2a2a] transition-all" title="Tạo lại slug">
                      <RefreshCw className="w-4 h-4" />
                   </button>
                </div>
                {errors.name && <p className="text-xs font-bold text-[#ed2a2a] mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Danh mục *</label>
                    <select value={form.category_id} onChange={e => set('category_id', Number(e.target.value))} className={inputCls('category_id')}>
                       {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Đường dẫn (Slug)</label>
                    <div className="relative">
                       <input value={slug} readOnly={autoSlug} onChange={e => setSlug(e.target.value)} className={`${inputCls()} ${autoSlug ? 'bg-slate-100 text-slate-400' : ''}`} />
                       <button type="button" onClick={() => setAutoSlug(!autoSlug)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400 hover:text-[#ed2a2a]">
                          {autoSlug ? <Link2Off className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                       </button>
                    </div>
                 </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả ngắn</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls()} placeholder="Mô tả ngắn gọn hiển thị gần giá sản phẩm..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Mô tả chi tiết (Sản phẩm đặc sắc)
                  <span className="ml-2 text-xs font-normal text-slate-400">Hỗ trợ HTML</span>
                </label>
                <textarea
                  value={(form as any).long_description ?? ''}
                  onChange={e => set('long_description' as any, e.target.value)}
                  rows={8}
                  className={inputCls()}
                  placeholder="Nhập mô tả chi tiết về món ăn, nguyên liệu, cách chế biến... (có thể dùng HTML)"
                />
                <p className="text-xs text-slate-400 mt-1">Hiển thị ở phần "Sản phẩm đặc sắc" trên trang chi tiết</p>
              </div>
            </div>
          </Card>

          <Card title="Tùy chọn & Toppings" icon={<Layers className="text-violet-500" />}>
             <div className="space-y-4">
                {(form.options as OptionDraft[] ?? []).map((opt, oi) => (
                   <div key={oi} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                      <div className="flex items-center gap-3 mb-4">
                         <input value={opt.name} onChange={e => {
                            const newOpts = [...(form.options as OptionDraft[])]; newOpts[oi].name = e.target.value; set('options', newOpts);
                         }} placeholder="Tên nhóm (Size, Đá...)" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-[#ed2a2a] focus:outline-none" />
                         <button onClick={() => {
                            set('options', (form.options as OptionDraft[]).filter((_, i) => i !== oi))
                         }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                      </div>
                      <div className="space-y-2">
                         {opt.values.map((v, vi) => (
                            <div key={vi} className="flex gap-2">
                               <input value={v.label} onChange={e => {
                                  const newOpts = [...(form.options as OptionDraft[])]; newOpts[oi].values[vi].label = e.target.value; set('options', newOpts);
                               }} placeholder="Nhãn" className="flex-1 bg-white border border-slate-100 rounded-lg px-3 py-1.5 text-xs focus:border-[#ed2a2a] outline-none" />
                               <input type="number" value={v.price_extra} onChange={e => {
                                  const newOpts = [...(form.options as OptionDraft[])]; newOpts[oi].values[vi].price_extra = Number(e.target.value); set('options', newOpts);
                               }} placeholder="+0đ" className="w-24 bg-white border border-slate-100 rounded-lg px-3 py-1.5 text-xs focus:border-[#ed2a2a] outline-none" />
                               <button onClick={() => {
                                  const newOpts = [...(form.options as OptionDraft[])]; newOpts[oi].values = newOpts[oi].values.filter((_, i) => i !== vi); set('options', newOpts);
                               }} className="p-1 text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                            </div>
                         ))}
                         <button onClick={() => {
                            const newOpts = [...(form.options as OptionDraft[])]; newOpts[oi].values.push({ label: '', price_extra: 0 }); set('options', newOpts);
                         }} className="text-[11px] font-black text-blue-600 hover:underline uppercase tracking-widest">+ Thêm giá trị</button>
                      </div>
                   </div>
                ))}
                <button onClick={() => set('options', [...(form.options as OptionDraft[] ?? []), emptyOption()])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-[#ed2a2a] hover:text-[#ed2a2a] transition-all">
                   + Thêm nhóm tùy chọn
                </button>
             </div>
          </Card>
        </div>

        {/* Side Column */}
        <div className="space-y-6">
          <Card title="Hình ảnh" icon={<Camera className="text-pink-500" />}>
            <ImageUploader form={form} set={set} productId={product?.id || productId} />
          </Card>

          <Card title="Giá & Kho" icon={<DollarSign className="text-emerald-500" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Giá gốc (đ) *</label>
                <div className="relative">
                   <input type="number" value={form.price || ''} onChange={e => set('price', Number(e.target.value))} className={inputCls('price')} />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">VNĐ</span>
                </div>
              </div>

              {/* Promotion Alert */}
              {isEdit && product?.active_promotion && (
                 <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-[#ed2a2a] shrink-0 mt-0.5" />
                    <div className="flex-1">
                       <p className="text-[13px] font-black text-[#ed2a2a]">Đang áp dụng ưu đãi:</p>
                       <p className="text-xs font-bold text-slate-700 mt-1">
                          {product.active_promotion.name} <span className="text-[#ed2a2a]">({product.active_promotion.discount_label})</span>
                       </p>
                       <Link 
                         href={`/admin/promotions/${product.active_promotion.id}/edit`}
                         className="inline-flex items-center gap-1 text-[11px] font-black text-blue-600 hover:underline uppercase tracking-widest mt-2"
                        >
                          Chỉnh sửa CTKM <ExternalLink className="w-3 h-3" />
                       </Link>
                    </div>
                 </div>
              )}

              <div className="pt-2">
                 <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-slate-700">Tồn kho hiện tại: <span className="text-slate-900 font-black">{form.stock || 0}</span></label>
                    {isEdit && (
                       <div className="flex gap-2">
                          <button onClick={() => setShowLogModal(true)} className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"><History className="w-4 h-4"/></button>
                          <button onClick={() => setShowAdjustModal(true)} className="p-1.5 bg-[#ed2a2a] rounded-lg text-white hover:bg-red-600 transition-all shadow-sm shadow-red-500/10"><Plus className="w-4 h-4"/></button>
                       </div>
                    )}
                 </div>
                 {!isEdit && (
                    <input type="number" value={form.stock || 0} onChange={e => set('stock', Number(e.target.value))} className={inputCls()} />
                 )}
              </div>
            </div>
          </Card>

          <Card title="Cài đặt khác" icon={<Settings2 className="text-amber-500" />}>
             <div className="space-y-4">
                <Toggle title="Mở bán công khai" checked={form.is_active ?? true} onChange={v => set('is_active', v)} />
                <Toggle title="Sản phẩm nổi bật" checked={form.is_featured ?? false} onChange={v => set('is_featured', v)} />
                <div className="pt-2">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Thời gian bán</p>
                   <div className="flex flex-wrap gap-2">
                      {TIME_OPTS.map(t => (
                         <button key={t.value} onClick={() => set('available_time', t.value)} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${form.available_time === t.value ? 'bg-red-50 border-[#ed2a2a] text-[#ed2a2a] shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                            {t.label}
                         </button>
                      ))}
                   </div>
                </div>
             </div>
          </Card>

          {/* Nutrition Config */}
          <NutritionConfig
            value={form.nutrition as NutritionData ?? {}}
            onChange={(data) => set('nutrition', data)}
          />
        </div>
      </div>

      {/* Sticky Bottom Actions (Mobile) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         <button onClick={handleSubmit} disabled={saving} className="w-full py-3.5 bg-[#ed2a2a] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all active:scale-95">
            {saving ? '...' : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
         </button>
      </div>

      {/* Modals */}
      {showAdjustModal && <AdjustModal product={product!} onClose={() => setShowAdjustModal(false)} onUpdate={(s: number) => set('stock', s)} />}
      {showLogModal && <HistoryModal product={product!} onClose={() => setShowLogModal(false)} />}
    </div>
  )
}

function Card({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
         <div className="p-1.5 bg-white rounded-xl shadow-sm">{icon}</div>
         <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function StatCard({ label, value, icon, color, warning }: any) {
  const colors: any = { blue: 'bg-blue-50', emerald: 'bg-emerald-50', amber: 'bg-amber-50', violet: 'bg-violet-50' }
  return (
    <div className={`bg-white p-5 rounded-2xl border ${warning ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-200'} shadow-sm`}>
       <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>{icon}</div>
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
       <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  )
}

function Toggle({ title, checked, onChange }: any) {
  return (
    <button onClick={() => onChange(!checked)} className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all group">
       <span className={`text-[13px] font-bold ${checked ? 'text-slate-900' : 'text-slate-400'}`}>{title}</span>
       <div className={`w-10 h-5.5 rounded-full relative transition-all ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-all ${checked ? 'left-5' : 'left-0.5'}`}/>
       </div>
    </button>
  )
}

function AdjustModal({ product, onClose, onUpdate }: any) {
   const [val, setVal] = useState(0)
   const [note, setNote] = useState('')
   const [loading, setLoading] = useState(false)
   const handle = async () => {
      setLoading(true)
      try {
         const res = await productService.addInventoryLog(product.id, { change: val, note: note || 'Điều chỉnh thủ công' })
         onUpdate(res.stock_after)
         toast.success('Đã cập nhật kho!')
         onClose()
      } finally { setLoading(false) }
   }
   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
         <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">Điều chỉnh tồn kho</h3>
            <div className="flex items-center justify-center gap-8 bg-slate-50 p-6 rounded-2xl mb-6">
               <button onClick={() => setVal(v => v - 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm font-black text-lg">-</button>
               <span className="text-4xl font-black">{val > 0 ? `+${val}` : val}</span>
               <button onClick={() => setVal(v => v + 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm font-black text-lg">+</button>
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú (VD: Kiểm kho...)" className="w-full p-4 border border-slate-100 rounded-2xl text-sm mb-6 focus:border-[#ed2a2a] outline-none h-24 resize-none" />
            <div className="grid grid-cols-2 gap-3">
               <button onClick={onClose} className="py-3 text-xs font-black uppercase text-slate-400">Hủy</button>
               <button onClick={handle} disabled={loading || val === 0} className="py-3 bg-[#ed2a2a] text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-red-500/20">Xác nhận</button>
            </div>
         </div>
      </div>
   )
}

function HistoryModal({ product, onClose }: any) {
   const [logs, setLogs] = useState([])
   const [loading, setLoading] = useState(true)
   useEffect(() => { productService.getInventoryLogs(product.id).then(r => setLogs(r.data)).finally(() => setLoading(false)) }, [product.id])
   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
         <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Lịch sử biến động kho</h3>
               <button onClick={onClose}><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
               {loading ? <p className="text-center py-10 animate-pulse">Đang tải...</p> : logs.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-4 p-4 border border-slate-50 rounded-2xl">
                     <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${l.change > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {l.change > 0 ? `+${l.change}` : l.change}
                     </span>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{l.note || 'Điều chỉnh kho'}</p>
                        <p className="text-[10px] text-slate-400 ">{new Date(l.created_at).toLocaleString('vi-VN')} • Tồn sau: {l.stock_after}</p>
                     </div>
                  </div>
               ))}
            </div>
            <div className="p-4 text-center border-t border-slate-50"><button onClick={onClose} className="text-xs font-black uppercase text-[#ed2a2a]">Đóng</button></div>
         </div>
      </div>
   )
}
