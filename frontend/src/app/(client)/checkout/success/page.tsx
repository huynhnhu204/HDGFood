'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, QrCode, ArrowRight, Download, Receipt } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'

interface OrderBillItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  isCombo: boolean
}

interface OrderBillSnapshot {
  createdAt: string
  items: OrderBillItem[]
  existingTableTotal: number
  subtotal: number
  shippingFee: number
  comboDiscountTotal: number
  voucherDiscount: number
  pointsDiscount: number
  total: number
  voucherCode: string
  paymentMethod: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const paymentMethod = searchParams.get('payment_method')
  const total = searchParams.get('total') || '0'
  const [createdAtText, setCreatedAtText] = useState('')
  const [billData, setBillData] = useState<OrderBillSnapshot | null>(null)

  useEffect(() => {
    const now = new Date()
    setCreatedAtText(`${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`)
  }, [])

  useEffect(() => {
    if (!orderId) return
    try {
      const raw = window.sessionStorage.getItem(`order_bill_${orderId}`)
      if (!raw) return
      const parsed = JSON.parse(raw) as OrderBillSnapshot
      setBillData(parsed)
      if (parsed?.createdAt) {
        const created = new Date(parsed.createdAt)
        if (!isNaN(created.getTime())) {
          setCreatedAtText(`${created.toLocaleDateString('vi-VN')} ${created.toLocaleTimeString('vi-VN')}`)
        }
      }
    } catch {
      setBillData(null)
    }
  }, [orderId])

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center text-center">
         
         <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
         </div>

         <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic mb-2">Đặt hàng thành công!</h1>
         <p className="text-sm font-bold text-slate-500 mb-8 max-w-sm">
            Cảm ơn bạn đã lựa chọn HDG Food. Đầu bếp của chúng tôi đã bắt đầu đỏ lửa và sẽ giao món thật chóng vánh.
         </p>

         <div className="w-full mb-8 relative">
            <div className="pointer-events-none absolute -top-2 left-0 right-0 flex justify-between px-5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <span key={`top-dot-${idx}`} className="h-4 w-4 rounded-full bg-white border border-slate-100" />
              ))}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border-2 border-dashed border-slate-300 bg-[#fcfcfc] p-6 text-left shadow-inner">
              <div className="mb-4 flex items-center justify-between border-b border-dashed border-slate-300 pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">HDG Food Receipt</p>
                  <p className="text-xs font-bold text-slate-500" suppressHydrationWarning>
                    {createdAtText || '--/--/---- --:--:--'}
                  </p>
                </div>
                <Receipt className="h-7 w-7 text-slate-300" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã đơn hàng</span>
                  <span className="font-black text-[#ed2a2a]">#{orderId?.padStart(5, '0')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái</span>
                  <span className="font-bold text-emerald-600">Đặt hàng thành công</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Thanh toán</span>
                  <span className="font-bold text-slate-700">
                    {paymentMethod === 'cod' ? 'COD' : 'Online'}
                  </span>
                </div>
              </div>

              <div className="my-4 border-t border-dashed border-slate-300" />

              {billData?.items?.length ? (
                <div className="space-y-1.5 text-[12px] text-slate-700">
                  {billData.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold">
                          {item.isCombo ? '[Combo] ' : ''}{item.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.quantity} x {Math.round(item.unitPrice).toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                      <span className="shrink-0 font-bold">{Math.round(item.subtotal).toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                  <div className="my-2 border-t border-dashed border-slate-300" />
                </div>
              ) : null}

              {billData ? (
                <div className="space-y-1.5 text-[12px]">
                  {billData.existingTableTotal > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Đơn tại bàn hiện có</span>
                      <span className="font-semibold">{Math.round(billData.existingTableTotal).toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Món thêm mới</span>
                    <span className="font-semibold">{Math.round(billData.subtotal).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {billData.comboDiscountTotal > 0 && (
                    <div className="flex justify-between text-violet-700">
                      <span>Giảm combo</span>
                      <span className="font-semibold">- {Math.round(billData.comboDiscountTotal).toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  {billData.voucherDiscount > 0 && (
                    <div className="flex justify-between text-[#ed2a2a]">
                      <span>Giảm voucher {billData.voucherCode ? `(${billData.voucherCode})` : ''}</span>
                      <span className="font-semibold">- {Math.round(billData.voucherDiscount).toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  {billData.pointsDiscount > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Giảm từ điểm</span>
                      <span className="font-semibold">- {Math.round(billData.pointsDiscount).toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Phí vận chuyển</span>
                    <span className="font-semibold">{Math.round(billData.shippingFee).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Giảm từ sản phẩm khuyến mãi đã được trừ trực tiếp vào đơn giá món.</p>
                  <div className="my-2 border-t border-dashed border-slate-300" />
                </div>
              ) : null}

              <div className="flex items-end justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tổng thanh toán</p>
                <p className="text-3xl font-black text-slate-900 italic">
                  {Math.round(Number(billData?.total ?? total)).toLocaleString('vi-VN')}đ
                </p>
              </div>

              {paymentMethod === 'cod' ? (
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-blue-600">
                  Thanh toán khi nhận hàng (COD)
                </div>
              ) : (
                <div className="mt-8 w-full border-t border-slate-200 pt-8 flex flex-col items-center">
                  <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-900 mb-6">
                     <QrCode className="w-4 h-4 text-[#ed2a2a]" /> Quét mã để thanh toán
                  </h4>
                  <div className="p-4 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-6 group relative">
                     <img 
                        src={`https://img.vietqr.io/image/mbbank-02092004281-compact2.png?amount=${total}&addInfo=HDGFOOD${orderId}&accountName=BUITRANHUYNHNHU`} 
                        alt="VietQR" 
                        className="w-48 h-48 rounded-xl object-contain transition-transform group-hover:scale-105"
                     />
                     <button className="absolute -bottom-4 right-4 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#ed2a2a] transition-colors">
                        <Download className="w-4 h-4" />
                     </button>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight text-center max-w-[200px]">
                     Mở ứng dụng Ngân hàng hoạt VNPAY để quét mã
                  </p>
                </div>
              )}
            </div>

            <div className="pointer-events-none absolute -bottom-2 left-0 right-0 flex justify-between px-5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <span key={`bottom-dot-${idx}`} className="h-4 w-4 rounded-full bg-white border border-slate-100" />
              ))}
            </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link 
               href={`/profile?tab=orders`} 
               className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-600 hover:border-[#ed2a2a] hover:text-[#ed2a2a] rounded-full text-[11px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 group"
            >
               Theo dõi đơn <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
               href="/" 
               className="flex-1 py-5 bg-[#ed2a2a] text-white rounded-full text-[11px] font-black uppercase tracking-widest transition-all text-center hover:bg-slate-900 shadow-xl shadow-red-500/20 active:scale-95"
            >
               Về trang chủ
            </Link>
         </div>

      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#ed2a2a] animate-spin"></div></div>}>
      <SuccessContent />
    </Suspense>
  )
}
