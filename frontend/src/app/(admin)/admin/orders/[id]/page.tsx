'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import { ArrowLeft, Printer, Phone, MapPin, User, Clock, StickyNote, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { orderService } from '@/services/order.service'
import type { Order, OrderStatus } from '@/types'
import AdminOrderPaymentCard from '@/components/admin/AdminOrderPaymentCard'

const STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string; dot: string; icon: string }> = {
  pending:   { label: 'Chờ xác nhận', icon: '🕐', badge: 'bg-amber-100 text-amber-700 border-amber-200',      dot: 'bg-amber-400' },
  confirmed: { label: 'Đã xác nhận',  icon: '✅', badge: 'bg-sky-100 text-sky-700 border-sky-200',            dot: 'bg-sky-400' },
  preparing: { label: 'Đang chế biến', icon: '👨‍🍳', badge: 'bg-orange-100 text-orange-700 border-orange-200',  dot: 'bg-orange-400' },
  ready:     { label: 'Sẵn sàng',     icon: '🍳', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  serving:   { label: 'Đang phục vụ', icon: '🍽️', badge: 'bg-violet-100 text-violet-700 border-violet-200',   dot: 'bg-violet-400' },
  completed: { label: 'Hoàn thành',   icon: '🎉', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  cancelled: { label: 'Đã hủy',       icon: '✕',  badge: 'bg-red-100 text-red-600 border-red-200',            dot: 'bg-red-400' },
}

const FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'serving', 'completed']
const CONFIRMED_CANCEL_WINDOW_SECONDS = 5 * 60
const CANCELLATION_REASONS = [
  'Tôi muốn đổi món',
  'Đặt nhầm địa chỉ',
  'Khách chờ lâu quá',
  'Khách đổi phương thức thanh toán',
  'Lý do khác',
]

const STATUS_HINTS: Partial<Record<OrderStatus, string>> = {
  pending: 'Cửa hàng đang kiểm tra đơn của bạn...',
  confirmed: 'Đơn đã được tiếp nhận. Bạn có 5 phút để thay đổi.',
  preparing: 'Đầu bếp đang chuẩn bị món ăn, không thể hủy lúc này.',
  ready: 'Món đã sẵn sàng, ưu tiên xác nhận phục vụ sớm.',
  serving: 'Nhân viên đang mang món đến cho khách.',
  completed: 'Đơn hoàn tất. Nếu có vấn đề, chuyển sang khiếu nại/hoàn trả.',
}

function getPolicyTone(order: Order) {
  if (order.cancel_policy?.can_cancel) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (order.cancel_policy?.hotline_required) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function parseOrderDate(value: string | undefined): Date | null {
  if (!value) return null
  const normalized = value.trim()
  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, dd, mm, yyyy, hh, min] = match
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const printRef = useRef<HTMLDivElement>(null)

  const [order,    setOrder]    = useState<Order | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0])
  const [countdownTick, setCountdownTick] = useState(() => Date.now())

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `HDG-${id}` })

  useEffect(() => {
    orderService.getById(Number(id))
      .then(setOrder)
      .catch(() => toast.error('Không tìm thấy đơn hàng.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order) return
    setUpdating(true)
    try {
      const updated = await orderService.updateStatus(
        order.id,
        status,
        status === 'cancelled' ? cancelReason : undefined,
      )
      setOrder(updated)
      toast.success(`${STATUS_CONFIG[status].icon} ${STATUS_CONFIG[status].label}`)
      if (status === 'cancelled') {
        setShowCancelModal(false)
      }
    } catch {
      toast.error('Cập nhật thất bại.')
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    if (order?.status !== 'confirmed') return
    const timer = window.setInterval(() => setCountdownTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [order?.status])

  const cancelCountdown = useMemo(() => {
    if (!order) return null
    const canCancelNow = Boolean(order.cancel_policy?.can_cancel) && !['completed', 'cancelled'].includes(order.status)
    if (order.status !== 'confirmed' || !canCancelNow) return null

    const confirmedAt = parseOrderDate(order.updated_at)
    if (!confirmedAt) return null

    const elapsed = Math.floor((countdownTick - confirmedAt.getTime()) / 1000)
    return Math.max(0, CONFIRMED_CANCEL_WINDOW_SECONDS - elapsed)
  }, [order, countdownTick])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#ed2a2a] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!order) return (
    <div className="text-center py-20 text-slate-400">
      <p className="text-4xl mb-3">🍽️</p>
      <p className="mb-4">Không tìm thấy đơn hàng.</p>
      <button onClick={() => router.back()} className="text-sm text-[#ed2a2a] hover:underline">← Quay lại</button>
    </div>
  )

  const cfg        = STATUS_CONFIG[order.status]
  const currentIdx = FLOW.indexOf(order.status)
  const isLocked   = order.status === 'completed' || order.status === 'cancelled'
  const cancelPolicy = order.cancel_policy
  const canCancel = Boolean(cancelPolicy?.can_cancel) && !isLocked
  const statusHint = STATUS_HINTS[order.status]

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Đơn hàng #{order.id}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-1 ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.icon} {cfg.label}
            </span>
          </div>
        </div>
        <button onClick={() => handlePrint()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors">
          <Printer className="w-4 h-4" /> In hóa đơn
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left */}
        <div className="col-span-2 space-y-5">

          {/* Thông tin khách */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Thông tin khách hàng</h2>
              <div className="flex flex-wrap gap-2 justify-end">
                {order.customer_profile_removed && (
                  <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Khách đã xóa hồ sơ
                  </span>
                )}
                {order.is_guest_order && (
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Khách vãng lai
                  </span>
                )}
                {order.same_email_active_customer_exists && (
                  <span className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800">
                    Gmail đã đăng ký lại
                  </span>
                )}
              </div>
            </div>
            {order.same_email_active_customer_exists && (
              <p className="text-xs text-violet-800 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 mb-4 leading-relaxed">
                Email đã lưu khi đặt đơn trùng với một <strong>tài khoản khách đang hoạt động</strong> — thường gặp khi khách đăng ký lại cùng Gmail sau khi đóng tài khoản cũ. Đơn này vẫn là đơn &quot;cũ&quot;, không gộp vào hồ sơ TK mới của khách.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={<User className="w-4 h-4" />}       label="Họ tên"    value={order.customer_name} />
              <InfoRow icon={<Phone className="w-4 h-4" />}      label="SĐT"       value={order.customer_phone} />
              {order.customer_email_snapshot ? (
                <InfoRow icon={<Mail className="w-4 h-4" />}    label="Email lúc đặt (đã lưu)" value={order.customer_email_snapshot} className="col-span-2" />
              ) : null}
              <InfoRow icon={<MapPin className="w-4 h-4" />}     label="Số bàn"    value={order.table_number ?? 'Mang về / Đặt online'} />
              <InfoRow icon={<Clock className="w-4 h-4" />}      label="Giờ đặt"   value={order.created_at} />
              {order.note && (
                <InfoRow icon={<StickyNote className="w-4 h-4" />} label="Ghi chú" value={order.note} className="col-span-2" />
              )}
            </div>
          </div>

          {/* Danh sách món */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Món đã đặt</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Món ăn</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">SL</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Giá Vốn</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Đơn giá</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Lợi Nhuận</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items?.map((item) => {
                  const profit = item.profit ?? 0
                  const profitColor = profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-slate-600'
                  const isCombo = item.item_type === 'combo'
                  const comboItems = item.options_snapshot?.combo_items || []
                  const itemImage = isCombo ? item.combo?.image : item.product?.image
                  const itemName = isCombo
                    ? (item.combo?.name || item.options_snapshot?.combo_name || 'Combo')
                    : (item.product?.name || '—')
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {itemImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={itemImage} alt={itemName}
                              className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800 truncate">{itemName}</span>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                  isCombo
                                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                                }`}
                              >
                                {isCombo ? 'Combo' : 'Món lẻ'}
                              </span>
                            </div>
                            {isCombo && comboItems.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {comboItems.map((ci, idx) => (
                                  <span
                                    key={`${ci.product_id}-${idx}`}
                                    className="rounded-md border border-violet-100 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
                                  >
                                    {ci.name} x{ci.quantity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-500">
                        {item.cost_price != null 
                          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.cost_price)
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-500">{item.price_formatted}</td>
                      <td className={`px-4 py-3 text-right text-sm font-semibold ${profitColor}`}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(profit)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">{item.subtotal_formatted}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Tổng giá vốn</td>
                  <td className="px-4 py-3 text-right text-base font-bold text-slate-700">
                    {order.total_cost != null 
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_cost)
                      : '—'
                    }
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Tổng lợi nhuận</td>
                  <td className={`px-4 py-3 text-right text-base font-bold ${
                    (order.total_profit ?? 0) > 0 ? 'text-green-600' : (order.total_profit ?? 0) < 0 ? 'text-red-600' : 'text-slate-700'
                  }`}>
                    {order.total_profit != null 
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_profit)
                      : '—'
                    }
                  </td>
                </tr>
                <tr className="bg-slate-50 border-t-2 border-slate-300">
                  <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Tổng cộng</td>
                  <td className="px-4 py-3 text-right text-base font-black text-[#ed2a2a]">{order.total_price_formatted}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right: payment + status */}
        <div className="space-y-5">
          <AdminOrderPaymentCard order={order} onUpdated={setOrder} />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Tiến trình đơn hàng</h2>

            {/* Flow steps */}
            <div className="space-y-2 mb-5">
              {FLOW.map((s, i) => {
                const done    = currentIdx > i
                const current = currentIdx === i && order.status !== 'cancelled'
                const scfg    = STATUS_CONFIG[s]
                return (
                  <div key={s} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all
                    ${current ? scfg.badge + ' border' : done ? 'opacity-40' : 'opacity-20'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${done || current ? scfg.dot + ' text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className="text-xs font-medium">{scfg.icon} {scfg.label}</span>
                  </div>
                )
              })}
              {order.status === 'cancelled' && (
                <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${STATUS_CONFIG.cancelled.badge}`}>
                  <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center text-xs text-white font-bold shrink-0">✕</div>
                  <span className="text-xs font-medium">✕ Đã hủy</span>
                </div>
              )}
            </div>

            <div className={`mb-4 rounded-xl border px-3 py-2.5 text-xs ${getPolicyTone(order)}`}>
              <p className="font-semibold mb-1">Chính sách hủy hiện tại</p>
              <p>{cancelPolicy?.reason || 'Có thể hủy miễn phí khi đơn đang chờ xác nhận.'}</p>
              {order.status === 'confirmed' && canCancel && cancelCountdown !== null && (
                <p className="mt-1 font-semibold">
                  Hủy đơn trong: {formatDuration(cancelCountdown)}
                </p>
              )}
            </div>
            {statusHint && (
              <p className="mb-4 text-[11px] text-slate-500 leading-relaxed">
                {statusHint}
              </p>
            )}

            {/* Action buttons */}
            {!isLocked ? (
              <div className="space-y-2">
                {FLOW[currentIdx + 1] && (
                  <button disabled={updating} onClick={() => handleStatusChange(FLOW[currentIdx + 1])}
                    className="w-full py-2.5 bg-[#ed2a2a] hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95">
                    {STATUS_CONFIG[FLOW[currentIdx + 1]].icon} {STATUS_CONFIG[FLOW[currentIdx + 1]].label}
                  </button>
                )}
                {canCancel ? (
                  <button disabled={updating} onClick={() => setShowCancelModal(true)}
                    className="w-full py-2 border border-red-300 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-all disabled:opacity-50">
                    Hủy đơn hàng
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      {cancelPolicy?.hotline_required
                        ? 'Đơn đang chế biến. Nếu khách muốn hủy, vui lòng xác nhận qua hotline.'
                        : (cancelPolicy?.reason || 'Đơn hiện không thể hủy ở trạng thái này.')}
                    </p>
                    {(order.status === 'preparing' || order.status === 'ready' || order.status === 'serving') && (
                      <a
                        href="tel:19001234"
                        className="block w-full py-2 text-center border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all"
                      >
                        Liên hệ hỗ trợ (Hotline)
                      </a>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {cancelPolicy?.note || 'Lưu ý: Có thể hủy miễn phí ở trạng thái Chờ xác nhận; sau khi xác nhận chỉ có 5 phút để đổi quyết định.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center italic">Đơn hàng đã kết thúc</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Thời gian</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Giờ đặt</span>
                <span className="font-medium text-slate-700">{order.created_at}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cập nhật</span>
                <span className="font-medium text-slate-700">{order.updated_at}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print area */}
      <div className="hidden">
        <div ref={printRef} className="p-8 max-w-xl mx-auto font-sans text-slate-900">
          <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
            <h1 className="text-2xl font-black text-[#ed2a2a]">HDG Food</h1>
            <p className="text-slate-500 text-sm">HÓA ĐƠN THANH TOÁN</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div><span className="text-slate-400">Số đơn:</span> <strong>#{order.id}</strong></div>
            <div><span className="text-slate-400">Giờ:</span> <strong>{order.created_at}</strong></div>
            <div><span className="text-slate-400">Khách:</span> <strong>{order.customer_name}</strong></div>
            <div><span className="text-slate-400">SĐT:</span> <strong>{order.customer_phone}</strong></div>
            {order.table_number && (
              <div><span className="text-slate-400">Bàn:</span> <strong>{order.table_number}</strong></div>
            )}
            {order.note && (
              <div className="col-span-2"><span className="text-slate-400">Ghi chú:</span> <em>{order.note}</em></div>
            )}
          </div>
          <table className="w-full text-sm mb-4 border-t border-slate-200">
            <thead><tr className="border-b border-slate-200">
              <th className="text-left py-2">Món ăn</th>
              <th className="text-center py-2 w-12">SL</th>
              <th className="text-right py-2 w-20">G.Vốn</th>
              <th className="text-right py-2 w-24">Giá</th>
              <th className="text-right py-2 w-24">L.Nhuận</th>
              <th className="text-right py-2 w-28">T.Tiền</th>
            </tr></thead>
            <tbody>
              {order.items?.map((item) => {
                const profit = item.profit ?? 0
                const isCombo = item.item_type === 'combo'
                const comboItems = item.options_snapshot?.combo_items || []
                const itemName = isCombo
                  ? (item.combo?.name || item.options_snapshot?.combo_name || 'Combo')
                  : (item.product?.name || '—')
                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <div className="font-medium">{itemName}</div>
                      <div className="mt-0.5">
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase ${isCombo ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {isCombo ? 'Combo' : 'Món lẻ'}
                        </span>
                      </div>
                      {isCombo && comboItems.length > 0 && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          {comboItems.map((ci) => `${ci.name} x${ci.quantity}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">
                      {item.cost_price != null 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.cost_price)
                        : '—'
                      }
                    </td>
                    <td className="py-2 text-right">{item.price_formatted}</td>
                    <td className="py-2 text-right font-medium">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(profit)}
                    </td>
                    <td className="py-2 text-right font-medium">{item.subtotal_formatted}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="space-y-1 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Tổng giá vốn:</span>
              <span className="font-semibold">
                {order.total_cost != null 
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_cost)
                  : '—'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Tổng lợi nhuận:</span>
              <span className="font-semibold">
                {order.total_profit != null 
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_profit)
                  : '—'
                }
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center border-t-2 border-slate-900 pt-3">
            <span className="font-bold text-base">TỔNG CỘNG</span>
            <span className="font-black text-xl text-[#ed2a2a]">{order.total_price_formatted}</span>
          </div>
          <p className="text-center text-slate-400 text-xs mt-6 pt-4 border-t border-slate-100">
            Cảm ơn quý khách! Hẹn gặp lại tại HDG Food 🍽️
          </p>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Bạn chắc chắn muốn hủy đơn này?</h3>
            <p className="mt-1 text-sm text-slate-500">
              Chọn lý do để hệ thống lưu lại phản hồi và tối ưu vận hành.
            </p>
            <div className="mt-4 space-y-2">
              {CANCELLATION_REASONS.map((reason) => (
                <label key={reason} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={cancelReason === reason}
                    onChange={() => setCancelReason(reason)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700"
              >
                Giữ lại đơn
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatusChange('cancelled')}
                className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value, className = '' }: {
  icon: React.ReactNode; label: string; value: string; className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">{icon} {label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}
