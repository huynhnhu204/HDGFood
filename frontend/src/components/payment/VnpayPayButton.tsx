'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { paymentService } from '@/services/payment.service'
import { useAuthStore } from '@/store/authStore'
import { canUseVnpay, vnpayMinAmountMessage } from '@/lib/payment-flow'

type Props = {
  orderId: number
  customerPhone?: string
  className?: string
  label?: string
  /** Tổng đơn — nếu dưới mức tối thiểu VNPay thì nút bị vô hiệu */
  orderTotal?: number
}

export default function VnpayPayButton({
  orderId,
  customerPhone,
  className = '',
  label = 'Thanh toán VNPay Sandbox',
  orderTotal,
}: Props) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const eligible = orderTotal === undefined || canUseVnpay(orderTotal)

  const handlePay = async () => {
    if (!eligible) {
      toast.error(vnpayMinAmountMessage())
      return
    }
    setLoading(true)
    try {
      const { payment_url } = await paymentService.createVnpayPayment(
        orderId,
        customerPhone,
        Boolean(user),
      )
      toast.success('Chuyển sang cổng VNPay...')
      window.location.href = payment_url
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Không mở được VNPay. Kiểm tra cấu hình VNPAY trên server.')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      disabled={loading || !eligible}
      onClick={handlePay}
      className={
        className ||
        'w-full py-3.5 rounded-full bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-60 hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20'
      }
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      {loading ? 'Đang mở VNPay...' : label}
    </button>
  )
}
