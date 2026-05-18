import type { PaymentInfo } from '@/services/payment.service'

export { PAYMENT_METHOD_LABELS, isTransferPayment, needsTransferSettlement } from '@/lib/payment-flow'

export function buildVietQrUrl(
  bank: Pick<PaymentInfo, 'bank_bin' | 'bank_account' | 'bank_account_name'>,
  amount: number,
  transferReference: string,
): string | null {
  const account = (bank.bank_account || '').trim()
  const bin = (bank.bank_bin || '').trim()
  if (!account || !bin) return null

  const addInfo = encodeURIComponent(transferReference)
  const accountName = encodeURIComponent(bank.bank_account_name || 'HDG FOOD')
  const amountValue = Math.max(0, Math.round(amount))

  return `https://img.vietqr.io/image/${bin}-${account}-compact2.png?amount=${amountValue}&addInfo=${addInfo}&accountName=${accountName}`
}

export function buildTransferReference(prefix: string, orderNumber: string, orderId: string | number) {
  const ref = orderNumber || String(orderId)
  return `${(prefix || 'HDGFOOD').toUpperCase()}${ref}`
}

