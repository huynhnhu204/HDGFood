'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Receipt } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import PaymentTransferPanel from '@/components/payment/PaymentTransferPanel'
import PaymentFlowSteps from '@/components/payment/PaymentFlowSteps'
import PaymentStatusChip from '@/components/payment/PaymentStatusChip'
import VnpayPayButton from '@/components/payment/VnpayPayButton'
import { ENABLE_MANUAL_BANK_CHECKOUT } from '@/lib/payment-flow'
import {
  PAYMENT_METHOD_LABELS,
  isManualTransferPayment,
  isVnpayPayment,
} from '@/lib/payment-flow'

interface OrderBillSnapshot {
  createdAt: string
  total: number
  paymentMethod: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const paymentMethod = searchParams.get('payment_method')
  const total = searchParams.get('total') || '0'
  const [createdAtText, setCreatedAtText] = useState('')
  const [billData, setBillData] = useState<OrderBillSnapshot | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [claimed, setClaimed] = useState(false)

  const isTransfer = isManualTransferPayment(paymentMethod)
  const isVnpay = isVnpayPayment(paymentMethod)
  const isCod = paymentMethod === 'cod'
  const paymentLabel = PAYMENT_METHOD_LABELS[paymentMethod || ''] || 'COD'
  const displayTotal = Math.round(Number(billData?.total ?? total))

  useEffect(() => {
    const now = new Date()
    setCreatedAtText(`${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`)
  }, [])

  useEffect(() => {
    if (!orderId) return
    try {
      const raw = window.sessionStorage.getItem(`order_bill_${orderId}`)
      if (raw) {
        const parsed = JSON.parse(raw) as OrderBillSnapshot & { total?: number }
        setBillData(parsed)
        if (parsed?.createdAt) {
          const created = new Date(parsed.createdAt)
          if (!isNaN(created.getTime())) {
            setCreatedAtText(`${created.toLocaleDateString('vi-VN')} ${created.toLocaleTimeString('vi-VN')}`)
          }
        }
      }
      const savedPhone = window.sessionStorage.getItem(`order_checkout_phone_${orderId}`)
      if (savedPhone) setCustomerPhone(savedPhone)
    } catch {
      setBillData(null)
    }
  }, [orderId])

  return (
    <div className="min-h-[85vh] py-6 px-4">
      <div className={`mx-auto w-full ${isTransfer ? 'max-w-xl' : 'max-w-lg'}`}>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-6 md:p-8 text-center mb-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4 shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tight mb-2">
            Đặt hàng thành công!
          </h1>
          <p className="text-sm font-medium text-slate-500 mb-4">
            {isTransfer
              ? 'Đơn đã được tạo. Vui lòng chuyển khoản theo hướng dẫn bên dưới.'
              : isVnpay
                ? 'Đơn đã tạo. Bấm nút bên dưới để thanh toán trên VNPay Sandbox (tự xác nhận).'
                : 'Cảm ơn bạn. Thanh toán khi nhận hàng (COD).'}
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="text-slate-500">
              Mã đơn <strong className="text-[#ed2a2a] font-black">#{orderId}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-black text-slate-900">{displayTotal.toLocaleString('vi-VN')}đ</span>
            {orderId && (
              <>
                <span className="text-slate-300">|</span>
                <PaymentStatusChip
                  paymentMethod={paymentMethod}
                  paymentStatus="unpaid"
                  paymentClaimedAt={claimed ? new Date().toISOString() : null}
                  compact
                />
              </>
            )}
          </div>
        </div>

        {isTransfer && !ENABLE_MANUAL_BANK_CHECKOUT && orderId && (
          <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/80 p-6 mb-4 text-center space-y-3">
            <p className="text-sm font-bold text-blue-900">
              Đơn này dùng VietQR cũ (thủ công). Hệ thống hiện ưu tiên <strong>VNPay Sandbox</strong> — tự xác nhận, không cần admin.
            </p>
            <p className="text-xs text-blue-800">
              Vui lòng <strong>đặt đơn mới</strong> và chọn VNPay Sandbox ở checkout. Hoặc admin xác nhận CK trong trang quản trị đơn hàng.
            </p>
            <Link
              href="/checkout"
              className="inline-block py-3 px-6 rounded-full bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-800"
            >
              Đặt đơn mới (VNPay)
            </Link>
          </div>
        )}

        {isTransfer && ENABLE_MANUAL_BANK_CHECKOUT && orderId && (
          <div className="bg-gradient-to-b from-amber-50/80 to-white rounded-[2rem] border-2 border-amber-100 shadow-lg p-6 md:p-8 mb-4">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 mb-3 text-center">
                Bước tiếp theo — Thanh toán VietQR
              </p>
              <PaymentFlowSteps currentStep={claimed ? 3 : 2} compact variant="manual" />
            </div>
            <PaymentTransferPanel
              embedded
              orderId={Number(orderId)}
              customerPhone={customerPhone}
              onClaimed={() => setClaimed(true)}
            />
          </div>
        )}

        {!isTransfer && (
          <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 p-6 mb-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">HDG Food</p>
                <p className="text-xs text-slate-500" suppressHydrationWarning>{createdAtText}</p>
              </div>
              <Receipt className="h-6 w-6 text-slate-300" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Thanh toán</span>
                <span className="font-bold">{paymentLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng</span>
                <span className="font-black text-[#ed2a2a]">{displayTotal.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            {isCod && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-bold text-emerald-700">
                Thanh toán tiền mặt khi nhận hàng
              </div>
            )}
            {isVnpay && orderId && (
              <div className="mt-4 space-y-4">
                <PaymentFlowSteps currentStep={2} compact variant="vnpay" />
                <VnpayPayButton orderId={Number(orderId)} customerPhone={customerPhone} />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/profile?tab=orders"
            className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-600 hover:border-[#ed2a2a] rounded-full text-[11px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2"
          >
            Theo dõi đơn <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="flex-1 py-4 bg-[#ed2a2a] text-white rounded-full text-[11px] font-black uppercase tracking-widest text-center hover:bg-slate-900"
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#ed2a2a] animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
