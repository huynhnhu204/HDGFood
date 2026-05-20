import type { CartItem } from '@/store/useCartStore'
import type { UserTier } from '@/types'
import { TIER_DISCOUNTS, TIER_MIN_ORDER } from '@/types'

export type CheckoutBillLine = {
  id: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
  isCombo: boolean
}

export type CheckoutBillInput = {
  items: CartItem[]
  isDineIn: boolean
  shippingMethod: 'standard' | 'express'
  appliedVoucherDiscount: number
  usePoints: boolean
  userPoints: number
  userTier?: UserTier | null
  /** Chỉ hiển thị — không cộng vào số tiền thanh toán lần này */
  tableOrderFinalTotal?: number
}

export type CheckoutBill = {
  lines: CheckoutBillLine[]
  cartSubtotal: number
  comboOriginalTotal: number
  comboDiscountTotal: number
  tierDiscount: number
  voucherDiscount: number
  pointsDiscount: number
  shippingFee: number
  /** Số tiền khách thanh toán cho lần đặt này (giỏ hiện tại) */
  payableTotal: number
  /** Đơn đang mở tại bàn (tham khảo) */
  tableOrderTotal: number
  /** Tổng bill bàn + món mới (chỉ để hiển thị, không dùng VNPay) */
  tablePlusCartDisplayTotal: number
}

function roundMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100
}

function calcTierDiscount(subtotal: number, tier?: UserTier | null): number {
  if (!tier || subtotal < TIER_MIN_ORDER) return 0
  const pct = TIER_DISCOUNTS[tier] ?? 0
  if (pct <= 0) return 0
  return roundMoney(subtotal * (pct / 100))
}

export function buildCheckoutBill(input: CheckoutBillInput): CheckoutBill {
  const {
    items,
    isDineIn,
    shippingMethod,
    appliedVoucherDiscount,
    usePoints,
    userPoints,
    userTier,
    tableOrderFinalTotal = 0,
  } = input

  const lines: CheckoutBillLine[] = items.map((item) => {
    const qty = Math.max(1, Number(item.quantity || 1))
    const unitPrice = Math.max(0, Number(item.price || 0))
    return {
      id: item.id,
      name: item.name,
      quantity: qty,
      unitPrice,
      lineTotal: roundMoney(unitPrice * qty),
      isCombo: Boolean(item.isCombo),
    }
  })

  const cartSubtotal = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0))

  const comboOriginalTotal = roundMoney(
    items
      .filter((item) => item.isCombo)
      .reduce((sum, item) => {
        const base = Number(item.comboBasePrice || item.price || 0)
        const qty = Math.max(1, Number(item.quantity || 1))
        return sum + base * qty
      }, 0),
  )

  const comboFinalSubtotal = roundMoney(
    items
      .filter((item) => item.isCombo)
      .reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
        0,
      ),
  )

  const comboDiscountTotal = Math.max(0, roundMoney(comboOriginalTotal - comboFinalSubtotal))

  const tierDiscount = calcTierDiscount(cartSubtotal, userTier)

  const afterTier = Math.max(0, cartSubtotal - tierDiscount)
  const voucherDiscount = Math.min(
    Math.max(0, Number(appliedVoucherDiscount || 0)),
    afterTier,
  )

  const afterVoucher = Math.max(0, afterTier - voucherDiscount)
  const rawPointsDiscount = usePoints ? Math.max(0, userPoints * 100) : 0
  const pointsDiscount = Math.min(rawPointsDiscount, afterVoucher)

  const shippingFee = isDineIn ? 0 : shippingMethod === 'express' ? 30000 : 15000

  const payableTotal = roundMoney(
    Math.max(0, afterVoucher - pointsDiscount) + shippingFee,
  )

  const tableOrderTotal = isDineIn
    ? Math.max(0, Number(tableOrderFinalTotal || 0))
    : 0

  return {
    lines,
    cartSubtotal,
    comboOriginalTotal,
    comboDiscountTotal,
    tierDiscount,
    voucherDiscount,
    pointsDiscount,
    shippingFee,
    payableTotal,
    tableOrderTotal,
    tablePlusCartDisplayTotal: roundMoney(tableOrderTotal + payableTotal),
  }
}
