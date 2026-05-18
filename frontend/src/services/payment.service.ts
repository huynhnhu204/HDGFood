import api from './api'
import type { Order } from '@/types'

export interface PaymentInfo {
  bank_bin: string
  bank_account: string
  bank_account_name: string
  bank_transfer_note_prefix: string
  configured: boolean
}

export interface PaymentQrPayload {
  order_id: number
  order_number: string
  amount: number
  transfer_reference: string
  payment_method: string
  payment_status: string
  payment_claimed_at: string | null
  qr_image_url: string | null
  bank: PaymentInfo
}

export const paymentService = {
  async getPublicInfo() {
    const { data } = await api.get<{ data: PaymentInfo }>('/public/payment-info')
    return data.data
  },

  /**
   * Luôn dùng route public — vẫn gửi Bearer token nếu đã đăng nhập (admin / chủ đơn).
   * Tránh lỗi «đơn không thuộc về bạn» khi admin/khách mở đơn qua URL success.
   */
  async getOrderQr(orderId: number, customerPhone?: string) {
    const { data } = await api.get<{ data: PaymentQrPayload }>(
      `/public/orders/${orderId}/payment-qr`,
      { params: customerPhone ? { customer_phone: customerPhone } : undefined },
    )
    return data.data
  },

  async claimPayment(orderId: number, customerPhone?: string) {
    const { data } = await api.post<{ message: string; data: Order }>(
      `/public/orders/${orderId}/claim-payment`,
      customerPhone ? { customer_phone: customerPhone } : {},
    )
    return data
  },

  async confirmPaymentAdmin(orderId: number) {
    const { data } = await api.post<{ message: string; data: Order }>(
      `/admin/orders/${orderId}/confirm-payment`,
    )
    return data.data
  },

  async createVnpayPayment(orderId: number, customerPhone?: string, useAuthRoute = false) {
    const path = useAuthRoute
      ? `/orders/${orderId}/vnpay/create`
      : `/public/orders/${orderId}/vnpay/create`
    const { data } = await api.post<{ data: { payment_url: string; txn_ref: string } }>(
      path,
      customerPhone ? { customer_phone: customerPhone } : {},
    )
    return data.data
  },

  async checkVnpayStatus(orderId: number, customerPhone?: string, authenticated = false) {
    const path = authenticated
      ? `/orders/${orderId}/vnpay/status`
      : `/public/orders/${orderId}/vnpay/status`
    const { data } = await api.get<{ data: { order_id: number; payment_status: string; paid: boolean } }>(
      path,
      { params: customerPhone ? { customer_phone: customerPhone } : undefined },
    )
    return data.data
  },
}
