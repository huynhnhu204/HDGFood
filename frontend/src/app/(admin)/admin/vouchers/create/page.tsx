'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Tag, Percent, Banknote, ShoppingCart, ShoppingBag, Gift, Calendar, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { voucherService } from '@/services/voucher.service'
import api from '@/services/api'
import type { Product } from '@/types'

const labelCls = "block text-[13px] font-bold text-slate-700 mb-2 uppercase tracking-wide"
const cardCls  = "bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-6 sm:p-8 space-y-5 transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:scale-[1.01]"

export default function CreateVoucherPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'amount',
    discount_value: '',
    max_discount: '',
    min_order_amount: '',
    apply_to: 'all' as 'all' | 'products',
    product_ids: [] as number[],
    usage_limit: '',
    usage_per_user: '1',
    start_date: '',
    end_date: '',
    tier_restriction: 'all' as 'all' | 'silver' | 'gold' | 'vip',
    is_active: true,
  })

  useEffect(() => {
    api.get<{ data: Product[] }>('/products?per_page=1000').then(r => setProducts(r.data.data)).catch(() => {})
  }, [])

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const invalid = !form.code || !form.name || !form.discount_value || !form.start_date || !form.end_date
    if (invalid) {
      setErrors(true)
      setTimeout(() => setErrors(false), 500)
      toast.error('Vui lòng điền đầy đủ các thông tin có dấu đỏ (*)!')
      return
    }
    if (form.apply_to === 'products' && form.product_ids.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm áp dụng'); return
    }

    setLoading(true)
    try {
      await voucherService.create({
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
        apply_to: form.apply_to,
        product_ids: form.apply_to === 'products' ? form.product_ids : undefined,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
        usage_per_user: parseInt(form.usage_per_user),
        start_date: form.start_date,
        end_date: form.end_date,
        tier_restriction: form.tier_restriction,
        is_active: form.is_active,
      })
      toast.success('Đã thiết lập Khuyến mãi thành công!')
      router.push('/admin/vouchers')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Tạo Khuyến mãi thất bại')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (isInvalid: boolean) => 
    `w-full border rounded-xl px-4 py-3 text-[14px] transition-all font-medium focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-[#ed2a2a] ${
      errors && isInvalid
        ? 'border-[#ed2a2a] bg-red-50 text-red-900 animate-shake placeholder-red-300'
        : 'border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400'
    }`

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Gift className="w-6 h-6 text-[#ed2a2a]" />
              Thiết lập mã giảm giá mới
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Cấu hình khuyến mãi hấp dẫn để thu hút khách hàng.</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ed2a2a] to-[#d12525] hover:from-[#f53535] hover:to-[#e02b2b] text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {loading ? 'Hệ thống đang lưu...' : 'Lưu lại Hệ thống'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Thông tin cơ bản */}
        <div className={cardCls}>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-2">
            <Tag className="w-5 h-5 text-slate-400" />
            <p className="text-[13px] font-black text-slate-500 uppercase tracking-widest">Định danh Voucher</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Mã CODE nhập tay <span className="text-[#ed2a2a]">*</span></label>
              <input
                type="text"
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                className={inputCls(!form.code) + ' uppercase text-lg font-black tracking-[0.2em] text-[#ed2a2a]'}
                placeholder="VD: HDGFOOD10"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Tên chương trình hiển thị <span className="text-[#ed2a2a]">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputCls(!form.name)}
                placeholder="VD: Giảm 10% cho đơn từ 50k"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Nội dung mô tả (Tuỳ chọn)</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className={inputCls(false) + ' resize-none'}
              placeholder="VD: Mã giảm giá tri ân khách hàng tháng 11..."
            />
          </div>
        </div>

        {/* Cài đặt Giảm giá */}
        <div className={cardCls}>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-2">
            <Percent className="w-5 h-5 text-emerald-500" />
            <p className="text-[13px] font-black text-slate-500 uppercase tracking-widest">Loại hình Khuyến mãi</p>
          </div>

          <div>
            <label className={labelCls}>Mức giảm giá tính theo</label>
            <div className="flex flex-col sm:flex-row gap-3">
              {(['percent', 'amount'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('discount_type', type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 text-sm font-bold transition-all duration-300 active:scale-[0.98] ${
                    form.discount_type === type
                      ? 'border-[#ed2a2a] bg-[#ed2a2a] text-white shadow-lg shadow-red-500/30'
                      : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  {type === 'percent' ? <><Percent className="w-4 h-4" /> Chiết khấu phần trăm (%)</> : <><Banknote className="w-4 h-4" /> Trừ thẳng Tiền mặt (₫)</>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Thực giảm <span className="text-[#ed2a2a]">*</span></label>
              <div className="relative">
                <input
                  type="number"
                  value={form.discount_value}
                  onChange={e => set('discount_value', e.target.value)}
                  className={inputCls(!form.discount_value) + ' pl-5 pr-12 text-lg font-bold text-[#ed2a2a]'}
                  placeholder={form.discount_type === 'percent' ? '10' : '20000'}
                  min="0"
                  step="any"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                  {form.discount_type === 'percent' ? '%' : '₫'}
                </span>
              </div>
            </div>
            {form.discount_type === 'percent' && (
              <div>
                <label className={labelCls}>Mức giảm tối đa (Tùy chọn)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.max_discount}
                    onChange={e => set('max_discount', e.target.value)}
                    className={inputCls(false) + ' pl-5 pr-12'}
                    placeholder="VD: 50000"
                    min="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                </div>
              </div>
            )}
            <div className={form.discount_type === 'amount' ? 'md:col-span-2' : ''}>
              <label className={labelCls}>Giá trị đơn hàng tối thiểu (Tùy chọn)</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.min_order_amount}
                  onChange={e => set('min_order_amount', e.target.value)}
                  className={inputCls(false) + ' pl-5 pr-12'}
                  placeholder="VD: Bắt buộc mua đơn trên 100,000₫ mới được nhập"
                  min="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
              </div>
            </div>
          </div>
        </div>

        {/* Áp dụng cho */}
        <div className={cardCls}>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            <p className="text-[13px] font-black text-slate-500 uppercase tracking-widest">Phạm vi ứng dụng</p>
          </div>

          <div>
            <label className={labelCls}>Khấu trừ cho phần nào của đơn?</label>
            <div className="flex flex-col sm:flex-row gap-3">
              {(['all', 'products'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('apply_to', type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 text-sm font-bold transition-all duration-300 active:scale-[0.98] ${
                    form.apply_to === type
                      ? 'border-[#ed2a2a] bg-[#ed2a2a] text-white shadow-lg shadow-red-500/30'
                      : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  {type === 'all' ? <><ShoppingBag className="w-5 h-5" /> Toàn Tập Hoá (Tổng Bill)</> : <><Tag className="w-5 h-5" /> Mặt hàng cụ thể trong Menu</>}
                </button>
              ))}
            </div>
          </div>

          {form.apply_to === 'products' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 bg-blue-50/50 border border-blue-100 p-5 rounded-2xl mt-4">
              <label className={labelCls}>Tích chọn sản phẩm được hưởng</label>
              <select
                multiple
                value={form.product_ids.map(String)}
                onChange={e => set('product_ids', Array.from(e.target.selectedOptions, o => parseInt(o.value)))}
                className={inputCls(!form.product_ids.length && errors) + ' h-40 bg-white ring-blue-500/20'}
                size={5}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id} className="py-1.5 px-2 hover:bg-blue-50 rounded-md font-medium text-slate-700">{p.name}</option>
                ))}
              </select>
              <p className="text-[12px] font-semibold text-slate-500 mt-2 bg-slate-100 inline-block px-3 py-1 rounded-md">💡 Mẹo: Giữ Ctrl (hoặc Cmd) để chọn nhiều món.</p>
            </div>
          )}
        </div>

        {/* Giới hạn & Thời gian */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
           
          {/* Cột 1: Giới hạn SL */}
          <div className={`${cardCls} flex flex-col`}>
            <div className="flex-1 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-2">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                <p className="text-[13px] font-black text-slate-500 uppercase tracking-widest">Luật sử dụng</p>
              </div>

              <div>
                <label className={labelCls}>Phát hành hệ thống</label>
                <input
                  type="number"
                  value={form.usage_limit}
                  onChange={e => set('usage_limit', e.target.value)}
                  className={inputCls(false)}
                  placeholder="Ví dụ: 100 lượt (Trống = ∞)"
                  min="1"
                />
              </div>
              <div>
                <label className={labelCls}>Mức dùng/Khách</label>
                <input
                  type="number"
                  value={form.usage_per_user}
                  onChange={e => set('usage_per_user', e.target.value)}
                  className={inputCls(false) + ' shadow-sm'}
                  min="1"
                  required
                />
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <label className={labelCls}>Mức ưu tiên thẻ thành viên</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'all',    label: 'Mọi Khách',    cls: 'border-slate-400 bg-slate-100 text-slate-700' },
                    { value: 'silver', label: 'Silver+',   cls: 'border-slate-500 bg-slate-200 text-slate-800' },
                    { value: 'gold',   label: 'Gold+',     cls: 'border-yellow-400 bg-yellow-100 text-yellow-800' },
                    { value: 'vip',    label: 'VIP Card',       cls: 'border-fuchsia-400 bg-fuchsia-100 text-fuchsia-800' },
                  ] as const).map(({ value, label, cls }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set('tier_restriction', value)}
                      className={`py-2.5 rounded-xl border border-b-[3px] text-[13px] font-bold transition-all active:scale-95 ${
                        form.tier_restriction === value 
                           ? cls + ' shadow-inner translate-y-[2px] border-b-[1px]' 
                           : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cột 2: Thời gian */}
          <div className={`${cardCls} flex flex-col`}>
             <div className="flex-1 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <p className="text-[13px] font-black text-slate-500 uppercase tracking-widest">Thời gian & Trạng thái</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Mở cửa từ <span className="text-[#ed2a2a]">*</span></label>
                    <input
                      type="datetime-local"
                      value={form.start_date}
                      onChange={e => set('start_date', e.target.value)}
                      className={inputCls(!form.start_date)}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Đóng hệ thống vào <span className="text-[#ed2a2a]">*</span></label>
                    <input
                      type="datetime-local"
                      value={form.end_date}
                      onChange={e => set('end_date', e.target.value)}
                      className={inputCls(!form.end_date)}
                      required
                    />
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100">
                   <label className={labelCls}>Tình trạng khởi động</label>
                   <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => set('is_active', true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${
                          form.is_active ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/20' : 'border-slate-200 text-slate-500 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        ✅ Active
                      </button>
                      <button
                        type="button"
                        onClick={() => set('is_active', false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${
                          !form.is_active ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm shadow-amber-500/20' : 'border-slate-200 text-slate-500 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        ⏸ Bản Nháp
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Nút chốt ở chân trang Mobile */}
        <div className="block sm:hidden flex-col flex gap-3 pt-6 pb-20">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#ed2a2a] to-[#d12525] text-white rounded-xl text-[16px] font-bold shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            {loading ? 'Hệ thống đang lưu...' : 'LƯU LẠI CHƯƠNG TRÌNH'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-4 border border-slate-300 rounded-xl text-[15px] font-bold text-slate-600 bg-white hover:bg-slate-50 active:scale-95"
          >
            Quay lại Danh sách
          </button>
        </div>
      </form>
    </div>
  )
}
