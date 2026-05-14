import React from 'react'
import { motion } from 'framer-motion'
import type { OrderStatus } from '@/types'

type StatusTone = 'success' | 'warning' | 'danger' | 'info'

const TONE_STYLES: Record<StatusTone, { bg: string; text: string; border: string; dot: string }> = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-400' },
  danger: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', dot: 'bg-rose-400' },
  info: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', dot: 'bg-sky-400' },
}

const STATUS_META: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending: {
    label: 'Chờ xác nhận',
    tone: 'warning',
  },
  confirmed: {
    label: 'Đã xác nhận',
    tone: 'info',
  },
  preparing: {
    label: 'Đang chế biến',
    tone: 'warning',
  },
  ready: {
    label: 'Sẵn sàng',
    tone: 'info',
  },
  serving: {
    label: 'Đang phục vụ',
    tone: 'info',
  },
  completed: {
    label: 'Hoàn thành',
    tone: 'success',
  },
  cancelled: {
    label: 'Đã hủy',
    tone: 'danger',
  },
}

interface StatusBadgeProps {
  status: OrderStatus
  animate?: boolean
}

export default function StatusBadge({ status, animate = true }: StatusBadgeProps) {
  const meta = STATUS_META[status] || STATUS_META.pending
  const style = TONE_STYLES[meta.tone]

  return (
    <motion.span
      initial={animate ? { opacity: 0, scale: 0.9 } : false}
      animate={animate ? { opacity: 1, scale: 1 } : false}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide border
        ${style.bg} ${style.text} ${style.border} shadow-sm
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${status === 'preparing' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </motion.span>
  )
}
