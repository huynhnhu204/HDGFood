'use client'

import { useState } from 'react'
import { Banknote, CheckCircle2, AlertCircle, Clock, CreditCard, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '@/types'
import { orderService } from '@/services/order.service'
import AdminPaymentStatusBadge from './AdminPaymentStatusBadge'
import { isManualTransferPayment, isVnpayPayment } from '@/lib/payment-flow'

type Props = {
  order: Order
  onUpdated: (order: Order) => void
}

export default function AdminOrderPaymentCard({ order, onUpdated }: Props) {
  const [confirming, setConfirming] = useState(false)

  const isTransfer = isManualTransferPayment(order.payment_method)
  const isVnpay = isVnpayPayment(order.payment_method)
  const isCod = order.payment_method === 'cod'
  const isPaid = order.payment_status === 'paid'
  const needsAction = order.needs_payment_settlement

  const cardStyle = needsAction
    ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
    : isPaid
      ? 'border-emerald-200 bg-emerald-50/30'
      : isVnpay
        ? 'border-blue-200 bg-blue-50/20'
        : 'border-slate-200 bg-white'

  const HeaderIcon = isVnpay ? CreditCard : isTransfer ? QrCode : Banknote

  const handleConfirm = async () => {
    const hint = order.payment_claimed_at
      ? 'Khách đã báo chuyển khoản qua website.'
      : 'Khách chưa bấm «Tôi đã chuyển khoản» — hãy đối chiếu sao kê trước khi xác nhận.'
    if (!confirm(`Xác nhận đã nhận ${order.total_price_formatted}?\n\n${hint}`)) return

    setConfirming(true)
    try {
      const updated = await orderService.confirmPayment(order.id)
      onUpdated(updated)
      toast.success('Đã xác nhận thanh toán.')
    } catch {
      toast.error('Xác nhận thanh toán thất bại.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className={`rounded-2xl border shadow-sm p-5 ${cardStyle}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <HeaderIcon className={`w-4 h-4 ${isVnpay ? 'text-blue-600' : isTransfer ? 'text-amber-600' : 'text-slate-500'}`} />
          Thanh toán
        </h2>
        <AdminPaymentStatusBadge order={order} showMethod={false} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {isCod && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-emerald-100 text-emerald-800">
            COD
          </span>
        )}
        {isTransfer && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-red-100 text-red-800">
            VietQR · Đối soát tay
          </span>
        )}
        {isVnpay && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-blue-100 text-blue-800">
            VNPay · Tự động
          </span>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Phương thức</span>
          <span className="font-bold text-slate-800 text-right max-w-[60%]">
            {isVnpay ? 'VNPay Sandbox' : isTransfer ? 'Chuyển khoản VietQR' : isCod ? 'Tiền mặt (COD)' : order.payment_method}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Số tiền</span>
          <span className="font-black text-[#ed2a2a]">{order.total_price_formatted}</span>
        </div>

        {order.payment_claimed_at && !isPaid && isTransfer && (
          <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100/60 border border-amber-200 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            Khách báo đã CK lúc {order.payment_claimed_at}
          </p>
        )}
        {needsAction && !order.payment_claimed_at && (
          <p className="flex items-start gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            Chưa có xác nhận từ khách — đối chiếu sao kê ngân hàng.
          </p>
        )}
        {isPaid && (
          <p className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            {isVnpay ? 'VNPay đã xác nhận thanh toán' : 'Đã ghi nhận thanh toán'}
          </p>
        )}
        {isVnpay && !isPaid && (
          <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 leading-relaxed">
            Không cần «Xác nhận CK». Khi khách thanh toán trên cổng, hệ thống tự cập nhật. Nếu treo lâu, kiểm tra Merchant Sandbox VNPay.
          </p>
        )}
      </div>

      {needsAction && (
        <button
          type="button"
          disabled={confirming}
          onClick={handleConfirm}
          className="mt-4 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold uppercase tracking-wide disabled:opacity-60 transition-colors"
        >
          {confirming ? 'Đang xử lý...' : 'Xác nhận đã nhận chuyển khoản'}
        </button>
      )}

      {isTransfer && !needsAction && !isPaid && (
        <p className="mt-3 text-[11px] text-slate-500 text-center">Chờ khách quét VietQR và báo đã chuyển.</p>
      )}
    </div>
  )
}
