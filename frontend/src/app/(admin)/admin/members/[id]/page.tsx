'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Pencil, ChevronDown, ChevronUp, Package, ShoppingBag, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { userService } from '@/services/user.service'
import type { User, UserTier, Order } from '@/types'
import { TIER_LABELS, TIER_DISCOUNTS, TIER_STYLES } from '@/types'

const fmt = (n: number | undefined | null) => (Number(n) || 0).toLocaleString('vi-VN') + 'đ'

/** API OrderResource: created_at dạng dd/mm/yyyy hoặc ISO */
function fmtDate(s: string | undefined | null) {
  if (!s) return '—'
  const iso = /^\d{4}-\d{2}-\d{2}/
  if (iso.test(s)) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2]) - 1
    const year = Number(m[3])
    const d = new Date(year, month, day)
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function itemLineTotal(item: { subtotal?: number; price?: number; quantity?: number }) {
  const st = item.subtotal
  if (st != null && Number(st) > 0) return Number(st)
  return (Number(item.price) || 0) * (Number(item.quantity) || 0)
}

function orderSubtotal(o: { subtotal?: number; total?: number; items?: any[] }) {
  const s = o.subtotal ?? o.total
  if (s != null && Number(s) > 0) return Number(s)
  const items = o.items ?? []
  return items.reduce((acc, it) => acc + itemLineTotal(it), 0)
}

function orderGrandTotal(o: {
  total_price?: number
  final_total?: number
  subtotal?: number
  total?: number
  promotion_discount?: number
  tier_discount?: number
  voucher_discount?: number
  discount_amount?: number
  shipping_fee?: number
  items?: any[]
}) {
  const t = o.total_price ?? o.final_total
  if (t != null && Number(t) > 0) return Number(t)
  const sub = orderSubtotal(o)
  const disc =
    (Number(o.promotion_discount) || 0) +
    (Number(o.tier_discount) || 0) +
    (Number(o.voucher_discount) || Number(o.discount_amount) || 0)
  const ship = Number(o.shipping_fee) || 0
  return Math.max(0, sub - disc) + ship
}

const TIER_ICONS: Record<string, string> = { regular: '👤', silver: '🥈', gold: '🥇', vip: '👑' }
const TIER_THRESHOLDS = [
  { tier: 'silver', min: 1_000_000, label: 'Bạc' },
  { tier: 'gold',   min: 3_000_000, label: 'Vàng' },
  { tier: 'vip',    min: 5_000_000, label: 'Kim Cương' },
]

const safeTier = (t: UserTier | undefined | null): UserTier =>
  (t && ['regular', 'silver', 'gold', 'vip'].includes(t)) ? t : 'regular'

const displayMemberEmail = (u: User) => u.deleted_original_email || u.email

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  confirmed:   'bg-blue-100 text-blue-700',
  preparing:   'bg-purple-100 text-purple-700',
  ready:       'bg-teal-100 text-teal-700',
  delivering:  'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  ready: 'Sẵn sàng',
  delivering: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const getLoginProviderMeta = (user: User) => {
  if (user.login_provider === 'google' || user.has_google) {
    return { label: 'Đăng nhập Google', className: 'bg-blue-100 text-blue-700' }
  }
  if (user.login_provider === 'password' || user.has_password) {
    return { label: 'Đăng nhập thường', className: 'bg-slate-100 text-slate-700' }
  }
  return { label: 'Nguồn đăng nhập không rõ', className: 'bg-amber-100 text-amber-700' }
}

export default function MemberDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [user, setUser]           = useState<User | null>(null)
  const [orders, setOrders]       = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [orderPage, setOrderPage] = useState(1)
  const [orderLastPage, setOrderLastPage] = useState(1)
  const [orderTotal, setOrderTotal] = useState(0)
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  const fetchUser = async () => {
    try {
      const u = await userService.getById(Number(id))
      setUser(u)
    } catch { toast.error('Không tải được thông tin thành viên.') }
  }

  const fetchOrders = async (page = 1) => {
    setLoading(true)
    try {
      const res = await userService.getOrders(Number(id), page)
      const payload = res as any
      const meta = payload?.meta ?? payload
      setOrders(Array.isArray(payload?.data) ? payload.data : [])
      setOrderPage(meta?.current_page ?? payload?.current_page ?? 1)
      setOrderLastPage(meta?.last_page ?? payload?.last_page ?? 1)
      setOrderTotal(meta?.total ?? payload?.total ?? 0)
    } catch { toast.error('Không tải được đơn hàng.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    Promise.all([fetchUser(), fetchOrders(1)]).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleRecalc = async () => {
    if (!user) return
    try {
      const updated = await userService.recalculateTier(user.id)
      setUser(updated)
      toast.success(`Hạng mới: ${TIER_LABELS[safeTier(updated.tier)]}`)
    } catch { toast.error('Cập nhật thất bại.') }
  }

  const handleRestore = async () => {
    if (!user) return
    try {
      const u = await userService.restore(user.id)
      setUser(u)
      toast.success('Đã khôi phục tài khoản.')
    } catch {
      toast.error('Không khôi phục được — có thể email đã được đăng ký lại.')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
    </div>
  )
  if (!user) return <div className="text-center py-32 text-slate-500">Không tìm thấy thành viên.</div>

  const nextTier = TIER_THRESHOLDS.find(t => (user.total_spent ?? 0) < t.min)
  const progress = nextTier
    ? Math.min(100, ((user.total_spent ?? 0) / nextTier.min) * 100)
    : 100

  const tier = safeTier(user.tier)
  const providerMeta = getLoginProviderMeta(user)
  const isClosed = Boolean(user.deleted_at)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Back ── */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {isClosed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">Tài khoản đã đóng (xóa mềm)</p>
          <p className="mt-1 text-amber-800/90">
            Email hiển thị bên dưới là email gốc (lưu để đối soát). Khách có thể đăng ký lại bằng email đó trừ khi bạn khôi phục tài khoản này trước.
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════
          PROFILE CARD
      ════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 flex gap-5 items-start">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-2xl shrink-0 uppercase">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name?.charAt(0) ?? '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-black text-slate-800 truncate">{user.name}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{displayMemberEmail(user)}</p>
                {user.phone && <p className="text-sm text-slate-400 font-mono mt-0.5">{user.phone}</p>}
                <span className={`inline-flex items-center mt-2 text-[11px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wide ${providerMeta.className}`}>
                  {providerMeta.label}
                </span>
              </div>
              <span className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold shrink-0 ${TIER_STYLES[tier]}`}>
                {TIER_ICONS[tier]} {TIER_LABELS[tier]}
                {TIER_DISCOUNTS[tier] > 0 && <span className="opacity-70 font-normal">(-{TIER_DISCOUNTS[tier]}%)</span>}
              </span>
            </div>

            {/* Tier progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Tiến độ lên hạng</span>
                {nextTier ? (
                  <span>{fmt(user.total_spent)} / {fmt(nextTier.min)} → {nextTier.label}</span>
                ) : (
                  <span className="text-amber-500 font-bold">Đạt hạng cao nhất!</span>
                )}
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x border-t">
          <div className="p-4 text-center">
            <p className="text-2xl font-black text-slate-800">{user.total_orders ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Đơn hàng</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-black text-[#ed2a2a]">{fmt(user.total_spent)}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Tổng chi tiêu</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-black text-green-600">{TIER_DISCOUNTS[tier]}%</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Giảm giá</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 px-6 py-4 bg-slate-50 border-t">
          {isClosed ? (
            <button
              type="button"
              onClick={handleRestore}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" /> Khôi phục tài khoản
            </button>
          ) : (
            <>
              <button onClick={() => router.push(`/admin/members/${user.id}/edit`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                <Pencil className="w-4 h-4" /> Sửa thông tin
              </button>
              <button onClick={handleRecalc}
                className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors">
                <RefreshCw className="w-4 h-4" /> Tính lại hạng
              </button>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ORDER HISTORY
      ════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-[#ed2a2a]" />
            <h2 className="font-bold text-slate-800">Lịch sử đơn hàng</h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{orderTotal} đơn</span>
          </div>
          <button onClick={() => fetchOrders(orderPage)} className="text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50">
            {[1,2,3].map(i => (
              <div key={i} className="px-6 py-4 animate-pulse space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-50 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-semibold">Chưa có đơn hàng nào</p>
            <p className="text-slate-400 text-sm mt-1">Thành viên này chưa đặt món lần nào.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {orders.map((order) => {
                const isOpen = expandedOrder === order.id
                const items = order.items ?? []
                return (
                  <div key={order.id} className="hover:bg-red-50/20 transition-colors">
                    {/* Order row */}
                    <button
                      className="w-full px-6 py-4 flex items-center justify-between text-left gap-4"
                      onClick={() => setExpandedOrder(isOpen ? null : order.id)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-black text-slate-600">#{order.id}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-800">{fmtDate(order.created_at)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {STATUS_LABELS[order.status] ?? order.status ?? '—'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{items.length} món</span>
                            {order.table_number && <span>· Bàn {order.table_number}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden sm:block">
                          {order.promotion_discount > 0 && (
                            <p className="text-xs text-green-600">-{fmt(order.promotion_discount)}</p>
                          )}
                          {order.tier_discount > 0 && (
                            <p className="text-xs text-green-600">Hạng: -{fmt(order.tier_discount)}</p>
                          )}
                          <p className="text-base font-black text-[#ed2a2a]">{fmt(orderGrandTotal(order))}</p>
                        </div>
                        <div className="text-right sm:hidden">
                          <p className="text-base font-black text-[#ed2a2a]">{fmt(orderGrandTotal(order))}</p>
                        </div>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-slate-400" />
                          : <ChevronDown className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                    </button>

                    {/* Order detail — expandable */}
                    {isOpen && (
                      <div className="px-6 pb-5">
                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                          {/* Item list */}
                          {items.length > 0 ? items.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3">
                              {item.product?.image ? (
                                <img
                                  src={item.product.image.startsWith('http') ? item.product.image : `http://127.0.0.1:8000/storage/${item.product.image}`}
                                  alt={item.product?.name}
                                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                  <Package className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {item.product?.name ?? 'Món ăn'}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {item.quantity} × {fmt(item.price)}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-slate-700 shrink-0">
                                {fmt(itemLineTotal(item))}
                              </p>
                            </div>
                          )) : (
                            <p className="text-sm text-slate-400 text-center">Không có thông tin món.</p>
                          )}

                          {/* Price breakdown */}
                          <div className="border-t border-slate-200 pt-3 mt-3 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Tạm tính</span>
                              <span className="font-semibold text-slate-700">{fmt(orderSubtotal(order))}</span>
                            </div>
                            {order.promotion_discount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-green-600">Khuyến mãi</span>
                                <span className="font-semibold text-green-600">-{fmt(order.promotion_discount)}</span>
                              </div>
                            )}
                            {order.tier_discount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-green-600">Giảm hạng thành viên</span>
                                <span className="font-semibold text-green-600">-{fmt(order.tier_discount)}</span>
                              </div>
                            )}
                            {order.voucher_discount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-green-600">Voucher{order.voucher_code ? ` (${order.voucher_code})` : ''}</span>
                                <span className="font-semibold text-green-600">-{fmt(order.voucher_discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                              <span className="font-bold text-slate-800">Thành tiền</span>
                              <span className="font-black text-[#ed2a2a]">{fmt(orderGrandTotal(order))}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => router.push(`/admin/orders/${order.id}`)}
                              className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                            >
                              Xem chi tiết đơn
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`#${order.id}`)
                                toast.success('Đã copy mã đơn!')
                              }}
                              className="py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                            >
                              Copy mã
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {orderLastPage > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between bg-slate-50/50">
                <p className="text-xs text-slate-400 font-semibold">
                  Trang {orderPage} / {orderLastPage} · {orderTotal} đơn
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setOrderPage(p => Math.max(1, p - 1)); fetchOrders(orderPage - 1) }}
                    disabled={orderPage <= 1 || loading}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    ← Trước
                  </button>
                  <button
                    onClick={() => { setOrderPage(p => Math.min(orderLastPage, p + 1)); fetchOrders(orderPage + 1) }}
                    disabled={orderPage >= orderLastPage || loading}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
