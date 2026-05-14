'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search, Plus, Minus, Trash2, X, Save, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { orderService } from '@/services/order.service'
import api from '@/services/api'
import type { Order, OrderStatus, Product, Category } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: string; cls: string }> = {
  pending:   { label: 'Chờ xác nhận',  icon: '🕐', cls: 'border-amber-400 bg-amber-50 text-amber-700' },
  confirmed: { label: 'Đã xác nhận',   icon: '✅', cls: 'border-sky-400 bg-sky-50 text-sky-700' },
  preparing: { label: 'Đang chế biến', icon: '👨‍🍳', cls: 'border-orange-400 bg-orange-50 text-orange-700' },
  ready:     { label: 'Sẵn sàng',     icon: '🍳', cls: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  serving:   { label: 'Đang phục vụ',  icon: '🍽️', cls: 'border-violet-400 bg-violet-50 text-violet-700' },
  completed: { label: 'Hoàn thành',    icon: '🎉', cls: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Đã hủy',        icon: '✕',  cls: 'border-red-400 bg-red-50 text-red-700' },
}
const ALL_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'serving', 'completed', 'cancelled']

interface CartItem {
  key: string; product_id: number; name: string; image?: string
  price: number; quantity: number
  options: { name: string; value: string; price_extra: number }[]
}

type VoucherItem = {
  code: string; name: string; discount_label: string
  discount_type: 'percent' | 'amount'; discount_value: number
  max_discount?: number; min_order_amount?: number
}

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [order,      setOrder]      = useState<Order | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [saving,     setSaving]     = useState(false)

  // Form fields
  const [customerName,  setCustomerName]  = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [tableNumber,   setTableNumber]   = useState('')
  const [note,          setNote]          = useState('')
  const [status,        setStatus]        = useState<OrderStatus>('pending')
  const [voucherCode,   setVoucherCode]   = useState('')

  // Menu
  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vouchers,   setVouchers]   = useState<VoucherItem[]>([])
  const [activeCat,  setActiveCat]  = useState<number | 'all'>('all')
  const [search,     setSearch]     = useState('')

  // Cart (khởi tạo từ order.items)
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    Promise.all([
      orderService.getById(Number(id)),
      api.get<{ data: Product[] }>('/products?per_page=1000&is_active=1'),
      api.get<{ data: Category[] }>('/categories'),
      api.get<{ data: VoucherItem[] }>('/vouchers?status=active&per_page=100'),
    ]).then(([o, prodRes, catRes, voucherRes]) => {
      setOrder(o)
      setCustomerName(o.customer_name)
      setCustomerPhone(o.customer_phone)
      setTableNumber(o.table_number ?? '')
      setNote(o.note ?? '')
      setStatus(o.status)
      setVoucherCode(o.voucher_code ?? '')
      setProducts(prodRes.data.data)
      setCategories(catRes.data.data)
      setVouchers(voucherRes.data.data)

      // Khởi tạo cart từ items hiện tại
      const initialCart: CartItem[] = (o.items ?? []).map(item => ({
        key:        `${item.product?.id ?? item.id}-`,
        product_id: item.product?.id ?? 0,
        name:       item.product?.name ?? '—',
        image:      item.product?.image,
        price:      item.price,
        quantity:   item.quantity,
        options:    [],
      }))
      setCart(initialCart)
    }).catch(() => toast.error('Không tải được dữ liệu.'))
      .finally(() => setPageLoading(false))
  }, [id])

  // Filter menu
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.is_active)
    if (activeCat !== 'all') list = list.filter(p => p.category?.id === activeCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    return list
  }, [products, activeCat, search])

  // Cart ops
  const quickAdd = (p: Product) => {
    const key = `${p.id}-`
    setCart(prev => {
      const ex = prev.find(i => i.key === key)
      if (ex) return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { key, product_id: p.id, name: p.name, image: p.image, price: p.price, quantity: 1, options: [] }]
    })
  }
  const changeQty = (key: string, d: number) =>
    setCart(prev => prev.map(i => i.key === key ? { ...i, quantity: i.quantity + d } : i).filter(i => i.quantity > 0))
  const removeItem = (key: string) => setCart(prev => prev.filter(i => i.key !== key))

  // Tổng
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const selectedVoucher = vouchers.find(v => v.code === voucherCode) ?? null
  const voucherDiscount = (() => {
    if (!selectedVoucher) return 0
    if (selectedVoucher.min_order_amount && subtotal < selectedVoucher.min_order_amount) return 0
    if (selectedVoucher.discount_type === 'percent') {
      const d = Math.round(subtotal * selectedVoucher.discount_value / 100)
      return selectedVoucher.max_discount ? Math.min(d, selectedVoucher.max_discount) : d
    }
    return Math.min(selectedVoucher.discount_value, subtotal)
  })()
  const total = Math.max(0, subtotal - voucherDiscount)

  const handleSave = async () => {
    if (!customerName.trim()) { toast.error('Chưa nhập tên khách'); return }
    if (!customerPhone.trim()) { toast.error('Chưa nhập SĐT'); return }
    if (cart.length === 0) { toast.error('Đơn phải có ít nhất 1 món'); return }

    setSaving(true)
    try {
      await orderService.update(Number(id), {
        customer_name:  customerName,
        customer_phone: customerPhone,
        table_number:   tableNumber || null,
        note:           note || null,
      })
      if (order && status !== order.status) {
        await orderService.updateStatus(Number(id), status)
      }
      toast.success('Đã cập nhật đơn hàng')
      router.push('/admin/orders')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật thất bại')
    } finally { setSaving(false) }
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all placeholder:text-slate-400"

  if (pageLoading) return (
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

  const isLocked = order.status === 'completed' || order.status === 'cancelled'

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -m-6">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <button onClick={() => router.back()} className="p-2 rounded-xl border hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Sửa đơn #{order.id}</h1>
          <p className="text-xs text-slate-400">{order.customer_name} · {order.created_at}</p>
          {(order.customer_profile_removed || order.is_guest_order || order.same_email_active_customer_exists) && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {order.customer_profile_removed && (
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Khách đã xóa hồ sơ
                </span>
              )}
              {order.is_guest_order && (
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Khách vãng lai
                </span>
              )}
              {order.same_email_active_customer_exists && (
                <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800">
                  Gmail đã đăng ký lại
                </span>
              )}
            </div>
          )}
        </div>

        {/* Số bàn */}
        <input value={tableNumber} onChange={e => setTableNumber(e.target.value)}
          disabled={isLocked}
          className="w-28 border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
          placeholder="Số bàn..." />

        {/* Status pills */}
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {ALL_STATUSES.map(s => (
            <button key={s} type="button"
              onClick={() => !isLocked && setStatus(s)}
              disabled={isLocked}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border-2 transition-all ${
                status === s ? STATUS_CONFIG[s].cls : 'border-slate-200 text-slate-400 hover:bg-slate-50'
              } disabled:cursor-not-allowed`}>
              {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {isLocked && (
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl font-medium shrink-0">
            ⚠️ Đơn đã kết thúc
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════ TRÁI: MENU ════ */}
        <div className="flex flex-col w-0 flex-[3] border-r border-slate-200 bg-slate-50 overflow-hidden">

          {/* Search + Category */}
          <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50 focus:bg-white"
                placeholder="🔍 Tìm món..." />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setActiveCat('all')}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeCat === 'all' ? 'bg-[#ed2a2a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Tất cả
              </button>
              {categories.filter(c => c.is_active).map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeCat === c.id ? 'bg-[#ed2a2a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-sm">Không tìm thấy món nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map(p => {
                  const inCart = cart.filter(i => i.product_id === p.id).reduce((s, i) => s + i.quantity, 0)
                  const outOfStock = p.stock === 0
                  return (
                    <button key={p.id} type="button"
                      onClick={() => !outOfStock && !isLocked && quickAdd(p)}
                      disabled={outOfStock || isLocked}
                      className={`relative flex flex-col rounded-2xl border-2 overflow-hidden text-left transition-all active:scale-95 bg-white ${
                        outOfStock || isLocked ? 'border-slate-100 opacity-40 cursor-not-allowed'
                          : inCart > 0 ? 'border-[#ed2a2a] shadow-md shadow-red-100'
                          : 'border-white hover:border-slate-200 hover:shadow-sm'
                      }`}>
                      <div className="relative w-full aspect-[4/3] bg-slate-100">
                        {p.image
                          ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                        }
                        {outOfStock && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-lg">Hết hàng</span>
                          </div>
                        )}
                        {inCart > 0 && (
                          <div className="absolute top-2 right-2 min-w-[22px] h-[22px] bg-[#ed2a2a] rounded-full flex items-center justify-center text-white text-xs font-bold px-1 shadow-lg">
                            {inCart}
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2 mb-1">{p.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#ed2a2a]">{fmt(p.price)}</p>
                          {!isLocked && (
                            <div className="w-6 h-6 bg-[#ed2a2a] rounded-lg flex items-center justify-center text-white">
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════ PHẢI: GIỎ HÀNG ════ */}
        <div className="flex flex-col w-0 flex-[2] bg-white overflow-hidden">

          {/* Thông tin khách */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                disabled={isLocked} className={inputCls} placeholder="Tên khách *" />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                disabled={isLocked} className={inputCls} placeholder="SĐT *" />
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-300">
                <div className="text-5xl mb-3">🛒</div>
                <p className="text-sm font-medium">Giỏ hàng trống</p>
              </div>
            ) : cart.map(item => (
              <div key={item.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                {item.image
                  ? <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  : <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-xl shrink-0">🍽️</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  {item.options.length > 0 && (
                    <p className="text-xs text-slate-400">{item.options.map(o => o.value).join(' · ')}</p>
                  )}
                  <p className="text-xs font-bold text-[#ed2a2a] mt-0.5">{fmt(item.price)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => changeQty(item.key, -1)} disabled={isLocked}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button type="button" onClick={() => changeQty(item.key, 1)} disabled={isLocked}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-40">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => removeItem(item.key)} disabled={isLocked}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors ml-1 disabled:opacity-40">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-4 space-y-3 shrink-0 bg-white">
            <div className="grid grid-cols-2 gap-2">
              <input value={note} onChange={e => setNote(e.target.value)} disabled={isLocked}
                className={inputCls} placeholder="📝 Ghi chú..." />
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select value={voucherCode} onChange={e => setVoucherCode(e.target.value)} disabled={isLocked}
                  className={inputCls + ' pl-9'}>
                  <option value="">Voucher...</option>
                  {vouchers.map(v => <option key={v.code} value={v.code}>{v.code} · {v.discount_label}</option>)}
                </select>
              </div>
            </div>

            {/* Tổng tiền */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Tạm tính</span>
                <span className="font-medium text-slate-800">{fmt(subtotal)}</span>
              </div>
              {selectedVoucher && voucherDiscount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>🎟 {selectedVoucher.code}</span>
                  <span className="font-medium">-{fmt(voucherDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800">Tổng cộng</span>
                <span className="text-2xl font-black text-[#ed2a2a]">{fmt(total)}</span>
              </div>
            </div>

            {isLocked ? (
              <button type="button" onClick={() => router.push('/admin/orders')}
                className="w-full py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                ← Quay lại danh sách
              </button>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#ed2a2a] text-white rounded-xl font-bold text-base hover:bg-red-600 disabled:opacity-50 shadow-lg shadow-red-200 transition-all active:scale-95">
                <Save className="w-5 h-5" />
                {saving ? 'Đang lưu...' : `Lưu đơn · ${fmt(total)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
