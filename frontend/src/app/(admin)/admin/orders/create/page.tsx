'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Plus, Minus, Trash2, X, UserCheck, UserX, Save, Ticket, UtensilsCrossed, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { orderService } from '@/services/order.service'
import { userService } from '@/services/user.service'
import api from '@/services/api'
import type { Product, User, UserTier, Category } from '@/types'
import { TIER_LABELS, TIER_DISCOUNTS, TIER_STYLES } from '@/types'

const TIER_MIN_ORDER = 1_000_000
const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const TIER_ICONS: Record<UserTier, string> = { regular: '👤', silver: '🥈', gold: '🥇', vip: '👑' }

interface CartItem {
  key: string          // product_id + options hash
  product_id: number
  name: string
  image?: string
  price: number
  quantity: number
  options: { name: string; value: string; price_extra: number }[]
}

type VoucherItem = {
  code: string; name: string; discount_label: string
  discount_type: 'percent' | 'amount'; discount_value: number
  max_discount?: number; min_order_amount?: number
}

type OrderMode = 'dine_in' | 'takeaway'

interface TableOption {
  id: number
  name: string
  area?: string | null
  status?: string
  capacity?: number
}

// ── Option Modal ──────────────────────────────────────────────────────────
function OptionModal({ product, onAdd, onClose }: {
  product: Product
  onAdd: (item: CartItem) => void
  onClose: () => void
}) {
  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<Record<number, number>>({})  // optionId → valueIndex

  const totalExtra = Object.entries(selected).reduce((sum, [optId, valIdx]) => {
    const opt = product.options?.find(o => o.id === parseInt(optId))
    return sum + (opt?.values[valIdx]?.price_extra ?? 0)
  }, 0)

  const handleAdd = () => {
    const options = Object.entries(selected).map(([optId, valIdx]) => {
      const opt = product.options!.find(o => o.id === parseInt(optId))!
      const val = opt.values[valIdx]
      return { name: opt.name, value: val.label, price_extra: val.price_extra }
    })
    const key = `${product.id}-${JSON.stringify(options)}`
    onAdd({ key, product_id: product.id, name: product.name, image: product.image, price: product.price + totalExtra, quantity: qty, options })
    onClose()
  }

  const hasOptions = product.options && product.options.length > 0
  const allRequired = product.options?.filter(o => o.is_required).every(o => selected[o.id] !== undefined) ?? true

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="relative">
            {product.image
              ? <img src={product.image} alt={product.name} className="w-full h-40 object-cover" />
              : <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-5xl">🍽️</div>
            }
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">{product.name}</h3>
              <p className="text-[#ed2a2a] font-bold">{fmt(product.price + totalExtra)}</p>
            </div>

            {/* Options */}
            {hasOptions && product.options!.map(opt => (
              <div key={opt.id}>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  {opt.name} {opt.is_required && <span className="text-red-500">*</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {opt.values.map((val, idx) => (
                    <button key={idx} type="button"
                      onClick={() => setSelected(s => ({ ...s, [opt.id]: idx }))}
                      className={`px-3 py-1.5 rounded-xl text-sm border-2 transition-all ${
                        selected[opt.id] === idx
                          ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a] font-semibold'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      {val.label}{val.price_extra > 0 && ` +${fmt(val.price_extra)}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Qty */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-semibold text-slate-700">Số lượng</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-lg">{qty}</span>
                <button type="button" onClick={() => setQty(q => q + 1)}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button type="button" onClick={handleAdd} disabled={!allRequired}
              className="w-full py-3 bg-[#ed2a2a] text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
              Thêm vào đơn · {fmt((product.price + totalExtra) * qty)}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function CreateOrderPage() {
  const router    = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)

  // Khách
  const [customerType,  setCustomerType]  = useState<'member' | 'guest'>('member')
  const [memberQuery,   setMemberQuery]   = useState('')
  const [memberResults, setMemberResults] = useState<User[]>([])
  const [searching,     setSearching]     = useState(false)
  const [selectedUser,  setSelectedUser]  = useState<User | null>(null)
  const [showUserDrop,  setShowUserDrop]  = useState(false)
  const [guestForm,     setGuestForm]     = useState({ name: '', phone: '' })

  const [orderMode, setOrderMode] = useState<OrderMode>('takeaway')
  const [tables, setTables] = useState<TableOption[]>([])
  const [selectedTableId, setSelectedTableId] = useState('')
  const [note,        setNote]        = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [vouchers,    setVouchers]    = useState<VoucherItem[]>([])

  // Menu
  const [products,    setProducts]    = useState<Product[]>([])
  const [categories,  setCategories]  = useState<Category[]>([])
  const [activeCat,   setActiveCat]   = useState<number | 'all'>('all')
  const [search,      setSearch]      = useState('')
  const [modalProd,   setModalProd]   = useState<Product | null>(null)

  // Cart
  const [cart,    setCart]    = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<{ data: Product[] }>('/products?per_page=1000&is_active=1').then(r => setProducts(r.data.data)).catch(() => {})
    api.get<{ data: Category[] }>('/categories').then(r => setCategories(r.data.data)).catch(() => {})
    api.get<{ data: VoucherItem[] }>('/vouchers?status=active&per_page=100').then(r => setVouchers(r.data.data)).catch(() => {})
    api.get<{ data: TableOption[] }>('/tables/public-list').then(r => setTables(r.data.data ?? [])).catch(() => setTables([]))
  }, [])

  // Search thành viên
  useEffect(() => {
    if (memberQuery.length < 1) { setMemberResults([]); setShowUserDrop(false); return }
    if (selectedUser) return
    setShowUserDrop(true)
    const t = setTimeout(async () => {
      setSearching(true)
      try { setMemberResults(await userService.search(memberQuery)) }
      catch { setMemberResults([]) }
      finally { setSearching(false) }
    }, 200)
    return () => clearTimeout(t)
  }, [memberQuery, selectedUser])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!searchRef.current?.closest('.user-search-wrap')?.contains(e.target as Node)) setShowUserDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selectUser = (u: User) => { setSelectedUser(u); setMemberQuery(u.name); setShowUserDrop(false) }
  const clearUser  = () => { setSelectedUser(null); setMemberQuery(''); setMemberResults([]); setShowUserDrop(false) }

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

  const tablesByArea = useMemo(() => {
    const m = new Map<string, TableOption[]>()
    for (const t of tables) {
      const a = (t.area && String(t.area).trim()) || 'Khu vực khác'
      if (!m.has(a)) m.set(a, [])
      m.get(a)!.push(t)
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b, 'vi'))
  }, [tables])

  // Cart ops
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const ex = prev.find(i => i.key === item.key)
      if (ex) return prev.map(i => i.key === item.key ? { ...i, quantity: i.quantity + item.quantity } : i)
      return [...prev, item]
    })
  }

  const quickAdd = (p: Product) => {
    if (p.options && p.options.length > 0) { setModalProd(p); return }
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

  // Tính tiền
  const subtotal        = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const tierEligible    = !!(selectedUser && subtotal >= TIER_MIN_ORDER && TIER_DISCOUNTS[selectedUser.tier] > 0)
  const tierDiscount    = tierEligible ? Math.round(subtotal * TIER_DISCOUNTS[selectedUser!.tier] / 100) : 0
  const selectedVoucher = vouchers.find(v => v.code === voucherCode) ?? null
  const voucherDiscount = (() => {
    if (!selectedVoucher) return 0
    const base = subtotal - tierDiscount
    if (selectedVoucher.min_order_amount && base < selectedVoucher.min_order_amount) return 0
    if (selectedVoucher.discount_type === 'percent') {
      const d = Math.round(base * selectedVoucher.discount_value / 100)
      return selectedVoucher.max_discount ? Math.min(d, selectedVoucher.max_discount) : d
    }
    return Math.min(selectedVoucher.discount_value, base)
  })()
  const total = Math.max(0, subtotal - tierDiscount - voucherDiscount)

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Chưa chọn món nào'); return }
    if (customerType === 'member' && !selectedUser) { toast.error('Chưa chọn thành viên'); return }
    if (customerType === 'guest' && !guestForm.name.trim()) { toast.error('Chưa nhập tên khách'); return }
    if (customerType === 'guest' && !guestForm.phone.trim()) { toast.error('Chưa nhập SĐT'); return }
    if (orderMode === 'dine_in' && !selectedTableId) {
      toast.error('Chọn bàn cho đơn tại chỗ')
      return
    }

    setLoading(true)
    try {
      const order = await orderService.create({
        customer_name:  customerType === 'member' ? selectedUser!.name : guestForm.name,
        customer_phone: customerType === 'member' ? (selectedUser!.phone ?? '') : guestForm.phone,
        table_number:   orderMode === 'dine_in' ? selectedTableId : undefined,
        note:           note || undefined,
        voucher_code:   voucherCode || undefined,
        items:          cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        ...(customerType === 'member' && selectedUser ? { user_id: selectedUser.id } : {}),
      })
      toast.success('Đã tạo đơn hàng')
      router.push(`/admin/orders/${order.id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo thất bại')
    } finally { setLoading(false) }
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all placeholder:text-slate-400"

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -m-6">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-4 px-3 lg:px-5 py-2.5 lg:py-3 bg-white border-b border-slate-200 shrink-0">
        <button onClick={() => router.back()} className="p-1.5 lg:p-2 shrink-0 rounded-xl border hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm lg:text-lg font-bold text-slate-800 shrink-0 flex items-center gap-1">
          <span className="hidden sm:inline">Tạo đơn hàng</span>
          <span className="sm:hidden">Tạo đơn</span>
        </h1>

        {/* Hình thức: tại bàn / mang về + chọn bàn */}
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 flex-1 min-w-0">
          {([
            { mode: 'dine_in' as const, icon: UtensilsCrossed, label: 'Tại bàn' },
            { mode: 'takeaway' as const, icon: ShoppingBag, label: 'Mang về' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setOrderMode(mode)
                if (mode === 'takeaway') setSelectedTableId('')
              }}
              className={`flex items-center gap-1 px-2 lg:px-2.5 py-1.5 rounded-xl text-[11px] lg:text-xs font-bold border transition-all shrink-0 ${
                orderMode === mode ? 'bg-[#ed2a2a] text-white border-[#ed2a2a]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
          {orderMode === 'dine_in' && (
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="min-w-0 flex-1 lg:max-w-[280px] border border-slate-200 rounded-xl px-2 lg:px-3 py-1.5 text-xs lg:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">Chọn bàn…</option>
              {tables.length === 0 ? (
                <option value="" disabled>Đang tải danh sách bàn…</option>
              ) : (
                tablesByArea.map(([area, list]) => (
                  <optgroup key={area} label={area}>
                    {list.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                        {typeof t.capacity === 'number' ? ` (${t.capacity} chỗ)` : ''}
                        {t.status === 'occupied' ? ' · đang có khách' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          )}
        </div>

        {/* Loại khách toggle */}
        <div className="flex gap-1 ml-auto shrink-0 overflow-x-auto scrollbar-hide">
          {([
            { type: 'member', icon: UserCheck, label: 'Thành viên' },
            { type: 'guest',  icon: UserX,     label: 'Khách lẻ' },
          ] as const).map(({ type, icon: Icon, label }) => (
            <button key={type} type="button"
              onClick={() => { setCustomerType(type); if (type === 'guest') setSelectedUser(null) }}
              className={`flex items-center whitespace-nowrap gap-1 lg:gap-1.5 px-2 lg:px-3 py-1.5 rounded-xl text-[11px] lg:text-xs font-semibold border transition-all ${
                customerType === type ? 'bg-[#ed2a2a] text-white border-[#ed2a2a]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ════ TRÁI: MENU ════ */}
        <div className="flex flex-col flex-1 lg:w-0 lg:flex-[3] border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 overflow-hidden">

          {/* Search + Category tabs */}
          <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50 focus:bg-white"
                placeholder="🔍 Tìm món..." autoFocus />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
                {filteredProducts.map(p => {
                  const inCart = cart.filter(i => i.product_id === p.id).reduce((s, i) => s + i.quantity, 0)
                  const outOfStock = p.stock === 0
                  return (
                    <button key={p.id} type="button" onClick={() => !outOfStock && quickAdd(p)} disabled={outOfStock}
                      className={`relative flex flex-col rounded-2xl border-2 overflow-hidden text-left transition-all active:scale-95 ${
                        outOfStock ? 'border-slate-100 opacity-40 cursor-not-allowed'
                          : inCart > 0 ? 'border-[#ed2a2a] shadow-md shadow-red-100'
                          : 'border-white bg-white hover:border-slate-200 hover:shadow-sm'
                      } bg-white`}>
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
                          <div className="w-6 h-6 bg-[#ed2a2a] rounded-lg flex items-center justify-center text-white">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
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
        <div className="flex flex-col h-[48vh] lg:h-auto lg:w-0 lg:flex-[2] bg-white overflow-hidden relative shadow-[0_-4px_20px_rgb(0,0,0,0.05)] lg:shadow-none z-10">

          {/* Khách hàng */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0 space-y-2">
            {customerType === 'member' ? (
              <div className="user-search-wrap relative">
                {!selectedUser ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input ref={searchRef} value={memberQuery}
                        onChange={e => { setMemberQuery(e.target.value); setSelectedUser(null) }}
                        onFocus={() => memberQuery.length >= 1 && setShowUserDrop(true)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="Tìm thành viên..." autoComplete="off" />
                      {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#ed2a2a] border-t-transparent rounded-full animate-spin" />}
                    </div>
                    {showUserDrop && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {searching ? (
                          <div className="px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-slate-300 border-t-[#ed2a2a] rounded-full animate-spin" /> Đang tìm...
                          </div>
                        ) : memberResults.length > 0 ? memberResults.map(u => (
                          <button key={u.id} type="button" onClick={() => selectUser(u)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{u.name}</p>
                              <p className="text-xs text-slate-400">{u.phone ?? u.email}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TIER_STYLES[u.tier]}`}>{TIER_ICONS[u.tier]}</span>
                          </button>
                        )) : <div className="px-4 py-3 text-sm text-slate-400">Không tìm thấy</div>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${TIER_STYLES[selectedUser.tier]}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold shrink-0">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{selectedUser.name}</p>
                      <p className="text-xs opacity-70">{TIER_ICONS[selectedUser.tier]} {TIER_LABELS[selectedUser.tier]} · {selectedUser.phone}</p>
                    </div>
                    <button type="button" onClick={clearUser} className="p-1 rounded-lg hover:bg-black/10">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input value={guestForm.name} onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls} placeholder="Tên khách *" />
                <input value={guestForm.phone} onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputCls} placeholder="SĐT *" />
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-300">
                <div className="text-5xl mb-3">🛒</div>
                <p className="text-sm font-medium">Giỏ hàng trống</p>
                <p className="text-xs mt-1">Chọn món từ menu bên trái</p>
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
                    <p className="text-xs text-slate-400 truncate">{item.options.map(o => `${o.value}`).join(' · ')}</p>
                  )}
                  <p className="text-xs font-bold text-[#ed2a2a] mt-0.5">{fmt(item.price)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => changeQty(item.key, -1)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button type="button" onClick={() => changeQty(item.key, 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-green-50 hover:text-green-600 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => removeItem(item.key)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer: ghi chú + voucher + tổng + submit */}
          <div className="border-t border-slate-100 px-3 py-3 lg:px-4 lg:py-4 space-y-2 lg:space-y-3 shrink-0 bg-white">
            <div className="grid grid-cols-2 gap-2">
              <input value={note} onChange={e => setNote(e.target.value)}
                className={inputCls} placeholder="📝 Ghi chú..." />
              <div className="relative">
                <Ticket className="absolute left-3 lg:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select value={voucherCode} onChange={e => setVoucherCode(e.target.value)}
                  className={inputCls + ' pl-8 lg:pl-9'}>
                  <option value="">Voucher...</option>
                  {vouchers.map(v => <option key={v.code} value={v.code}>{v.code} · {v.discount_label}</option>)}
                </select>
              </div>
            </div>

            {/* Tổng tiền */}
            <div className="space-y-1 lg:space-y-1.5 text-xs lg:text-sm pt-1">
              <div className="flex justify-between text-slate-500">
                <span>Tạm tính</span><span className="font-medium text-slate-800">{fmt(subtotal)}</span>
              </div>
              {tierEligible && (
                <div className="flex justify-between text-green-600">
                  <span>🎁 VIP -{TIER_DISCOUNTS[selectedUser!.tier]}%</span>
                  <span className="font-medium">-{fmt(tierDiscount)}</span>
                </div>
              )}
              {selectedUser && TIER_DISCOUNTS[selectedUser.tier] > 0 && !tierEligible && (
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>🎁 VIP (đơn &lt; 1.000.000đ)</span><span>—</span>
                </div>
              )}
              {selectedVoucher && voucherDiscount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>🎟 {selectedVoucher.code}</span>
                  <span className="font-medium">-{fmt(voucherDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 lg:pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-sm lg:text-base">Tổng cộng</span>
                <span className="text-xl lg:text-2xl font-black text-[#ed2a2a]">{fmt(total)}</span>
              </div>
            </div>

            <button type="button" onClick={handleSubmit} disabled={loading || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-3.5 bg-[#ed2a2a] text-white rounded-xl font-bold text-sm lg:text-base hover:bg-red-600 disabled:opacity-50 shadow-lg lg:shadow-red-200 transition-all active:scale-95">
              <Save className="w-4 h-4 lg:w-5 lg:h-5" />
              {loading ? 'Đang tạo...' : `Tạo đơn · ${fmt(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Option Modal */}
      {modalProd && (
        <OptionModal product={modalProd} onAdd={addToCart} onClose={() => setModalProd(null)} />
      )}
    </div>
  )
}
