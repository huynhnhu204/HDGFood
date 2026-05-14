'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Percent, DollarSign, Search, X, Check,
  CalendarDays, Tag, Sparkles, AlertCircle, Package, Clock,
  Zap, ShieldCheck, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { promotionService } from '@/services/promotion.service'
import api from '@/services/api'
import type { Product } from '@/types'

/* ── Helpers ───────────────────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const safeNumber = (value: string) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toLocalDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

const defaultStart = toLocalDateTime(new Date())
const defaultEnd = toLocalDateTime(new Date(Date.now() + 7 * 86400000))

interface FormErrors {
  name?: string
  product_ids?: string
  discount_value?: string
  start_date?: string
  end_date?: string
  [key: string]: string | undefined
}

export default function CreatePromotionPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [errors, setErrors] = useState<FormErrors>({})

  const [form, setForm] = useState({
    name: '',
    discount_type: 'percent' as 'percent' | 'amount',
    discount_value: '',
    min_order_amount: '',
    start_date: defaultStart,
    end_date: defaultEnd,
    is_active: true,
  })

  /* ── Load products ── */
  useEffect(() => {
    api.get<{ data: Product[] }>('/products?per_page=1000')
      .then(r => setProducts(r.data.data))
      .catch(() => {})
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

  /* ── Selection logic ── */
  const toggleProduct = (p: Product) => {
    setSelectedProducts(prev => {
      const isExist = prev.find(item => item.id === p.id)
      if (isExist) return prev.filter(item => item.id !== p.id)
      return [...prev, p]
    })
  }

  const removeProduct = (id: number) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id))
  }

  /* ── Pricing algorithm (tổng trước/sau giảm cho danh sách sản phẩm chọn) ── */
  const pricingSummary = useMemo(() => {
    const discountValue = safeNumber(form.discount_value)
    const minOrderAmount = safeNumber(form.min_order_amount)
    const prices = selectedProducts.map((p) => Number(p.final_price ?? p.sale_price ?? p.price ?? 0))
    const subtotal = prices.reduce((sum, p) => sum + p, 0)

    if (subtotal <= 0 || discountValue <= 0) {
      return {
        subtotal,
        discountAmount: 0,
        totalAfterDiscount: subtotal,
        meetsMinOrder: minOrderAmount <= 0 || subtotal >= minOrderAmount,
      }
    }

    const meetsMinOrder = minOrderAmount <= 0 || subtotal >= minOrderAmount
    if (!meetsMinOrder) {
      return {
        subtotal,
        discountAmount: 0,
        totalAfterDiscount: subtotal,
        meetsMinOrder,
      }
    }

    let discountAmount = 0
    if (form.discount_type === 'percent') {
      const percent = Math.min(Math.max(discountValue, 0), 100)
      discountAmount = Math.round((subtotal * percent) / 100)
    } else {
      // Giảm theo tiền cố định trên từng sản phẩm đã chọn
      discountAmount = prices.reduce((sum, p) => sum + Math.min(discountValue, p), 0)
    }

    discountAmount = Math.min(discountAmount, subtotal)
    return {
      subtotal,
      discountAmount,
      totalAfterDiscount: Math.max(0, subtotal - discountAmount),
      meetsMinOrder,
    }
  }, [selectedProducts, form.discount_value, form.discount_type, form.min_order_amount])

  /* ── Validate ── */
  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên chương trình.'
    if (selectedProducts.length === 0) e.product_ids = 'Vui lòng chọn ít nhất 1 sản phẩm.'
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      e.discount_value = 'Vui lòng nhập giá trị giảm hợp lệ.'
    }
    if (form.discount_type === 'percent' && parseFloat(form.discount_value) > 100) {
      e.discount_value = 'Giảm giá % không được vượt quá 100%.'
    }
    if (!form.start_date) e.start_date = 'Vui lòng chọn ngày bắt đầu.'
    if (!form.end_date) e.end_date = 'Vui lòng chọn ngày kết thúc.'
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
      await promotionService.create({
        name: form.name,
        product_ids: selectedProducts.map(p => p.id),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.is_active,
      })
      toast.success('Đã tạo chương trình khuyến mãi thành công! 🎉')
      router.push('/admin/promotions')
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/promotions" className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Tạo Khuyến Mãi</h1>
            <p className="text-[13px] font-medium text-slate-400 mt-0.5">Áp dụng cho nhiều sản phẩm cùng lúc</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary text-xs">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Tạo Khuyến Mãi'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 pb-28 sm:pb-6">
        <div className="flex-1 lg:w-[65%] space-y-6">
          {/* Card 1: Thông tin */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
               <Zap className="w-4.5 h-4.5 text-violet-600" />
               <h2 className="text-[15px] font-black text-slate-800">Thông tin chương trình</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên chương trình *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Flash Sale Tháng 4" className={inputCls('name')} />
                <FieldError field="name" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sản phẩm áp dụng ({selectedProducts.length}) *</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedProducts.map(p => (
                    <div key={p.id} className="flex items-center gap-2 pl-2 pr-1 py-1 bg-red-50 text-[#ed2a2a] rounded-lg border border-red-100 text-xs font-bold">
                       {p.name}
                       <button onClick={() => removeProduct(p.id)} className="p-1 hover:bg-red-100 rounded-md transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setShowProductPicker(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-400 hover:border-[#ed2a2a] hover:text-[#ed2a2a] transition-all">
                    <ChevronDown className="w-3 h-3" /> Thêm sản phẩm
                  </button>
                </div>
                <FieldError field="product_ids" />
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
                  <button type="button" onClick={() => set('discount_type', 'percent')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.discount_type === 'percent' ? 'border-[#ed2a2a] bg-red-50/20' : 'border-slate-100'}`}>
                    <Percent className={`w-5 h-5 ${form.discount_type === 'percent' ? 'text-[#ed2a2a]' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Giảm theo %</span>
                  </button>
                  <button type="button" onClick={() => set('discount_type', 'amount')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.discount_type === 'amount' ? 'border-[#ed2a2a] bg-red-50/20' : 'border-slate-100'}`}>
                    <DollarSign className={`w-5 h-5 ${form.discount_type === 'amount' ? 'text-[#ed2a2a]' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Giảm số tiền</span>
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Mức giảm *</label>
                    <input type="number" value={form.discount_value} onChange={e => set('discount_value', e.target.value)} className={inputCls('discount_value')} />
                    <FieldError field="discount_value" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Đơn tối thiểu</label>
                    <input type="number" value={form.min_order_amount} onChange={e => set('min_order_amount', e.target.value)} className={inputCls()} />
                  </div>
               </div>
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
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ngày bắt đầu *</label>
                  <input type="datetime-local" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls('start_date')} />
                  <FieldError field="start_date" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ngày kết thúc *</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls('end_date')} />
                  <FieldError field="end_date" />
               </div>
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
           </div>

           {/* Card: Tóm tắt */}
           <div className="bg-[#1e293b] rounded-2xl shadow-xl p-6 text-white space-y-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tóm tắt khuyến mãi</h3>
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Sản phẩm:</span><span className="font-bold">{selectedProducts.length} món</span></div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Tổng trước giảm:</span>
                    <span className="font-bold">{fmt(pricingSummary.subtotal)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Ưu đãi:</span>
                    <span className="font-black text-red-400 text-lg">
                       {form.discount_type === 'percent' ? `-${form.discount_value}%` : `-${fmt(Number(form.discount_value))}`}
                    </span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Số tiền giảm:</span>
                    <span className="font-bold text-emerald-400">-{fmt(pricingSummary.discountAmount)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-700">
                    <span className="text-slate-300 font-bold">Tổng sau giảm:</span>
                    <span className="font-black text-lg">{fmt(pricingSummary.totalAfterDiscount)}</span>
                 </div>
                 {!!safeNumber(form.min_order_amount) && !pricingSummary.meetsMinOrder && (
                   <p className="text-[11px] font-bold text-amber-300">
                     Đơn chưa đạt tối thiểu {fmt(safeNumber(form.min_order_amount))} nên hiện chưa áp dụng giảm.
                   </p>
                 )}
              </div>
              <button 
                onClick={handleSubmit} 
                disabled={saving} 
                className="w-full py-4 bg-[#ed2a2a] hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
              >
                 {saving ? 'Đang xử lý...' : 'Xác nhận tạo'}
              </button>
           </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showProductPicker && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowProductPicker(false)}>
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input autoFocus value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Tìm kiếm sản phẩm..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-[#ed2a2a]" />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                  {filteredProducts.map(p => {
                    const isSelected = selectedProducts.find(item => item.id === p.id)
                    return (
                      <button key={p.id} onClick={() => toggleProduct(p)} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${isSelected ? 'bg-red-50 border border-red-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                         <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {p.image && <img src={p.image} className="w-full h-full object-cover" />}
                         </div>
                         <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-slate-800">{p.name}</p>
                            <p className="text-xs font-medium text-slate-400">{fmt(p.price)}</p>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#ed2a2a] border-[#ed2a2a]' : 'border-slate-200'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                         </div>
                      </button>
                    )
                  })}
               </div>
               <div className="p-6 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-400 underline underline-offset-4 cursor-pointer" onClick={() => setSelectedProducts([])}>Bỏ chọn tất cả</p>
                  <button onClick={() => setShowProductPicker(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Hoàn tất ({selectedProducts.length})</button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
