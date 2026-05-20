'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Receipt } from 'lucide-react'
import PaymentTransferPanel from '@/components/payment/PaymentTransferPanel'
import VnpayPayButton from '@/components/payment/VnpayPayButton'
import {
  ENABLE_MANUAL_BANK_CHECKOUT,
  VNPAY_MIN_AMOUNT,
  canUseVnpay,
  vnpayMinAmountMessage,
} from '@/lib/payment-flow'

function PaymentPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = Number(searchParams.get('order_id') || 0)
  const method = searchParams.get('payment_method') || 'vnpay'
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderTotal, setOrderTotal] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!orderId) return
    const saved = window.sessionStorage.getItem(`order_checkout_phone_${orderId}`)
    if (saved) setCustomerPhone(saved)
    try {
      const raw = window.sessionStorage.getItem(`order_bill_${orderId}`)
      if (raw) {
        const parsed = JSON.parse(raw) as { total?: number }
        if (parsed?.total != null) setOrderTotal(Math.round(Number(parsed.total)))
      }
    } catch {
      setOrderTotal(undefined)
    }
  }, [orderId])

  const vnpayEligible = orderTotal === undefined || canUseVnpay(orderTotal)

  if (!orderId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-600 font-semibold">Không tìm thấy mã đơn hàng.</p>
        <Link href="/profile?tab=orders" className="text-[#ed2a2a] font-bold text-sm">Về đơn hàng của tôi</Link>
      </div>
    )
  }

  const isManual = method === 'bank' || method === 'momo'

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <Receipt className="w-8 h-8 text-[#ed2a2a]" />
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Thanh toán đơn hàng</h1>
            <p className="text-sm font-bold text-slate-500">Mã đơn #{String(orderId).padStart(5, '0')}</p>
          </div>
        </div>

        {isManual && ENABLE_MANUAL_BANK_CHECKOUT ? (
          <>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Chuyển khoản VietQR — quét mã, chuyển đúng số tiền và nội dung, sau đó bấm xác nhận bên dưới.
            </p>
            <PaymentTransferPanel orderId={orderId} customerPhone={customerPhone} />
          </>
        ) : vnpayEligible ? (
          <>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Thanh toán qua VNPay Sandbox. Sau khi thanh toán thành công, hệ thống tự cập nhật «Đã thanh toán» — không cần admin xác nhận.
            </p>
            <VnpayPayButton orderId={orderId} customerPhone={customerPhone} orderTotal={orderTotal} />
          </>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
            <p className="text-xs font-bold text-amber-900">{vnpayMinAmountMessage()}</p>
            {orderTotal != null && (
              <p className="text-[11px] text-amber-800">Tổng đơn hiện {orderTotal.toLocaleString('vi-VN')}đ.</p>
            )}
            <Link
              href="/checkout"
              className="inline-block w-full py-3 rounded-full bg-amber-600 text-white text-[11px] font-black uppercase tracking-widest text-center"
            >
              Đặt đơn mới (≥ {VNPAY_MIN_AMOUNT.toLocaleString('vi-VN')}đ)
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#ed2a2a] animate-spin" />
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  )
}
