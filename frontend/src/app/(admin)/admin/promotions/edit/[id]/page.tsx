'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { promotionService } from '@/services/promotion.service'
import api from '@/services/api'
import type { Product } from '@/types'

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all placeholder:text-slate-400"
const labelCls = "block text-sm font-semibold text-slate-700 mb-1.5"

const toLocal = (iso: string) => iso ? iso.slice(0, 16) : ''

export default function EditPromotionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({
    name: '', product_id: '', discount_type: 'percent' as 'percent' | 'amount',
    discount_value: '', min_order_amount: '', start_date: '', end_date: '', is_active: true,
  })

  useEffect(() => {
    Promise.all([
      promotionService.getById(Number(id)),
      api.get<{ data: Product[] }>('/products?per_page=1000'),
    ]).then(([promo, res]) => {
      setProducts(res.data.data)
      setForm({
        name:             promo.name,
        product_id:       String(promo.product_id),
        discount_type:    promo.discount_type,
        discount_value:   String(promo.discount_value),
        min_order_amount: promo.min_order_amount ? String(promo.min_order_amount) : '',
        start_date:       toLocal(promo.start_date),
        end_date:         toLocal(promo.end_date),
        is_active:        promo.is_active,
      })
    }).catch(() => toast.error('Không tải được dữ liệu.'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await promotionService.update(Number(id), {
        name:             form.name,
        product_ids:      form.product_id ? [parseInt(form.product_id)] : [],
        discount_type:    form.discount_type,
        discount_value:   parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
        start_date:       form.start_date,
        end_date:         form.end_date,
        is_active:        form.is_active,
      })
      toast.success('Đã cập nhật khuyến mãi')
      router.push('/admin/promotions')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật thất bại')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#ed2a2a] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl border hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sửa khuyến mãi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cập nhật thông tin chương trình</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin chương trình</p>
          <div>
            <label className={labelCls}>Tên chương trình *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Sản phẩm áp dụng *</label>
            <select value={form.product_id} onChange={e => set('product_id', e.target.value)} className={inputCls} required>
              <option value="">-- Chọn sản phẩm --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cài đặt giảm giá</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Loại giảm</label>
              <div className="flex gap-2">
                {(['percent', 'amount'] as const).map(type => (
                  <button key={type} type="button" onClick={() => set('discount_type', type)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${form.discount_type === type ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    {type === 'percent' ? '% Phần trăm' : '₫ Tiền mặt'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Giá trị giảm *</label>
              <input type="number" value={form.discount_value} onChange={e => set('discount_value', e.target.value)}
                className={inputCls} min="0" step="any" required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Đơn tối thiểu <span className="text-slate-400 font-normal">(tùy chọn)</span></label>
            <input type="number" value={form.min_order_amount} onChange={e => set('min_order_amount', e.target.value)}
              className={inputCls} placeholder="50000" min="0" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian áp dụng</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ngày bắt đầu *</label>
              <input type="datetime-local" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Ngày kết thúc *</label>
              <input type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} required />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Trạng thái</p>
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} type="button" onClick={() => set('is_active', v)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  form.is_active === v
                    ? v ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-400 bg-slate-100 text-slate-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                {v ? '✅ Kích hoạt' : '⏸ Tắt'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white transition-colors">
            Huỷ
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 shadow-sm transition-colors">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  )
}
