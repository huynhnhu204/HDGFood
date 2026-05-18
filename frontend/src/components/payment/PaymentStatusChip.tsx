'use client'

import { PAYMENT_METHOD_META, paymentStatusBadge } from '@/lib/payment-flow'
import type { Order } from '@/types'

type Props = {
  paymentMethod?: string | null
  paymentStatus?: string | null
  paymentClaimedAt?: string | null
  compact?: boolean
}

export default function PaymentStatusChip({
  paymentMethod,
  paymentStatus,
  paymentClaimedAt,
  compact,
}: Props) {
  const meta = PAYMENT_METHOD_META[paymentMethod || ''] || {
    label: paymentMethod || '—',
    short: paymentMethod || '—',
    tone: 'slate' as const,
  }
  const badge = paymentStatusBadge({
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    payment_claimed_at: paymentClaimedAt,
  })

  const toneRing = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }[meta.tone]

  const statusTone = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    info: 'text-sky-600',
    muted: 'text-slate-500',
  }[badge.tone]

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${toneRing}`}>
        {meta.short}
        <span className="opacity-60">·</span>
        <span className={statusTone}>{badge.label}</span>
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${toneRing}`}>
        {meta.label}
      </span>
      <span className={`text-[10px] font-bold ${statusTone}`}>{badge.label}</span>
    </div>
  )
}
