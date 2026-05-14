'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { productService, type ProductPayload } from '@/services/product.service'
import api from '@/services/api'
import type { Category, Product } from '@/types'
import { TABS, emptyOption, type TabId, type OptionDraft } from './types'
import ProductFormTabs from './ProductFormTabs'

interface Props {
  product?: Product;
  productId?: number;
}

export default function ProductForm({ product: initialProduct, productId }: Props) {
  const router  = useRouter()
  const [product, setProduct] = useState<Product | undefined>(initialProduct)
  const isEdit  = !!(product || productId)
  const [tab, setTab]       = useState<TabId>('info')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!productId && !initialProduct)
  const [categories, setCategories] = useState<Category[]>([])

  const [form, setForm] = useState<ProductPayload>({
    category_id:      product?.category?.id ?? 0,
    name:             product?.name ?? '',
    description:      product?.description ?? '',
    long_description: (product as any)?.long_description ?? '',
    price:            product?.price ?? 0,
    sale_price:       product?.sale_price ?? null,
    stock:            product?.stock ?? 0,
    image:            product?.image ?? '',
    extra_images:     (product as any)?.extra_images ?? [],
    is_active:        product?.is_active ?? true,
    is_featured:      product?.is_featured ?? false,
    is_available:     product?.is_available ?? true,
    available_time:   product?.available_time ?? 'all',
    internal_note:    product?.internal_note ?? '',
    options:          (product?.options as OptionDraft[] | undefined) ?? [],
  })

  // Load product if productId provided
  useEffect(() => {
    if (productId && !initialProduct) {
      setLoading(true)
      productService.getById(productId)
        .then(p => {
          setProduct(p)
          setForm({
            category_id:      p.category?.id ?? 0,
            name:             p.name ?? '',
            description:      p.description ?? '',
            long_description: (p as any).long_description ?? '',
            price:            p.price ?? 0,
            sale_price:       p.sale_price ?? null,
            stock:            p.stock ?? 0,
            image:            p.image ?? '',
            extra_images:     (p as any).extra_images ?? [],
            is_active:        p.is_active ?? true,
            is_featured:      p.is_featured ?? false,
            is_available:     p.is_available ?? true,
            available_time:   p.available_time ?? 'all',
            internal_note:    p.internal_note ?? '',
            options:          (p.options as OptionDraft[] | undefined) ?? [],
          })
        })
        .finally(() => setLoading(false))
    }
  }, [productId, initialProduct])

  useEffect(() => {
    api.get<{ data: Category[] }>('/categories')
      .then(r => {
        setCategories(r.data.data)
        if (!isEdit && r.data.data.length > 0) {
          setForm(f => ({ ...f, category_id: r.data.data[0].id }))
        }
      })
      .catch(() => {})
  }, [isEdit])

  const set = (k: keyof ProductPayload, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const addOption    = () => set('options', [...(form.options ?? []), emptyOption()])
  const removeOption = (i: number) => set('options', (form.options as OptionDraft[]).filter((_, idx) => idx !== i))
  const updateOption = (i: number, patch: Partial<OptionDraft>) =>
    set('options', (form.options as OptionDraft[]).map((o, idx) => idx === i ? { ...o, ...patch } : o))
  const addValue = (oi: number) =>
    updateOption(oi, { values: [...(form.options as OptionDraft[])[oi].values, { label: '', price_extra: 0 }] })
  const removeValue = (oi: number, vi: number) =>
    updateOption(oi, { values: (form.options as OptionDraft[])[oi].values.filter((_, idx) => idx !== vi) })
  const updateValue = (oi: number, vi: number, patch: Partial<{ label: string; price_extra: number }>) =>
    updateOption(oi, { values: (form.options as OptionDraft[])[oi].values.map((v, idx) => idx === vi ? { ...v, ...patch } : v) })

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Chưa nhập tên món.'); setTab('info'); return }
    if (!form.price || form.price <= 0) { toast.error('Giá phải lớn hơn 0.'); setTab('price'); return }
    if (!form.category_id) { toast.error('Chưa chọn danh mục.'); setTab('info'); return }

    setSaving(true)
    try {
      if (isEdit) {
        const targetId = product?.id || productId
        if (!targetId) throw new Error('Missing ID')
        await productService.update(targetId, form)
        toast.success('Đã cập nhật sản phẩm.')
      } else {
        await productService.create(form)
        toast.success('Đã thêm sản phẩm.')
      }
      router.push('/admin/products')
    } catch {
      toast.error('Có lỗi xảy ra, thử lại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#ed2a2a]" />
        <p className="font-bold text-xs uppercase tracking-widest">Đang tải dữ liệu sản phẩm...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
            </h1>
            {isEdit && <p className="text-sm text-slate-500 mt-0.5">{product!.name}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 shadow-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Lưu sản phẩm'}
        </button>
      </div>

      {/* Quick toggles — chỉ hiện khi edit */}
      {isEdit && (
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => set('is_active', !form.is_active)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              form.is_active ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
          >
            {form.is_active ? '✅ Đang bán' : '⏸ Ngưng bán'}
          </button>
          <button
            type="button"
            onClick={() => set('is_available', !form.is_available)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              form.is_available ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-red-50 border-red-300 text-red-600'
            }`}
          >
            {form.is_available ? '📦 Còn hàng' : '❌ Hết hàng'}
          </button>
          <button
            type="button"
            onClick={() => set('is_featured', !form.is_featured)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              form.is_featured ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
          >
            {form.is_featured ? '⭐ Nổi bật' : '☆ Thường'}
          </button>
        </div>
      )}

      {/* Tabs content */}
      <ProductFormTabs
        tab={tab} setTab={setTab}
        form={form} set={set}
        categories={categories}
        addOption={addOption} removeOption={removeOption} updateOption={updateOption}
        addValue={addValue} removeValue={removeValue} updateValue={updateValue}
      />
    </div>
  )
}
