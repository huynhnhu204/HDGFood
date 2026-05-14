'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Eye, UtensilsCrossed, Plus, Pencil, Trash2, SlidersHorizontal, RotateCcw, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { orderService } from '@/services/order.service'
import type { Order, OrderStatus } from '@/types'
import { tableService } from '@/services/table.service'

// ── Config ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string; dot: string; icon: string }> = {
  pending:    { label: 'Chờ xác nhận',  icon: '🕐', badge: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-400' },
  confirmed:  { label: 'Đã xác nhận',   icon: '✓',  badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',       dot: 'bg-cyan-400' },
  preparing:  { label: 'Đang chế biến', icon: '👨‍🍳', badge: 'bg-blue-100 text-blue-700 border-blue-200',        dot: 'bg-blue-400' },
  ready:      { label: 'Sẵn sàng',      icon: '🔔', badge: 'bg-purple-100 text-purple-700 border-purple-200',  dot: 'bg-purple-400' },
  serving:    { label: 'Đang phục vụ',  icon: '🍽️', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-400' },
  completed:  { label: 'Hoàn thành',    icon: '✅', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  cancelled:  { label: 'Đã hủy',        icon: '✕',  badge: 'bg-red-100 text-red-600 border-red-200',          dot: 'bg-red-400' },
}

import StatusBadge from '@/components/StatusBadge'
import { motion, AnimatePresence } from 'framer-motion'

const ORDER_PROGRESS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'serving', 'completed']
const STATUS_PRIORITY: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  serving: 4,
  completed: 5,
  cancelled: 6,
}

type RejectReasonOption = { code: string; label: string }

function getAllowedNextStatuses(current: OrderStatus): OrderStatus[] {
  if (current === 'completed' || current === 'cancelled') return []
  const currentIdx = ORDER_PROGRESS_FLOW.indexOf(current)
  const nextInFlow = currentIdx >= 0 ? ORDER_PROGRESS_FLOW[currentIdx + 1] : undefined
  return nextInFlow ? [nextInFlow, 'cancelled'] : ['cancelled']
}

function getMinutesAgo(timestamp?: string | null) {
  if (!timestamp) return null
  const date = new Date(timestamp.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return null
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  return diff
}

// ── StatusSelect (Thay trạng thái nhanh - component tự thu gọn) ───────────
function StatusSelect({ order, loading, onUpdate }: {
  order: Order; loading: boolean; onUpdate: (id: number, s: OrderStatus) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const allowedStatuses = getAllowedNextStatuses(order.status).filter((status) => {
    if (status !== 'cancelled') return true
    return Boolean(order.cancel_policy?.can_cancel)
  })
  const isLocked = allowedStatuses.length === 0
  
  return (
    <div className="relative inline-block w-full sm:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading || isLocked}
        className="w-full flex items-center justify-between gap-2 px-1 py-1 rounded-full hover:bg-slate-50 transition-all disabled:opacity-50"
      >
        <StatusBadge status={order.status} animate={false} />
        <div className="pr-2 text-slate-400">
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 p-2 overflow-hidden"
            >
              {allowedStatuses.map(st => (
                <button
                  key={st}
                  onClick={() => {
                    onUpdate(order.id, st)
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all
                    ${order.status === st ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                  `}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[st].dot}`} />
                  {STATUS_CONFIG[st].label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}

function ActionButtons({
  order,
  onDelete,
  onCompletePayment,
  onApproveCancel,
  onRejectCancel,
}: {
  order: Order
  onDelete: (order: Order) => void
  onCompletePayment: (order: Order) => void
  onApproveCancel: (order: Order) => void
  onRejectCancel: (order: Order) => void
}) {
  const hasCancelRequest = Boolean(order.cancel_requested_at) && !['cancelled', 'completed'].includes(order.status)

  return (
    <div className="flex items-center justify-center gap-2">
      {hasCancelRequest && (
        <>
          <button
            onClick={() => onApproveCancel(order)}
            title="Duyệt hủy"
            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:shadow-sm transition-all border border-emerald-100"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRejectCancel(order)}
            title="Từ chối hủy"
            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white hover:shadow-sm transition-all border border-red-100"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
      <Link
        href={`/admin/orders/${order.id}`}
        title="Xem chi tiết"
        className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200"
      >
        <Eye className="w-4 h-4" />
      </Link>
      {!['completed', 'cancelled'].includes(order.status) && (
        <Link
          href={`/admin/orders/${order.id}/edit`}
          title="Chỉnh sửa"
          className="p-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white hover:shadow-sm transition-all border border-sky-100"
        >
          <Pencil className="w-4 h-4" />
        </Link>
      )}
      <button
        onClick={() => onDelete(order)}
        title="Xóa"
        className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-sm transition-all border border-rose-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {!['completed', 'cancelled'].includes(order.status) && order.table_number && (
        <button
          onClick={() => onCompletePayment(order)}
          title="Xác nhận thanh toán"
          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:shadow-sm transition-all border border-emerald-100"
        >
          <span className="text-[11px] font-bold">₫</span>
        </button>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const router = useRouter()
  const [orders,      setOrders]      = useState<Order[]>([])
  const [loading,     setLoading]     = useState(true)
  const [updating,    setUpdating]    = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [showCancelRequests, setShowCancelRequests] = useState(false)
  const [statusQuickFilter, setStatusQuickFilter] = useState<OrderStatus | 'all'>('all')
  const [page,        setPage]        = useState(1)
  const [meta,        setMeta]        = useState({ current_page: 1, last_page: 1, total: 0 })
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null)
  const [rejectReasonCode, setRejectReasonCode] = useState('')
  const [rejectReasonOptions, setRejectReasonOptions] = useState<RejectReasonOption[]>([])

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aCancelReq = a.cancel_requested_at ? 1 : 0
      const bCancelReq = b.cancel_requested_at ? 1 : 0
      if (aCancelReq !== bCancelReq) return bCancelReq - aCancelReq

      const pa = STATUS_PRIORITY[a.status] ?? 99
      const pb = STATUS_PRIORITY[b.status] ?? 99
      if (pa !== pb) return pa - pb

      return b.id - a.id
    })
  }, [orders])

  const statusSummary = useMemo(() => {
    const summary: Record<OrderStatus, number> = {
      pending: 0, confirmed: 0, preparing: 0, ready: 0, serving: 0, completed: 0, cancelled: 0,
    }
    for (const order of sortedOrders) {
      summary[order.status] += 1
    }
    return summary
  }, [sortedOrders])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await orderService.getAll({
        status: statusQuickFilter !== 'all' ? statusQuickFilter : undefined,
        search:   search || undefined,
        page,
        per_page: 15,
        cancel_requests: showCancelRequests ? 1 : 0,
      })
      setOrders(res.data)
      setMeta(res.meta)
    } finally {
      setLoading(false)
    }
  }, [statusQuickFilter, search, page, showCancelRequests])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleStatusUpdate = async (orderId: number, status: OrderStatus) => {
    const targetOrder = orders.find(o => o.id === orderId)
    if (!targetOrder) return

    const allowedStatuses = getAllowedNextStatuses(targetOrder.status).filter((nextStatus) => {
      if (nextStatus !== 'cancelled') return true
      return Boolean(targetOrder.cancel_policy?.can_cancel)
    })
    if (!allowedStatuses.includes(status)) {
      toast.error('Chỉ được chuyển trạng thái theo từng bước kế tiếp.')
      return
    }

    setUpdating(orderId)
    try {
      const updated = await orderService.updateStatus(orderId, status)
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      toast.success(`Cập nhật đơn #${orderId}: ${STATUS_CONFIG[status].label}`)
    } catch {
      toast.error('Cập nhật trạng thái thất bại.')
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (order: Order) => {
    const msg = `Xóa đơn #${order.id} của ${order.customer_name}?`
      + (!['completed', 'cancelled'].includes(order.status) ? '\nTồn kho sẽ được hoàn lại.' : '')
    if (!confirm(msg)) return
    try {
      await orderService.remove(order.id)
      toast.success(`Đã xóa đơn #${order.id}`)
      fetchOrders()
    } catch {
      toast.error('Xóa thất bại.')
    }
  }

  const handleCompletePayment = async (order: Order) => {
    const tableId = Number(order.table_number)
    if (!tableId || Number.isNaN(tableId)) {
      toast.error('Đơn này chưa gắn bàn hợp lệ.')
      return
    }
    try {
      await tableService.completePayment(tableId, 'cod')
      toast.success(`Đã xác nhận thanh toán bàn ${tableId}.`)
      fetchOrders()
    } catch {
      toast.error('Xác nhận thanh toán thất bại.')
    }
  }

  const handleApproveCancel = async (order: Order) => {
    try {
      const updated = await orderService.approveCancelRequest(order.id)
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
      toast.success(`Đã duyệt hủy đơn #${order.id}`)
    } catch {
      toast.error('Không thể duyệt hủy đơn.')
    }
  }

  const handleRejectCancel = async (order: Order) => {
    setRejectingOrder(order)
    try {
      const options = await orderService.getRejectReasonCatalog(order.status)
      setRejectReasonOptions(options)
      setRejectReasonCode(options[0]?.code ?? '')
    } catch {
      setRejectReasonOptions([])
      setRejectReasonCode('')
      toast.error('Không tải được danh mục lý do từ chối.')
    }
  }

  const confirmRejectCancel = async () => {
    if (!rejectingOrder) return
    if (!rejectReasonCode.trim()) {
      toast.error('Vui lòng nhập lý do từ chối.')
      return
    }
    try {
      const updated = await orderService.rejectCancelRequest(rejectingOrder.id, rejectReasonCode.trim())
      setOrders(prev => prev.map(o => o.id === rejectingOrder.id ? updated : o))
      toast.success(`Đã từ chối yêu cầu hủy đơn #${rejectingOrder.id}`)
      setRejectingOrder(null)
      setRejectReasonCode('')
      setRejectReasonOptions([])
    } catch {
      toast.error('Không thể từ chối yêu cầu hủy.')
    }
  }

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 md:px-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-[#ed2a2a]" />
            Danh sách Đơn hàng
          </h1>
          <p className="text-sm text-slate-500 mt-1">{loading ? 'Đang tải dữ liệu...' : `Tìm thấy tổng cộng ${meta.total} đơn`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchOrders} disabled={loading}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => router.push('/admin/orders/create')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors shadow-[0_4px_10px_rgba(237,42,42,0.25)]">
            <Plus className="w-5 h-5" />
            <span>Tạo đơn mới</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Tổng quan trạng thái:</span>
        {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => (
          <span
            key={status}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${STATUS_CONFIG[status].badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[status].dot}`} />
            {STATUS_CONFIG[status].label}: {statusSummary[status]}
          </span>
        ))}
      </div>

      {/* Filter bar - Responsive Component */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-6 transition-all">
        {/* Search Form */}
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1) }} className="flex flex-col lg:flex-row gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50 px-3 py-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={statusQuickFilter}
              onChange={(e) => {
                setStatusQuickFilter(e.target.value as OrderStatus | 'all')
                setPage(1)
              }}
              className="bg-transparent text-xs font-semibold uppercase tracking-wide text-slate-600 pr-6"
            >
              <option value="all">Lọc nhanh: tất cả</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="preparing">Đang chế biến</option>
              <option value="ready">Sẵn sàng</option>
              <option value="serving">Đang phục vụ</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setStatusQuickFilter('all')
                setSearchInput('')
                setSearch('')
                setShowCancelRequests(false)
                setPage(1)
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCancelRequests(v => !v)
                setPage(1)
              }}
              className={`inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold border transition-colors ${
                showCancelRequests
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Yêu cầu hủy
            </button>
          </div>
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-colors" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm theo Tên khách, SĐT, Số bàn hoặc Ghi chú..."
              className="w-full pl-12 pr-4 py-3 text-sm font-medium bg-slate-50 border border-slate-100 rounded-full outline-none transition-all focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50" />
          </div>
          <button type="submit" className="px-8 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider rounded-full hover:bg-black transition-all shadow-lg active:scale-95">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* LIST CONTAINER */}
      <div className="w-full">
        
        {/* ── DESKTOP: Bảng ── */}
        <div className="hidden lg:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mã Đơn / Ngày</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Khách Hàng</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng Thái</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tổng Tiền</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-8 py-6"><div className="h-5 bg-slate-100/60 rounded-full animate-pulse w-full"></div></td>
                    ))}
                  </tr>
                ))
              ) : sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-24 text-slate-300">
                    <span className="text-5xl block mb-4 opacity-20">🍽️</span>
                    <p className="text-sm font-black uppercase tracking-widest">Không tìm thấy đơn hàng nào</p>
                  </td>
                </tr>
              ) : sortedOrders.map(order => {
                const cancelMinutesAgo = getMinutesAgo(order.cancel_requested_at)
                const isUrgentCancel = Boolean(order.cancel_requested_at) && order.status === 'preparing'
                return (
                <motion.tr
                  key={order.id}
                  whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.9)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`transition-colors ${isUrgentCancel ? 'bg-red-50/60 animate-pulse' : ''}`}
                >
                  <td className="px-8 py-5">
                    <span className="font-semibold text-slate-900 text-sm tracking-tight">#{order.id}</span>
                    <span className="block text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-tight">{order.created_at}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 flex-wrap">
                       <span className="font-semibold text-slate-800 text-[15px] tracking-tight">{order.customer_name}</span>
                       {order.customer_profile_removed && (
                         <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">
                           Khách đã xóa hồ sơ
                         </span>
                       )}
                       {order.is_guest_order && (
                         <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">
                           Khách vãng lai
                         </span>
                       )}
                       {order.same_email_active_customer_exists && (
                         <span className="bg-violet-50 text-violet-800 border border-violet-200 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">
                           Gmail đã đăng ký lại
                         </span>
                       )}
                       {order.table_number && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider">Bàn {order.table_number}</span>}
                       {order.cancel_requested_at && !['cancelled', 'completed'].includes(order.status) && (
                        <div className="inline-flex flex-col gap-0.5">
                          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-red-200">
                            Yêu cầu hủy
                          </span>
                          <span className="text-[10px] text-red-500 font-medium">
                            {order.cancel_reason || 'Không có lý do'}
                            {cancelMinutesAgo !== null ? ` • ${cancelMinutesAgo} phút trước` : ''}
                          </span>
                        </div>
                       )}
                    </div>
                    <span className="text-xs font-medium text-slate-400 mt-1 block">{order.customer_phone}</span>
                    {order.note && <span className="block mt-2 text-[11px] text-amber-600 font-light italic bg-amber-50/50 px-2 py-1 rounded-lg w-fit">📝 {order.note}</span>}
                  </td>
                  <td className="px-8 py-5">
                    <StatusSelect order={order} loading={updating === order.id} onUpdate={handleStatusUpdate} />
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-lg font-extrabold text-[#ed2a2a] tracking-tight">{order.total_price_formatted}</span>
                  </td>
                  <td className="px-8 py-5">
                    <ActionButtons
                      order={order}
                      onDelete={handleDelete}
                      onCompletePayment={handleCompletePayment}
                      onApproveCancel={handleApproveCancel}
                      onRejectCancel={handleRejectCancel}
                    />
                  </td>
                </motion.tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE: Danh sách thẻ (Card Layout) ── */}
        <div className="lg:hidden space-y-4">
          {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-pulse">
                   <div className="h-6 bg-slate-100 rounded mb-3 w-1/3"></div>
                   <div className="h-4 bg-slate-100 rounded mb-2 w-2/3"></div>
                   <div className="h-10 bg-slate-100 rounded mt-4"></div>
                </div>
             ))
          ) : sortedOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <span className="text-4xl block mb-2 opacity-30">🍽️</span>
              <p className="text-slate-500 font-medium text-sm">Không tìm thấy đơn hàng nào.</p>
            </div>
          ) : sortedOrders.map((order) => {
            const cancelMinutesAgo = getMinutesAgo(order.cancel_requested_at)
            const isUrgentCancel = Boolean(order.cancel_requested_at) && order.status === 'preparing'
            return (
            <div key={order.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative ${isUrgentCancel ? 'ring-1 ring-red-200 bg-red-50/40' : ''}`}>
              
              {/* Vạch màu đỏ mảnh bên trái card tạo điểm nhấn */}
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#ed2a2a] opacity-80"></div>

              {/* Card Header & Main Info */}
              <div className="p-5 pl-6 flex justify-between items-start gap-3">
                <div className="flex flex-col">
                  {/* Mã Đơn */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">#{order.id}</span>
                    {order.table_number && (
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-xs border border-slate-200 shadow-sm">
                        Bàn {order.table_number}
                      </span>
                    )}
                    {order.cancel_requested_at && !['cancelled', 'completed'].includes(order.status) && (
                      <span className="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-md text-[10px] border border-red-200">
                        Yêu cầu hủy
                      </span>
                    )}
                  </div>
                  {order.cancel_requested_at && !['cancelled', 'completed'].includes(order.status) && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {order.cancel_reason || 'Không có lý do'}
                      {cancelMinutesAgo !== null ? ` • ${cancelMinutesAgo} phút trước` : ''}
                    </p>
                  )}
                  {/* Tên khách */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-700 text-[15px]">{order.customer_name}</span>
                    {order.customer_profile_removed && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Khách đã xóa hồ sơ
                      </span>
                    )}
                    {order.is_guest_order && (
                      <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Khách vãng lai
                      </span>
                    )}
                    {order.same_email_active_customer_exists && (
                      <span className="bg-violet-50 text-violet-800 border border-violet-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Gmail đã đăng ký lại
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] font-medium text-slate-400 mt-0.5 flex items-center gap-1.5">
                    {order.customer_phone} 
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span> 
                    {order.created_at.split(' ')[1] || order.created_at}
                  </span>
                </div>
                {/* Tổng Tiền Nổi Bật */}
                <div className="text-right shrink-0 mt-1">
                  <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tổng thanh toán</span>
                  <span className="text-xl font-black text-[#ed2a2a]">{order.total_price_formatted}</span>
                </div>
              </div>

              {/* Note (Nếu có) */}
              {order.note && (
                <div className="mx-6 mb-3 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100/50">
                  <span className="text-xs text-amber-700 font-medium italic flex items-start gap-1.5">
                    <span className="shrink-0 pt-[1px]">📝</span> {order.note}
                  </span>
                </div>
              )}

              {/* Card Footer: Status Select & Actions */}
              <div className="p-4 pl-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center gap-4">
                 <div className="w-full flex-1">
                    <StatusSelect order={order} loading={updating === order.id} onUpdate={handleStatusUpdate} />
                 </div>
                 
                 <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span className="text-[11px] font-medium text-slate-400 sm:hidden">Cập nhật ngay</span>
                    <div className="flex items-center gap-2">
                       <Link href={`/admin/orders/${order.id}`} className="px-4 py-2.5 sm:px-3 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm flex items-center justify-center font-bold text-xs"><Eye className="w-4 h-4" /></Link>
                       {!['completed', 'cancelled'].includes(order.status) && (
                         <Link href={`/admin/orders/${order.id}/edit`} className="px-4 py-2.5 sm:px-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shadow-sm flex items-center justify-center"><Pencil className="w-4 h-4" /></Link>
                       )}
                       <button onClick={() => handleDelete(order)} className="px-4 py-2.5 sm:px-3 rounded-xl bg-red-50 border border-red-100 text-red-500 shadow-sm flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                       {order.cancel_requested_at && !['cancelled', 'completed'].includes(order.status) && (
                        <>
                          <button onClick={() => handleApproveCancel(order)} className="px-4 py-2.5 sm:px-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm flex items-center justify-center"><Check className="w-4 h-4" /></button>
                          <button onClick={() => handleRejectCancel(order)} className="px-4 py-2.5 sm:px-3 rounded-xl bg-red-50 border border-red-100 text-red-600 shadow-sm flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </>
                       )}
                    </div>
                 </div>
              </div>

            </div>
          )})}
        </div>

        {/* Pagination (Responsive) */}
        {meta.last_page > 1 && (
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Trang {meta.current_page} trên {meta.last_page}</p>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 shadow-sm shrink-0">Trở lại</button>
              
              {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} disabled={loading}
                  className={`min-w-[40px] h-[38px] px-2 text-xs font-black rounded-xl transition-all shadow-sm shrink-0
                    ${page === p ? 'bg-[#ed2a2a] text-white border-transparent' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}
                  `}>
                  {p}
                </button>
              ))}

              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page || loading}
                className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 shadow-sm shrink-0">Tiếp theo</button>
            </div>
          </div>
        )}
        
      </div>

      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Từ chối yêu cầu hủy đơn #{rejectingOrder.id}</h3>
            <p className="text-sm text-slate-500">Chọn lý do theo đúng chính sách trạng thái hiện tại.</p>
            <div className="space-y-2">
              {rejectReasonOptions.map((reason) => (
                <label key={reason.code} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="reject_reason"
                    checked={rejectReasonCode === reason.code}
                    onChange={() => setRejectReasonCode(reason.code)}
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingOrder(null)
                  setRejectReasonCode('')
                  setRejectReasonOptions([])
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={confirmRejectCancel}
                className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
