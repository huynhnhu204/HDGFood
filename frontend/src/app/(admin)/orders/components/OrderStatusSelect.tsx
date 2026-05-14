'use client'

import type { OrderStatus } from '@/types'

const OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending',    label: 'Chờ xác nhận' },
  { value: 'confirmed',  label: 'Đã xác nhận' },
  { value: 'preparing',  label: 'Đang chế biến' },
  { value: 'ready',      label: 'Sẵn sàng' },
  { value: 'serving',    label: 'Đang phục vụ' },
  { value: 'completed',  label: 'Hoàn thành' },
  { value: 'cancelled',  label: 'Đã hủy' },
]

interface Props {
  current: OrderStatus
  onChange: (status: OrderStatus) => void
}

export default function OrderStatusSelect({ current, onChange }: Props) {
  // Không cho thay đổi đơn đã hoàn thành hoặc đã hủy
  const isLocked = current === 'completed' || current === 'cancelled'

  return (
    <select
      value={current}
      disabled={isLocked}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-HDG-500"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
