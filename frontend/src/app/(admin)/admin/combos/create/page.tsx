'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Percent, DollarSign, Search, X, Check,
  CalendarDays, Tag, AlertCircle, Package, Grid3X3, Plus, Trash2,
  ChevronDown, Image as ImageIcon, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { comboAdminService } from '@/services/admin/combo-admin.service'
import api from '@/services/api'
import type { Product } from '@/types'
import type { ComboGroup } from '@/types/combo'

/* ── Helpers ───────────────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

function toLocalDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

const defaultEnd = toLocalDateTime(new Date(Date.now() + 30 * 86400000))
const QUICK_SEARCH_KEYS = ['Cơm', 'Gà', 'Bò', 'Heo', 'Hải sản', 'Mì', 'Canh', 'Trà sữa', 'Nước', 'Tráng miệng']

interface FormErrors {
  name?: string
  discount_value?: string
  start_date?: string
  end_date?: string
  groups?: string
  [key: string]: string | undefined
}

interface GroupForm {
  id?: number
  name: string
  description: string
  required: boolean
  min_required: number
  max_required: number
  product_ids: number[]
  product_quantities: Record<number, number>
}

type PickerTarget = { type: 'core' } | { type: 'group'; index: number } | null

export default function CreateComboPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState<PickerTarget>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [coreProductIds, setCoreProductIds] = useState<number[]>([])
  const [coreProductQuantities, setCoreProductQuantities] = useState<Record<number, number>>({})

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    start_date: '',
    end_date: defaultEnd,
    is_active: true,
    show_on_homepage: false,
  })
  const [priceInputMode, setPriceInputMode] = useState<'discount' | 'final_price'>('final_price')
  const [comboFinalPriceInput, setComboFinalPriceInput] = useState('')

  const [groups, setGroups] = useState<GroupForm[]>([])

  const handleUploadImage = async (file?: File) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ url: string }>('/admin/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImageUrl(res.data.url || '')
      toast.success('Upload ảnh thành công.')
    } catch {
      toast.error('Upload ảnh thất bại.')
    } finally {
      setUploadingImage(false)
    }
  }

  /* ── Load products ── */
  useEffect(() => {
    api.get<{ data: Product[] }>('/admin/products', { params: { per_page: 1000 } })
      .then(r => setProducts(r.data.data || []))
      .catch(() => {
        // Fallback nếu endpoint admin có thay đổi
        api.get<{ data: Product[] }>('/products', { params: { per_page: 1000 } })
          .then(res => setProducts(res.data.data || []))
          .catch(() => setProducts([]))
      })
  }, [])

  /* ── Setter ── */
  const set = useCallback((k: string, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(prev => {
      if (prev[k]) { const n = { ...prev }; delete n[k]; return n }
      return prev
    })
  }, [])

  /* ── Product filtering ── */
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const q = productSearch.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.category?.name?.toLowerCase().includes(q)
    )
  }, [products, productSearch])

  const suggestedSearchKeys = useMemo(() => {
    const categoryKeys = products
      .map((p) => p.category?.name?.trim())
      .filter((v): v is string => Boolean(v && v.length > 1))
    const mixed = [...QUICK_SEARCH_KEYS, ...categoryKeys]
    return Array.from(new Set(mixed)).slice(0, 12)
  }, [products])

  /* ── Group operations ── */
  const addGroup = () => {
    setGroups(prev => [...prev, {
      name: '',
      description: '',
      required: false,
      min_required: 0,
      max_required: 1,
      product_ids: [],
      product_quantities: {}
    }])
  }

  const updateGroup = (index: number, data: Partial<GroupForm>) => {
    setGroups(prev => prev.map((g, i) => i === index ? { ...g, ...data } : g))
  }

  const toggleGroupRequired = (index: number, required: boolean) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== index) return g
      if (required) {
        const nextMin = Math.max(1, g.min_required || 0)
        const nextMax = Math.max(nextMin, g.max_required || 0)
        return { ...g, required: true, min_required: nextMin, max_required: nextMax }
      }
      return { ...g, required: false, min_required: 0, max_required: Math.max(1, g.max_required || 1) }
    }))
  }

  const removeGroup = (index: number) => {
    setGroups(prev => prev.filter((_, i) => i !== index))
  }

  /* ── Toggle product in group ── */
  const toggleCoreProduct = (productId: number) => {
    setCoreProductIds((prev) => {
      const isExist = prev.includes(productId)
      if (isExist) {
        setCoreProductQuantities((q) => {
          const next = { ...q }
          delete next[productId]
          return next
        })
        return prev.filter((id) => id !== productId)
      }
      setCoreProductQuantities((q) => ({ ...q, [productId]: 1 }))
      return [...prev, productId]
    })
  }

  const updateCoreProductQuantity = (productId: number, quantity: number) => {
    setCoreProductQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, Number(quantity) || 1),
    }))
  }

  const toggleProductInGroup = (groupIndex: number, productId: number) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== groupIndex) return g
      const isExist = g.product_ids.includes(productId)
      if (isExist) {
        const nextQty = { ...(g.product_quantities || {}) }
        delete nextQty[productId]
        return { ...g, product_ids: g.product_ids.filter(id => id !== productId), product_quantities: nextQty }
      }
      return {
        ...g,
        product_ids: [...g.product_ids, productId],
        product_quantities: { ...(g.product_quantities || {}), [productId]: 1 },
      }
    }))
  }

  const updateProductQuantityInGroup = (groupIndex: number, productId: number, quantity: number) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== groupIndex) return g
      return {
        ...g,
        product_quantities: {
          ...(g.product_quantities || {}),
          [productId]: Math.max(1, Number(quantity) || 1),
        },
      }
    }))
  }

  /* ── Calculate base price preview ── */
  const basePricePreview = useMemo(() => {
    const coreTotal = coreProductIds.reduce((sum, pid) => {
      const p = products.find(pr => pr.id === pid)
      if (!p) return sum
      const qty = Math.max(1, Number(coreProductQuantities?.[pid] || 1))
      return sum + Number(p.sale_price || p.price || 0) * qty
    }, 0)

    const optionTotal = groups.reduce((sum, g) => {
      return sum + g.product_ids.reduce((inner, pid) => {
        const p = products.find(pr => pr.id === pid)
        if (!p) return inner
        const qty = Math.max(1, Number(g.product_quantities?.[pid] || 1))
        return inner + Number(p.sale_price || p.price || 0) * qty
      }, 0)
    }, 0)
    return coreTotal + optionTotal
  }, [coreProductIds, coreProductQuantities, groups, products])

  const discountPreview = useMemo(() => {
    if (priceInputMode === 'final_price') {
      if (!comboFinalPriceInput || !basePricePreview) return null
      const finalValue = Math.max(0, Number(comboFinalPriceInput || 0))
      return Math.max(0, basePricePreview - finalValue)
    }

    if (!form.discount_value || !basePricePreview) return null
    const val = parseFloat(form.discount_value)
    if (isNaN(val) || val <= 0) return null

    if (form.discount_type === 'percent') {
      if (val > 100) return null
      return Math.round(basePricePreview * val / 100)
    } else {
      return Math.min(val, basePricePreview)
    }
  }, [priceInputMode, comboFinalPriceInput, form.discount_value, form.discount_type, basePricePreview])

  const finalPricePreview = useMemo(() => {
    if (priceInputMode === 'final_price') {
      if (!comboFinalPriceInput) return Math.max(0, basePricePreview)
      return Math.max(0, Number(comboFinalPriceInput || 0))
    }
    return Math.max(0, basePricePreview - (discountPreview || 0))
  }, [priceInputMode, comboFinalPriceInput, basePricePreview, discountPreview])

  /* ── Validate ── */
  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên combo.'
    if (coreProductIds.length === 0) e.groups = 'Vui lòng thêm ít nhất 1 món trong combo.'
    groups.forEach((g, i) => {
      if (!g.name.trim()) e[`group_${i}_name`] = `Nhóm ${i + 1}: Vui lòng nhập tên nhóm.`
      if (g.product_ids.length === 0) e[`group_${i}_products`] = `Nhóm ${i + 1}: Vui lòng chọn ít nhất 1 sản phẩm.`
      if (g.min_required > g.max_required) e[`group_${i}_min`] = `Nhóm ${i + 1}: Tối thiểu không được lớn hơn tối đa.`
      if (g.min_required < 0 || g.max_required < 0) e[`group_${i}_range`] = `Nhóm ${i + 1}: Số lượng không được âm.`
    })
    if (priceInputMode === 'discount') {
      if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
        e.discount_value = 'Vui lòng nhập giá trị giảm hợp lệ.'
      }
      if (form.discount_type === 'percent' && parseFloat(form.discount_value) > 100) {
        e.discount_value = 'Giảm giá % không được vượt quá 100%.'
      }
    } else {
      const finalValue = Number(comboFinalPriceInput || 0)
      if (!comboFinalPriceInput || finalValue <= 0) {
        e.discount_value = 'Vui lòng nhập giá combo hợp lệ.'
      }
      if (basePricePreview > 0 && finalValue > basePricePreview) {
        e.discount_value = 'Giá combo không nên lớn hơn tổng giá gốc.'
      }
    }
    if (form.start_date && form.end_date && new Date(form.start_date) >= new Date(form.end_date)) {
      e.end_date = 'Ngày kết thúc phải sau ngày bắt đầu.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!validate()) { toast.error('Vui lòng kiểm tra lại các trường bắt buộc.'); return }

    setSaving(true)
    try {
      const normalizedDiscount = (() => {
        if (priceInputMode === 'final_price') {
          const base = Math.max(0, Number(basePricePreview || 0))
          const finalValue = Math.max(0, Number(comboFinalPriceInput || 0))
          return {
            discount_type: 'fixed' as const,
            discount_value: Math.max(0, base - finalValue),
          }
        }
        return {
          discount_type: form.discount_type,
          discount_value: parseFloat(form.discount_value),
        }
      })()

      const comboData = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || undefined,
        image: imageUrl || undefined,
        discount_type: normalizedDiscount.discount_type,
        discount_value: normalizedDiscount.discount_value,
        is_active: form.is_active,
        show_on_homepage: form.show_on_homepage,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        groups: [
          {
            name: 'Món trong combo',
            description: 'Nhóm món mặc định của combo',
            min_required: coreProductIds.length,
            max_required: coreProductIds.length,
          },
          ...groups.map(g => ({
            name: g.name,
            description: g.description || undefined,
            min_required: g.min_required,
            max_required: g.max_required,
          })),
        ],
      }

      const result = await comboAdminService.create(comboData)
      toast.success('Đã tạo combo thành công!')

      // Add products to each group (group 0 = món trong combo)
      const createdGroups = ((result.data as any)?.active_groups || (result.data as any)?.groups || []) as Array<{ id: number }>
      const coreGroupId = createdGroups[0]?.id || 1
      if (coreProductIds.length > 0) {
        await comboAdminService.addProducts(
          result.data.id,
          coreGroupId,
          coreProductIds.map((pid) => ({
            product_id: pid,
            quantity: Math.max(1, Number(coreProductQuantities?.[pid] || 1)),
          }))
        )
      }

      for (let i = 0; i < groups.length; i++) {
        if (groups[i].product_ids.length === 0) continue
        const targetGroupId = createdGroups[i + 1]?.id || (i + 2)
        await comboAdminService.addProducts(result.data.id, targetGroupId,
          groups[i].product_ids.map(pid => ({
            product_id: pid,
            quantity: Math.max(1, Number(groups[i].product_quantities?.[pid] || 1)),
          }))
        )
      }

      router.push('/admin/combos')
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const se: FormErrors = {}
        Object.keys(err.response.data.errors).forEach(k => { se[k] = err.response.data.errors[k][0] })
        setErrors(se)
        toast.error('Dữ liệu không hợp lệ.')
      } else {
        toast.error(err.response?.data?.message || 'Có lỗi xảy ra.')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputCls = (field?: string) =>
    `w-full border rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 outline-none bg-slate-50/80 focus:bg-white
     ${field && errors[field] ? 'border-red-300 ring-4 ring-red-50 focus:border-[#ed2a2a]' : 'border-slate-200 focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50'}`

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="flex items-center gap-1.5 mt-1.5 text-[12px] font-bold text-[#ed2a2a]">
        <AlertCircle className="w-3.5 h-3.5" />
        {errors[field]}
      </p>
    ) : null

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/combos" className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Tạo Combo Mới</h1>
            <p className="text-[13px] font-medium text-slate-400 mt-0.5">Thiết lập gói combo cho phép khách chọn món</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary text-xs">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Tạo Combo'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 lg:w-[65%] space-y-6">
          {/* Card 1: Thông tin */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
               <Grid3X3 className="w-4.5 h-4.5 text-violet-600" />
               <h2 className="text-[15px] font-black text-slate-800">Thông tin combo</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên combo *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Combo Trưa Văn Phòng" className={inputCls('name')} />
                <FieldError field="name" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Slug (URL)</label>
                <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="auto-generated" className={inputCls()} />
                <p className="text-[11px] text-slate-400 mt-1">Để trống để tự động tạo từ tên</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Mô tả ngắn về combo..." className={inputCls()} />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Hình ảnh</label>
                <div className="flex gap-3">
                  {imageUrl && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                      <button onClick={() => setImageUrl('')} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      value={imageUrl} 
                      onChange={e => setImageUrl(e.target.value)} 
                      placeholder="https://... (URL ảnh)" 
                      className={inputCls()} 
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-slate-300">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {uploadingImage ? 'Đang upload...' : 'Tải ảnh từ máy'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            handleUploadImage(file)
                            e.currentTarget.value = ''
                          }}
                        />
                      </label>
                      <p className="text-[11px] text-slate-400">Hỗ trợ URL hoặc upload từ máy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Cài đặt giảm giá */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
               <Tag className="w-4.5 h-4.5 text-rose-600" />
               <h2 className="text-[15px] font-black text-slate-800">Cài đặt giảm giá</h2>
            </div>
            <div className="p-6 space-y-5">
               <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPriceInputMode('final_price')}
                    className={`rounded-xl border-2 px-3 py-3 text-xs font-black transition-all ${priceInputMode === 'final_price' ? 'border-[#ed2a2a] bg-red-50/20 text-[#ed2a2a]' : 'border-slate-100 text-slate-500'}`}
                  >
                    Nhập giá combo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceInputMode('discount')}
                    className={`rounded-xl border-2 px-3 py-3 text-xs font-black transition-all ${priceInputMode === 'discount' ? 'border-[#ed2a2a] bg-red-50/20 text-[#ed2a2a]' : 'border-slate-100 text-slate-500'}`}
                  >
                    Nhập mức giảm
                  </button>
               </div>

               {priceInputMode === 'final_price' ? (
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Giá combo *</label>
                   <input
                     type="number"
                     value={comboFinalPriceInput}
                     onChange={(e) => setComboFinalPriceInput(e.target.value)}
                     placeholder="VD: 69000"
                     className={inputCls('discount_value')}
                   />
                   <p className="mt-1 text-[11px] text-slate-400">
                     Tổng giá gốc hiện tại: {fmt(basePricePreview)}.
                   </p>
                   <FieldError field="discount_value" />
                 </div>
               ) : (
                 <>
               <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => set('discount_type', 'percent')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.discount_type === 'percent' ? 'border-[#ed2a2a] bg-red-50/20' : 'border-slate-100'}`}>
                    <Percent className={`w-5 h-5 ${form.discount_type === 'percent' ? 'text-[#ed2a2a]' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Giảm theo %</span>
                  </button>
                  <button type="button" onClick={() => set('discount_type', 'fixed')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.discount_type === 'fixed' ? 'border-[#ed2a2a] bg-red-50/20' : 'border-slate-100'}`}>
                    <DollarSign className={`w-5 h-5 ${form.discount_type === 'fixed' ? 'text-[#ed2a2a]' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Giảm số tiền</span>
                  </button>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Mức giảm *</label>
                 <input type="number" value={form.discount_value} onChange={e => set('discount_value', e.target.value)} className={inputCls('discount_value')} />
                 <FieldError field="discount_value" />
               </div>
                 </>
               )}
            </div>
          </div>

          {/* Card 3: Thời gian */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
               <CalendarDays className="w-4.5 h-4.5 text-blue-600" />
               <h2 className="text-[15px] font-black text-slate-800">Thời gian áp dụng</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-5">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ngày bắt đầu</label>
                  <input type="datetime-local" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls('start_date')} />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ngày kết thúc</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls('end_date')} />
                  <FieldError field="end_date" />
               </div>
            </div>
          </div>

          {/* Card 4: Món trong combo */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-4.5 h-4.5 text-[#ed2a2a]" />
                <h2 className="text-[15px] font-black text-slate-800">Món trong combo ({coreProductIds.length})</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProductPicker({ type: 'core' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-[#ed2a2a] rounded-lg text-xs font-bold border border-red-200 hover:bg-red-100 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm món
              </button>
            </div>
            <div className="p-6 space-y-3">
              <FieldError field="groups" />
              {coreProductIds.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">
                  Chưa có món nào trong combo.
                </div>
              ) : (
                coreProductIds.map((pid) => {
                  const p = products.find((pr) => pr.id === pid)
                  if (!p) return null
                  return (
                    <div key={pid} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-2.5 py-2">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-white border border-red-100 shrink-0">
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</p>
                        <p className="text-[11px] font-semibold text-red-600">{fmt(Number(p.sale_price || p.price || 0))}</p>
                      </div>
                      <div className="flex items-center gap-1 border border-red-200 rounded-lg px-1.5 py-1 bg-white">
                        <button type="button" onClick={() => updateCoreProductQuantity(pid, (coreProductQuantities?.[pid] || 1) - 1)} className="w-5 h-5 rounded text-red-700 hover:bg-red-50">-</button>
                        <input
                          type="number"
                          min={1}
                          value={coreProductQuantities?.[pid] || 1}
                          onChange={(e) => updateCoreProductQuantity(pid, Number(e.target.value))}
                          className="w-10 text-center text-xs font-bold text-slate-700 bg-transparent outline-none"
                        />
                        <button type="button" onClick={() => updateCoreProductQuantity(pid, (coreProductQuantities?.[pid] || 1) + 1)} className="w-5 h-5 rounded text-red-700 hover:bg-red-50">+</button>
                      </div>
                      <button type="button" onClick={() => toggleCoreProduct(pid)} className="p-1.5 hover:bg-red-100 rounded-md transition-colors text-red-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Card 5: Option nhóm sản phẩm */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-4.5 h-4.5 text-emerald-600" />
                <h2 className="text-[15px] font-black text-slate-800">Option nhóm ({groups.length})</h2>
              </div>
              <button onClick={addGroup} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-all">
                <Plus className="w-3.5 h-3.5" /> Thêm option
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Search key gợi ý</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedSearchKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setProductSearch(key)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <FieldError field="groups" />
              
              {groups.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Grid3X3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có nhóm nào. Nhấn "Thêm nhóm" để bắt đầu.</p>
                </div>
              ) : (
                groups.map((group, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Nhóm {index + 1}</span>
                        <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          {group.product_ids.length} món
                        </span>
                      </div>
                      <button onClick={() => removeGroup(index)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên nhóm *</label>
                        <input 
                          value={group.name} 
                          onChange={e => updateGroup(index, { name: e.target.value })} 
                          placeholder="VD: Chọn nước"
                          className={inputCls(`group_${index}_name`)} 
                        />
                        <FieldError field={`group_${index}_name`} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Mô tả</label>
                        <input 
                          value={group.description} 
                          onChange={e => updateGroup(index, { description: e.target.value })} 
                          placeholder="Mô tả nhóm (tùy chọn)"
                          className={inputCls()} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Bắt buộc chọn</span>
                      <button
                        type="button"
                        onClick={() => toggleGroupRequired(index, !group.required)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${group.required ? 'bg-[#ed2a2a]' : 'bg-slate-300'}`}
                        aria-label="Toggle required group"
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${group.required ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Tối thiểu *</label>
                        <input 
                          type="number" 
                          min="0"
                          value={group.min_required} 
                          onChange={e => updateGroup(index, { min_required: parseInt(e.target.value) || 0 })} 
                          className={inputCls(`group_${index}_min`)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Tối đa *</label>
                        <input 
                          type="number" 
                          min="0"
                          value={group.max_required} 
                          onChange={e => updateGroup(index, { max_required: parseInt(e.target.value) || 0 })} 
                          className={inputCls()} 
                        />
                        <FieldError field={`group_${index}_min`} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Sản phẩm ({group.product_ids.length}) *</label>
                      <div className="space-y-2 mb-3">
                        {group.product_ids.map(pid => {
                          const p = products.find(pr => pr.id === pid)
                          return p ? (
                            <div key={pid} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-2.5 py-2">
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-white border border-emerald-100 shrink-0">
                                {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</p>
                                <p className="text-[11px] font-semibold text-emerald-700">{fmt(Number(p.sale_price || p.price || 0))}</p>
                              </div>
                              <div className="flex items-center gap-1 border border-emerald-200 rounded-lg px-1.5 py-1 bg-white">
                                <button
                                  type="button"
                                  onClick={() => updateProductQuantityInGroup(index, pid, (group.product_quantities?.[pid] || 1) - 1)}
                                  className="w-5 h-5 rounded text-emerald-700 hover:bg-emerald-50"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={group.product_quantities?.[pid] || 1}
                                  onChange={(e) => updateProductQuantityInGroup(index, pid, Number(e.target.value))}
                                  className="w-10 text-center text-xs font-bold text-slate-700 bg-transparent outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateProductQuantityInGroup(index, pid, (group.product_quantities?.[pid] || 1) + 1)}
                                  className="w-5 h-5 rounded text-emerald-700 hover:bg-emerald-50"
                                >
                                  +
                                </button>
                              </div>
                              <button onClick={() => toggleProductInGroup(index, pid)} className="p-1.5 hover:bg-emerald-100 rounded-md transition-colors text-emerald-700">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : null
                        })}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowProductPicker({ type: 'group', index })} 
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-all"
                      >
                        <ChevronDown className="w-3 h-3" /> Thêm sản phẩm
                      </button>
                      <FieldError field={`group_${index}_products`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-[35%] space-y-6">
           {/* Card: Trạng thái */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
              <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</h3>
              <div className="flex gap-2">
                 <button onClick={() => set('is_active', true)} className={`flex-1 py-3 rounded-xl border-2 text-xs font-black transition-all ${form.is_active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}>KÍCH HOẠT</button>
                 <button onClick={() => set('is_active', false)} className={`flex-1 py-3 rounded-xl border-2 text-xs font-black transition-all ${!form.is_active ? 'border-slate-500 bg-slate-50 text-slate-700' : 'border-slate-100 text-slate-400'}`}>ĐỂ NHÁP</button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Hiển thị ở trang chủ</p>
                  <p className="text-[11px] text-slate-400">Tích để combo xuất hiện tại mục Combo Tiết Kiệm</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('show_on_homepage', !form.show_on_homepage)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.show_on_homepage ? 'bg-[#ed2a2a]' : 'bg-slate-300'}`}
                  aria-label="Toggle show on homepage"
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${form.show_on_homepage ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
           </div>

           {/* Card: Tóm tắt */}
           <div className="bg-[#1e293b] rounded-2xl shadow-xl p-6 text-white space-y-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tóm tắt combo</h3>
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Số nhóm:</span><span className="font-bold">{groups.length}</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Món chính:</span><span className="font-bold">{coreProductIds.length} món</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Option items:</span><span className="font-bold">{groups.reduce((sum, g) => sum + g.product_ids.length, 0)} món</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Giá gốc:</span><span className="font-bold">{fmt(basePricePreview)}</span></div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Giảm:</span>
                    <span className="font-black text-red-400 text-lg">
                       {form.discount_type === 'percent' ? `-${form.discount_value}%` : `-${fmt(Number(form.discount_value) || 0)}`}
                       {discountPreview ? ` (${fmt(discountPreview)})` : ''}
                    </span>
                 </div>
                 <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                    <span className="font-bold">Giá combo:</span>
                    <span className="text-2xl font-black text-emerald-400">{fmt(finalPricePreview)}</span>
                 </div>
                 <p className="text-[11px] leading-5 text-slate-300">
                   Tổng giá gốc: <span className="font-bold text-white">{fmt(basePricePreview)}</span>. Giá combo: <span className="font-bold text-emerald-300">{fmt(finalPricePreview)}</span>. Tiết kiệm cho khách: <span className="font-bold text-red-300">{fmt(Math.max(0, discountPreview || 0))}</span>{basePricePreview > 0 && discountPreview ? ` (${Math.round((discountPreview / basePricePreview) * 100)}%)` : ''}.
                 </p>
              </div>
              <button 
                onClick={handleSubmit} 
                disabled={saving} 
                className="w-full py-4 bg-[#ed2a2a] hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
              >
                 {saving ? 'Đang xử lý...' : 'Xác nhận tạo combo'}
              </button>
           </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showProductPicker !== null && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowProductPicker(null)}>
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-black text-slate-800">
                      {showProductPicker.type === 'core' ? 'Chọn món trong combo' : `Chọn sản phẩm cho option ${showProductPicker.index + 1}`}
                    </h3>
                    <button onClick={() => setShowProductPicker(null)} className="p-2 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input autoFocus value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Tìm kiếm sản phẩm..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-[#ed2a2a]" />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Không tìm thấy sản phẩm nào.</p>
                    </div>
                  ) : filteredProducts.map(p => {
                    const isSelected = showProductPicker.type === 'core'
                      ? coreProductIds.includes(p.id)
                      : (groups[showProductPicker.index]?.product_ids.includes(p.id) || false)
                    return (
                      <button
                        key={p.id}
                        onClick={() => showProductPicker.type === 'core' ? toggleCoreProduct(p.id) : toggleProductInGroup(showProductPicker.index, p.id)}
                        className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${isSelected ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50 border border-transparent'}`}
                      >
                         <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {p.image && <img src={p.image} className="w-full h-full object-cover" />}
                         </div>
                         <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-slate-800">{p.name}</p>
                            <p className="text-xs font-medium text-slate-400">{fmt(p.sale_price || p.price)}</p>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                         </div>
                      </button>
                    )
                  })}
               </div>
               <div className="p-6 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-400">
                    {showProductPicker.type === 'core'
                      ? coreProductIds.length
                      : (groups[showProductPicker.index]?.product_ids.length || 0)} sản phẩm đã chọn
                  </p>
                  <button onClick={() => setShowProductPicker(null)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Hoàn tất</button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
