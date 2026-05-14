'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Gift, Calendar, CheckSquare, Percent, Banknote, ShoppingBag, Users, Clock, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { voucherService } from '@/services/voucher.service'
import type { Voucher } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { 
  day: '2-digit', month: '2-digit', year: 'numeric', 
  hour: '2-digit', minute: '2-digit' 
})

export default function VoucherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = Number(resolvedParams.id)
  const router = useRouter()
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    voucherService.getById(id)
      .then(setVoucher)
      .catch(() => toast.error('Không tải được thông tin mã giảm giá.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
      <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#ed2a2a]" />
      <span className="font-bold text-xs uppercase tracking-widest">Đang tải thông tin...</span>
    </div>
  )
  
  if (!voucher) return <div className="text-center py-32 text-slate-500 font-bold">Không tìm thấy mã giảm giá.</div>

  const isActive = voucher.is_valid && voucher.is_active

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 bg-white p-5 lg:p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#ed2a2a]" />
            Chi tiết Mã: <span className="font-mono text-[#ed2a2a]">{voucher.code}</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Quản lý chương trình khuyến mãi</p>
        </div>
        <button
          onClick={() => router.push(`/admin/vouchers/${id}/edit`)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-slate-200 hover:bg-slate-700 active:scale-95 transition-all"
        >
          <Pencil className="w-4 h-4" /> Chỉnh sửa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: General Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 lg:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
             {/* Status Stamp */}
             <div className={`absolute top-6 right-6 px-4 py-2 rounded-2xl border-2 font-black uppercase text-xs tracking-widest rotate-6 ${isActive ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-300 text-slate-400'}`}>
                {isActive ? 'Đang kích hoạt' : 'Ngưng hoạt động'}
             </div>

             <div className="space-y-6">
                <div>
                   <h2 className="text-2xl font-black text-slate-800">{voucher.name}</h2>
                   <p className="text-slate-500 font-medium mt-2 leading-relaxed">{voucher.description || 'Không có mô tả chi tiết cho mã này.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mức Giảm Giá</p>
                      <div className="flex items-center gap-2">
                         {voucher.discount_type === 'percent' ? <Percent className="w-5 h-5 text-[#ed2a2a]" /> : <Banknote className="w-5 h-5 text-[#ed2a2a]" />}
                         <span className="text-xl font-black text-slate-800">{voucher.discount_label}</span>
                      </div>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Áp dụng cho</p>
                      <div className="flex items-center gap-2">
                         <ShoppingBag className="w-5 h-5 text-blue-500" />
                         <span className="text-[14px] font-bold text-slate-800">{voucher.apply_to === 'all' ? 'Toàn bộ cửa hàng' : 'Một số sản phẩm'}</span>
                      </div>
                   </div>
                </div>

                {voucher.products && voucher.products.length > 0 && (
                  <div className="pt-6 border-t border-slate-100">
                     <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Sản phẩm được áp dụng ({voucher.products.length})</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {voucher.products.map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-colors">
                             <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xs">🥘</div>
                             <span className="text-sm font-bold text-slate-700 line-clamp-1">{p.name}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Right Side: Usage & Time */}
        <div className="space-y-6">
           <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Hiệu suất sử dụng</p>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                          <Users className="w-4 h-4" /> Tổng lượt dùng
                       </div>
                       <span className="font-black text-slate-800">{voucher.used_count} <span className="text-slate-300 text-xs font-medium">/ {voucher.usage_limit || '∞'}</span></span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-gradient-to-r from-[#ed2a2a] to-[#ff6b6b]" 
                         style={{ width: `${voucher.usage_limit ? Math.min((voucher.used_count / voucher.usage_limit) * 100, 100) : 100}%` }}
                       />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                       <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                          <CheckSquare className="w-4 h-4" /> Dùng/Khách
                       </div>
                       <span className="font-black text-slate-800">{voucher.usage_per_user} lần</span>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Thời gian hiệu lực</p>
                 <div className="space-y-4">
                    <div className="flex gap-3 items-start">
                       <Clock className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                       <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Bắt đầu</p>
                          <p className="text-sm font-black text-slate-700">{fmtDate(voucher.start_date)}</p>
                       </div>
                    </div>
                    <div className="flex gap-3 items-start">
                       <Clock className="w-4 h-4 text-rose-500 mt-1 shrink-0" />
                       <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Kết thúc</p>
                          <p className="text-sm font-black text-slate-700">{fmtDate(voucher.end_date)}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Điều kiện tối thiểu</p>
                 <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                       <span>Đơn tối thiểu:</span>
                       <span className="text-[#ed2a2a]">{voucher.min_order_amount ? fmt(voucher.min_order_amount) : 'Không yêu cầu'}</span>
                    </div>
                    {voucher.max_discount && (
                       <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                          <span>Giảm tối đa:</span>
                          <span className="text-slate-800">{fmt(voucher.max_discount)}</span>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           <div className={`p-6 rounded-3xl border-2 shadow-sm flex items-center justify-between ${isActive ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                    <CheckSquare className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sẵn sàng dùng?</p>
                    <p className={`text-sm font-black ${isActive ? 'text-emerald-700' : 'text-slate-600'}`}>{isActive ? 'CÓ, ĐANG BẬT' : 'KHÔNG, ĐANG TẮT'}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
