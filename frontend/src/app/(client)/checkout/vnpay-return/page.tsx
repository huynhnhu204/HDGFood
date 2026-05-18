'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { paymentService } from '@/services/payment.service'
import { PAYMENT_FLOW_STEPS_VNPAY } from '@/lib/payment-flow'

function VnpayReturnContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const statusParam = searchParams.get('status')
  const [state, setState] = useState<'loading' | 'success' | 'failed'>('loading')

  useEffect(() => {
    if (!orderId) {
      setState('failed')
      return
    }

    const phone = window.sessionStorage.getItem(`order_checkout_phone_${orderId}`) || undefined
    const hasToken = Boolean(localStorage.getItem('HDG-auth-storage'))

    const verify = async () => {
      try {
        if (statusParam === 'success') {
          const result = await paymentService.checkVnpayStatus(Number(orderId), phone, hasToken)
          if (result.paid) {
            setState('success')
            return
          }
          setTimeout(async () => {
            try {
              const retry = await paymentService.checkVnpayStatus(Number(orderId), phone, hasToken)
              setState(retry.paid ? 'success' : 'failed')
            } catch {
              setState('failed')
            }
          }, 2000)
          return
        }
        setState('failed')
      } catch {
        setState(statusParam === 'success' ? 'success' : 'failed')
      }
    }

    verify()
  }, [orderId, statusParam])

  const isSuccess = state === 'success'
  const isLoading = state === 'loading'

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 text-center">
        {isLoading ? (
          <>
            <Loader2 className="w-14 h-14 text-blue-500 animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-black text-slate-900 mb-2">Đang xác nhận VNPay...</h1>
            <p className="text-sm text-slate-500">Vui lòng đợi vài giây, hệ thống đang cập nhật trạng thái thanh toán.</p>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black text-emerald-700 mb-2">Thanh toán VNPay thành công!</h1>
            <p className="text-sm text-slate-500 mb-6">
              Đơn #{orderId} đã được ghi nhận thanh toán tự động. Nhà hàng sẽ xử lý đơn sớm nhất.
            </p>
            <div className="mb-6 text-left space-y-2">
              {PAYMENT_FLOW_STEPS_VNPAY.map((s) => (
                <div key={s.step} className="flex gap-3 text-xs text-slate-600">
                  <span className="font-black text-blue-600">{s.step}.</span>
                  <span><strong>{s.title}</strong> — {s.desc}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black text-red-700 mb-2">Thanh toán chưa hoàn tất</h1>
            <p className="text-sm text-slate-500 mb-6">
              Giao dịch VNPay bị hủy hoặc thất bại. Bạn có thể thử lại từ đơn hàng hoặc chọn phương thức khác.
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={orderId ? `/checkout/success?order_id=${orderId}&payment_method=vnpay` : '/profile?tab=orders'}
            className="flex-1 py-4 bg-[#ed2a2a] text-white rounded-full text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            Xem đơn hàng <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="flex-1 py-4 border-2 border-slate-100 text-slate-600 rounded-full text-[11px] font-black uppercase tracking-widest"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VnpayReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#ed2a2a]" /></div>}>
      <VnpayReturnContent />
    </Suspense>
  )
}
