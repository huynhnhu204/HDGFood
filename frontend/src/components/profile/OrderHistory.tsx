'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Package, Loader2, ChevronLeft, ChevronRight, ShoppingBag, Clock3, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { profileService } from '@/services/profile.service'
import { paymentService } from '@/services/payment.service'
import { needsTransferSettlement, isVnpayPayment } from '@/lib/payment-flow'
import PaymentStatusChip from '@/components/payment/PaymentStatusChip'
import type { Order, OrderStatus } from '@/types'

const STATUS_MAP: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending:    { label: 'Chờ xác nhận',   bg: 'bg-orange-100', text: 'text-orange-700' },
  confirmed:  { label: 'Đã xác nhận',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  preparing:  { label: 'Đang chế biến', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ready:      { label: 'Sẵn sàng',      bg: 'bg-purple-100', text: 'text-purple-700' },
  serving:    { label: 'Đang phục vụ', bg: 'bg-cyan-100',   text: 'text-cyan-700' },
  completed:  { label: 'Hoàn thành',   bg: 'bg-emerald-100',text: 'text-emerald-700' },
  cancelled:  { label: 'Đã huỷ',       bg: 'bg-red-100',    text: 'text-red-700' },
}

const CANCEL_REASONS = [
  'Đổi ý',
  'Đặt nhầm',
  'Thời gian giao lâu',
  'Quên áp mã giảm giá',
  'Lý do khác',
]

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function extractCancelRejectMessage(note?: string) {
  if (!note) return null
  const marker = 'Từ chối yêu cầu hủy:'
  const idx = note.lastIndexOf(marker)
  if (idx === -1) return null
  return note.slice(idx).trim()
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active')
  const [modalOrder, setModalOrder] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0])
  const [submitting, setSubmitting] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    loadOrders()
  }, [page])

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await profileService.getOrders(page)
      setOrders(res.data || [])
      setLastPage(res.meta?.last_page || 1)
      setTotal(res.meta?.total || 0)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const visibleOrders = useMemo(() => {
    if (activeTab === 'cancelled') return orders.filter(o => o.status === 'cancelled')
    return orders.filter(o => o.status !== 'cancelled')
  }, [orders, activeTab])

  const handleClaimPayment = async (order: Order) => {
    setSubmitting(true)
    try {
      const res = await paymentService.claimPayment(order.id, order.customer_phone || undefined)
      toast.success(res.message)
      await loadOrders()
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Không gửi được xác nhận.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVnpayPayment = async (order: Order) => {
    setSubmitting(true)
    try {
      const { payment_url } = await paymentService.createVnpayPayment(order.id, undefined, true)
      window.location.href = payment_url
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Không mở được VNPay.')
      setSubmitting(false)
    }
  }

  const renderPaymentActions = (order: Order) => {
    if (order.payment_status === 'paid') return null
    if (needsTransferSettlement(order)) {
      return (
        <div className="flex flex-col gap-1 items-center">
          <Link
            href={`/checkout/payment?order_id=${order.id}&payment_method=${order.payment_method || 'vnpay'}`}
            className="inline-flex px-3 py-1 rounded-lg text-[11px] font-bold border border-[#ed2a2a] text-[#ed2a2a] hover:bg-red-50"
          >
            Quét VietQR
          </Link>
          {!order.payment_claimed_at && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleClaimPayment(order)}
              className="inline-flex px-3 py-1 rounded-lg text-[11px] font-bold border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Đã chuyển khoản
            </button>
          )}
          {order.payment_claimed_at && (
            <span className="text-[10px] font-bold text-amber-600">Chờ đối soát</span>
          )}
        </div>
      )
    }
    if (isVnpayPayment(order.payment_method)) {
      return (
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleVnpayPayment(order)}
          className="inline-flex px-3 py-1 rounded-lg text-[11px] font-bold border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          Thanh toán VNPay
        </button>
      )
    }
    return null
  }

  const handleCancel = async (order: Order, requestOnly = false) => {
    setSubmitting(true)
    try {
      const res = await profileService.cancelOrder(order.id, {
        cancel_reason: cancelReason,
        request_only: requestOnly,
      })
      toast.success(res.message)
      setModalOrder(null)
      await loadOrders()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể xử lý hủy đơn.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#ed2a2a]" />
            </div>
            Đơn Hàng Của Tôi
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1 ml-[52px]">
            Tổng cộng {total} đơn hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              activeTab === 'active'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            Đang xử lý
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              activeTab === 'cancelled'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            Đã hủy
          </button>
        </div>
      </div>

      <div className="mx-6 lg:mx-8 mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-800 mb-1.5">Lịch sử đơn và đăng ký lại bằng Gmail</p>
        <p>
          Trang này chỉ hiển thị đơn gắn với <strong>tài khoản bạn đang đăng nhập</strong>.
          Nếu bạn từng đóng tài khoản và <strong>tạo tài khoản mới bằng cùng Gmail</strong>, đây là hai hồ sơ khác nhau:
          các đơn đặt trước khi đóng tài khoản cũ <strong>không</strong> xuất hiện ở đây.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin mb-4" />
          <span className="font-bold text-slate-500 uppercase tracking-widest text-sm animate-pulse">Đang tải...</span>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-slate-300" />
          </div>
          <span className="text-slate-500 font-semibold mb-1">Chưa có đơn hàng nào</span>
          <p className="text-sm text-slate-400 max-w-sm">Hãy khám phá menu và đặt món ngay!</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider">Mã đơn</th>
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider">Ngày đặt</th>
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider text-right">Tổng tiền</th>
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleOrders.map(order => {
                  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending
                  const canCancel = Boolean(order.cancel_policy?.can_cancel)
                  const canRequestManual = Boolean(order.cancel_policy?.can_request_manual_cancel)
                  const countdown = Math.max(0, Number(order.cancel_policy?.countdown_seconds ?? 0) - tick)
                  const canDirectCancel = canCancel && (order.status !== 'confirmed' || countdown > 0)
                  const canRequestManualNow = !canDirectCancel && canRequestManual
                  const rejectMessage = order.cancel_reject_reason_label || extractCancelRejectMessage(order.note)
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-black text-slate-800 text-sm">#{order.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-slate-600">
                          {new Date(order.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-slate-500">
                          {order.items?.length || 0} sản phẩm
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-black text-[#ed2a2a] text-sm">
                          {Number(order.total_price).toLocaleString('vi-VN')}đ
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="space-y-1">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-[12px] font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                          {order.status === 'confirmed' && canCancel && order.cancel_policy?.countdown_seconds != null && (
                            <p className="text-[11px] text-amber-600 font-semibold inline-flex items-center gap-1">
                              <Clock3 className="w-3.5 h-3.5" />
                              Hủy trong {formatDuration(Math.max(0, Number(order.cancel_policy.countdown_seconds)))}
                            </p>
                          )}
                          <div className="flex flex-col gap-1.5 items-center">
                            <PaymentStatusChip
                              paymentMethod={order.payment_method}
                              paymentStatus={order.payment_status}
                              paymentClaimedAt={order.payment_claimed_at}
                              compact
                            />
                            {renderPaymentActions(order)}
                          </div>
                          {activeTab === 'active' && (canDirectCancel || canRequestManualNow) && (
                            <button
                              onClick={() => setModalOrder(order)}
                              className="inline-flex px-3 py-1 rounded-lg text-[11px] font-bold border border-red-300 text-red-600 hover:bg-red-50"
                            >
                              {canDirectCancel ? (order.status === 'confirmed' ? `Hủy đơn - ${formatDuration(countdown)}` : 'Hủy đơn') : 'Yêu cầu hủy đơn'}
                            </button>
                          )}
                          {activeTab === 'active' && !canDirectCancel && !canRequestManualNow && (
                            <button
                              disabled
                              title="Đã quá thời gian hủy đơn theo quy định của nhà hàng"
                              className="inline-flex px-3 py-1 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed"
                            >
                              Hủy đơn hàng
                            </button>
                          )}
                          {rejectMessage && (
                            <p className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200">
                              {rejectMessage}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {visibleOrders.map(order => {
              const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending
              const canCancel = Boolean(order.cancel_policy?.can_cancel)
              const canRequestManual = Boolean(order.cancel_policy?.can_request_manual_cancel)
              const countdown = Math.max(0, Number(order.cancel_policy?.countdown_seconds ?? 0) - tick)
              const canDirectCancel = canCancel && (order.status !== 'confirmed' || countdown > 0)
              const canRequestManualNow = !canDirectCancel && canRequestManual
              const rejectMessage = order.cancel_reject_reason_label || extractCancelRejectMessage(order.note)
              return (
                <div key={order.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800">#{order.id}</span>
                    <span className={`px-3 py-1 rounded-lg text-[11px] font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">
                      {new Date(order.created_at).toLocaleDateString('vi-VN')} • {order.items?.length || 0} SP
                    </span>
                    <span className="font-black text-[#ed2a2a]">{Number(order.total_price).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {activeTab === 'active' && (canDirectCancel || canRequestManualNow) && (
                    <button
                      onClick={() => setModalOrder(order)}
                      className="w-full px-3 py-2 rounded-lg text-[11px] font-bold border border-red-300 text-red-600 hover:bg-red-50"
                    >
                      {canDirectCancel ? (order.status === 'confirmed' ? `Hủy đơn - ${formatDuration(countdown)}` : 'Hủy đơn') : 'Yêu cầu hủy đơn'}
                    </button>
                  )}
                  {activeTab === 'active' && !canDirectCancel && !canRequestManualNow && (
                    <button
                      disabled
                      title="Đã quá thời gian hủy đơn theo quy định của nhà hàng"
                      className="w-full px-3 py-2 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed"
                    >
                      Hủy đơn hàng
                    </button>
                  )}
                  {rejectMessage && (
                    <p className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200">
                      {rejectMessage}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-600">
                Trang {page} / {lastPage}
              </span>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {modalOrder && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-5">
            <h3 className="text-base font-black text-slate-900">Xác nhận hủy đơn #{modalOrder.id}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {modalOrder.cancel_policy?.can_cancel
                ? 'Bạn có thể hủy ngay theo chính sách hiện tại.'
                : 'Đơn đã qua thời gian hủy tự động. Bạn có thể gửi yêu cầu để admin duyệt.'}
            </p>
            <div className="mt-4 space-y-2">
              {CANCEL_REASONS.map((reason) => (
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
            {cancelReason === 'Quên áp mã giảm giá' && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Gợi ý: Hủy và đặt lại ngay để áp mã giảm giá tốt hơn.
              </div>
            )}
            {['vnpay', 'momo', 'bank'].includes(String(modalOrder.payment_method || '')) && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Nếu đã thanh toán online, tiền sẽ được hoàn về tài khoản trong 3-5 ngày làm việc.
              </div>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
              >
                Giữ lại đơn
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleCancel(modalOrder, !Boolean(modalOrder.cancel_policy?.can_cancel))}
                className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-semibold disabled:opacity-50"
              >
                {modalOrder.cancel_policy?.can_cancel ? 'Xác nhận hủy' : 'Gửi yêu cầu hủy'}
              </button>
            </div>
            {!modalOrder.cancel_policy?.can_cancel && (
              <p className="mt-3 text-xs text-slate-500 inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Yêu cầu của bạn sẽ được admin duyệt thủ công.
              </p>
            )}
            {modalOrder.status === 'cancelled' && (
              <div className="mt-3 text-xs text-slate-500">
                Đơn đã hủy thành công. Bạn có thể{' '}
                <Link href="/" className="text-[#ed2a2a] font-semibold">đặt lại món khác</Link>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
