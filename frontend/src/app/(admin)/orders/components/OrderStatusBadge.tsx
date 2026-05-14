import type { OrderStatus } from '@/types'

const LABELS: Record<OrderStatus, string> = {
  pending:    'Chờ xác nhận',
  confirmed:  'Đã xác nhận',
  preparing:  'Đang chế biến',
  ready:      'Sẵn sàng',
  serving:    'Đang phục vụ',
  completed:  'Hoàn thành',
  cancelled:  'Đã hủy',
}

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge-${status}`}>{LABELS[status]}</span>
}
