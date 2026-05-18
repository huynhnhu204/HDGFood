'use client'

import type { Order } from '@/types'
import { paymentStatusBadge, PAYMENT_METHOD_META, isManualTransferPayment, isVnpayPayment } from '@/lib/payment-flow'
import { Banknote, Wallet, CheckCircle2, Clock, CreditCard } from 'lucide-react'

const TONE_CLASS = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  muted: 'bg-slate-50 text-slate-600 border-slate-200',
} as const

const METHOD_TONE = {
  emerald: 'text-emerald-600',
  red: 'text-[#ed2a2a]',
  blue: 'text-blue-600',
  slate: 'text-slate-500',
} as const

type Props = {
  order: Pick<
    Order,
    'payment_status' | 'payment_method' | 'payment_claimed_at' | 'payment_status_label' | 'needs_payment_settlement'
  >
  showMethod?: boolean
}

export default function AdminPaymentStatusBadge({ order, showMethod = true }: Props) {
  const badge = paymentStatusBadge(order)
  const meta = PAYMENT_METHOD_META[order.payment_method || ''] || {
    label: order.payment_method || '—',
    short: '—',
    tone: 'slate' as const,
  }
  const Icon =
    order.payment_status === 'paid'
      ? CheckCircle2
      : order.payment_claimed_at
        ? Clock
        : isVnpayPayment(order.payment_method)
          ? CreditCard
          : isManualTransferPayment(order.payment_method)
            ? Banknote
            : Wallet

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${TONE_CLASS[badge.tone]}`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {badge.label}
      </span>
      {showMethod && (
        <span className={`text-[10px] font-semibold ${METHOD_TONE[meta.tone]}`}>
          {meta.label}
          {meta.badge ? ` · ${meta.badge}` : ''}
        </span>
      )}
    </div>
  )
}
