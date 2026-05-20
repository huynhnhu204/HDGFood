import type { Order } from '@/types'

/**
 * Mức A — VietQR + đối soát thủ công (`bank`)
 * Mức B — VNPay Sandbox (`vnpay`) — IPN tự cập nhật paid
 */

export type CheckoutPaymentMethod = 'cod' | 'bank' | 'vnpay'

/** Bật VietQR thủ công trên checkout (cần admin đối soát). Tắt = chỉ COD + VNPay Sandbox. */
export const ENABLE_MANUAL_BANK_CHECKOUT = false

export const DEFAULT_CHECKOUT_PAYMENT: CheckoutPaymentMethod = 'vnpay'

/** Mức tối thiểu thanh toán VNPay (đồng) — đồng bộ với VNPAY_MIN_AMOUNT trên server */
export const VNPAY_MIN_AMOUNT = 1_000

export function canUseVnpay(amount: number): boolean {
  return Math.round(Number(amount) || 0) >= VNPAY_MIN_AMOUNT
}

export function vnpayMinAmountMessage(): string {
  return `Số tiền tối thiểu ${VNPAY_MIN_AMOUNT.toLocaleString('vi-VN')}đ để thanh toán VNPay.`
}

export const CHECKOUT_PAYMENT_OPTIONS: CheckoutPaymentMethod[] = ENABLE_MANUAL_BANK_CHECKOUT
  ? ['cod', 'bank', 'vnpay']
  : ['cod', 'vnpay']

export type PaymentFlowVariant = 'manual' | 'vnpay'

export function getPaymentFlowSteps(variant: PaymentFlowVariant) {
  return variant === 'vnpay' ? PAYMENT_FLOW_STEPS_VNPAY : PAYMENT_FLOW_STEPS_MANUAL
}

export function checkoutCtaLabel(method: CheckoutPaymentMethod): string {
  if (method === 'vnpay') return 'Đặt hàng & thanh toán VNPay'
  if (method === 'bank') return 'Đặt hàng & nhận mã VietQR'
  return 'Đặt hàng ngay'
}

export const PAYMENT_METHOD_META: Record<
  string,
  { label: string; short: string; tone: 'emerald' | 'red' | 'blue' | 'slate'; badge?: string }
> = {
  cod: { label: 'Thanh toán khi nhận (COD)', short: 'COD', tone: 'emerald', badge: 'Trả khi nhận' },
  bank: { label: 'Chuyển khoản VietQR', short: 'VietQR', tone: 'red', badge: 'Đối soát thủ công' },
  momo: { label: 'Chuyển khoản VietQR', short: 'VietQR', tone: 'red', badge: 'Đối soát thủ công' },
  vnpay: { label: 'VNPay', short: 'VNPay', tone: 'blue', badge: 'Tự động' },
}

export const MANUAL_TRANSFER_METHODS = ['bank', 'momo'] as const
export const GATEWAY_PAYMENT_METHODS = ['vnpay'] as const

/** Giá trị cũ trong DB */
export const LEGACY_TRANSFER_METHODS = ['bank', 'momo', 'vnpay'] as const

export function isManualTransferPayment(method?: string | null): boolean {
  return MANUAL_TRANSFER_METHODS.includes((method || '') as (typeof MANUAL_TRANSFER_METHODS)[number])
}

export function isVnpayPayment(method?: string | null): boolean {
  return method === 'vnpay'
}

/** VietQR thủ công — không gồm VNPay */
export function isTransferPayment(method?: string | null): boolean {
  return isManualTransferPayment(method)
}

export function needsTransferSettlement(
  order: Pick<Order, 'payment_method'> & { payment_status?: Order['payment_status'] | string | null },
): boolean {
  return order.payment_status === 'unpaid' && isManualTransferPayment(order.payment_method)
}

export const PAYMENT_FLOW_STEPS_MANUAL = [
  { step: 1, title: 'Đặt hàng', desc: 'Đơn được tạo, chờ thanh toán' },
  { step: 2, title: 'Chuyển khoản', desc: 'Quét VietQR, đúng số tiền & nội dung' },
  { step: 3, title: 'Xác nhận', desc: 'Báo đã CK → Admin đối soát' },
] as const

export const PAYMENT_FLOW_STEPS = PAYMENT_FLOW_STEPS_MANUAL

export const PAYMENT_FLOW_STEPS_VNPAY = [
  { step: 1, title: 'Đặt hàng', desc: 'Đơn được tạo' },
  { step: 2, title: 'VNPay', desc: 'Thanh toán trên cổng Sandbox' },
  { step: 3, title: 'Hoàn tất', desc: 'Hệ thống tự xác nhận' },
] as const

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Thanh toán khi nhận (COD)',
  bank: 'Chuyển khoản VietQR',
  momo: 'Chuyển khoản VietQR',
  vnpay: 'VNPay (thẻ / ví — Sandbox)',
}

export function paymentStatusBadge(
  order: Pick<Order, 'payment_claimed_at' | 'payment_method' | 'payment_status_label'> & {
    payment_status?: Order['payment_status'] | string | null
  },
) {
  if (order.payment_status === 'paid') return { label: 'Đã thanh toán', tone: 'success' as const }
  if (order.payment_status === 'refunded') return { label: 'Đã hoàn tiền', tone: 'muted' as const }
  if (isVnpayPayment(order.payment_method) && order.payment_status === 'unpaid') {
    return { label: 'Chờ VNPay', tone: 'info' as const }
  }
  if (needsTransferSettlement(order)) {
    if (order.payment_claimed_at) return { label: 'Chờ đối soát', tone: 'warning' as const }
    return { label: 'Chờ chuyển khoản', tone: 'warning' as const }
  }
  if (order.payment_method === 'cod') return { label: 'COD — trả khi nhận', tone: 'info' as const }
  return { label: order.payment_status_label || 'Chưa thanh toán', tone: 'muted' as const }
}
