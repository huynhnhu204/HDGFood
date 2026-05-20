'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Wallet, QrCode, CreditCard, Sparkles } from 'lucide-react'
import {
  type CheckoutPaymentMethod,
  CHECKOUT_PAYMENT_OPTIONS,
  ENABLE_MANUAL_BANK_CHECKOUT,
  VNPAY_MIN_AMOUNT,
  canUseVnpay,
  vnpayMinAmountMessage,
} from '@/lib/payment-flow'

const ALL_OPTIONS: {
  id: CheckoutPaymentMethod
  title: string
  subtitle: string
  badge: string
  icon: typeof Wallet
  tone: { ring: string; bg: string; icon: string; badge: string; dot: string }
}[] = [
  {
    id: 'cod',
    title: 'Tiền mặt khi nhận',
    subtitle: 'Trả trực tiếp cho shipper / tại quầy',
    badge: 'COD',
    icon: Wallet,
    tone: {
      ring: 'border-emerald-500',
      bg: 'bg-emerald-50/40',
      icon: 'bg-emerald-100 text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-500',
    },
  },
  {
    id: 'bank',
    title: 'Chuyển khoản VietQR',
    subtitle: 'Quét mã sau đặt hàng — nhà hàng đối soát thủ công',
    badge: 'Thủ công',
    icon: QrCode,
    tone: {
      ring: 'border-[#ed2a2a]',
      bg: 'bg-red-50/40',
      icon: 'bg-red-100 text-[#ed2a2a]',
      badge: 'bg-red-100 text-red-700',
      dot: 'bg-[#ed2a2a]',
    },
  },
  {
    id: 'vnpay',
    title: 'VNPay Sandbox',
    subtitle: 'Thẻ / ví test — hệ thống tự xác nhận, không cần admin',
    badge: 'Tự động',
    icon: CreditCard,
    tone: {
      ring: 'border-blue-500',
      bg: 'bg-blue-50/40',
      icon: 'bg-blue-100 text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
      dot: 'bg-blue-500',
    },
  },
]

const OPTIONS = ALL_OPTIONS.filter((o) => CHECKOUT_PAYMENT_OPTIONS.includes(o.id))

type Props = {
  value: CheckoutPaymentMethod
  onChange: (v: CheckoutPaymentMethod) => void
  /** Tổng phải trả (sau giảm giá, có ship) — dùng để khóa VNPay khi dưới mức tối thiểu */
  payableTotal?: number
}

export default function PaymentMethodPicker({ value, onChange, payableTotal = 0 }: Props) {
  const selected = OPTIONS.find((o) => o.id === value)
  const vnpayAllowed = canUseVnpay(payableTotal)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
          {OPTIONS.length === 2 ? 'COD hoặc VNPay tự động' : 'Chọn hình thức thanh toán'}
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          <Sparkles className="w-3.5 h-3.5" />
          Khuyến nghị: VNPay Sandbox
        </span>
      </div>

      <div className="grid gap-3">
        {OPTIONS.map((opt) => {
          const active = value === opt.id
          const Icon = opt.icon
          const disabled = opt.id === 'vnpay' && !vnpayAllowed
          return (
            <label
              key={opt.id}
              className={`rounded-2xl border-2 p-4 transition-all block ${
                disabled
                  ? 'cursor-not-allowed border-slate-100 bg-slate-50/80 opacity-70'
                  : `cursor-pointer ${active ? `${opt.tone.ring} ${opt.tone.bg} shadow-sm` : 'border-slate-100 hover:border-slate-200 bg-white'}`
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name="payment"
                checked={active}
                disabled={disabled}
                onChange={() => !disabled && onChange(opt.id)}
              />
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    active ? opt.tone.ring : 'border-slate-300'
                  }`}
                >
                  {active && <div className={`w-2.5 h-2.5 rounded-full ${opt.tone.dot}`} />}
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${opt.tone.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-black text-sm text-slate-900">{opt.title}</h4>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${opt.tone.badge}`}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">
                    {disabled
                      ? `Cần tổng đơn từ ${VNPAY_MIN_AMOUNT.toLocaleString('vi-VN')}đ (hiện ${Math.round(payableTotal).toLocaleString('vi-VN')}đ)`
                      : opt.subtitle}
                  </p>
                </div>
              </div>
            </label>
          )
        })}
      </div>

      {!vnpayAllowed && CHECKOUT_PAYMENT_OPTIONS.includes('vnpay') && (
        <p className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          {vnpayMinAmountMessage()} Thêm món hoặc chọn COD.
        </p>
      )}

      <AnimatePresence mode="wait">
        {ENABLE_MANUAL_BANK_CHECKOUT && value === 'bank' && (
          <motion.div
            key="bank-hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 overflow-hidden"
          >
            <p className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1.5">
              <QrCode className="w-4 h-4" /> Sau khi đặt hàng
            </p>
            <ol className="text-[11px] text-red-800/90 space-y-1 list-decimal list-inside font-medium">
              <li>Nhận mã VietQR trên màn hình xác nhận</li>
              <li>Chuyển đúng số tiền và nội dung CK</li>
              <li>Bấm «Tôi đã chuyển khoản» — chờ nhà hàng xác nhận</li>
            </ol>
          </motion.div>
        )}
        {value === 'vnpay' && (
          <motion.div
            key="vnpay-hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 overflow-hidden"
          >
            <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Thanh toán tự động (Sandbox)
            </p>
            <ol className="text-[11px] text-blue-900/90 space-y-1 list-decimal list-inside font-medium">
              <li>Đặt hàng → chuyển sang cổng VNPay Sandbox</li>
              <li>Dùng thẻ test (NCB, số thẻ demo trên trang VNPay)</li>
              <li>Quay lại site — trạng thái «Đã thanh toán» tự cập nhật</li>
            </ol>
          </motion.div>
        )}
        {value === 'cod' && (
          <motion.div
            key="cod-hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-[11px] font-medium text-emerald-800 overflow-hidden"
          >
            Bạn thanh toán bằng tiền mặt khi nhận món. Không cần chuyển khoản trước.
          </motion.div>
        )}
      </AnimatePresence>

      {selected && (
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Đang chọn: <span className="text-slate-700">{selected.title}</span>
        </p>
      )}
    </div>
  )
}
