'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Search, Package2, Trash2, Plus, AlertTriangle, TrendingDown, TrendingUp, ShoppingCart, X } from 'lucide-react'
import { toast } from 'sonner'
import { importService } from '@/services/import.service'
import { productService } from '@/services/product.service'
import type { Product } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

interface LineItem {
  product: Product
  quantity: number
  import_price: number
}

export default function CreateImportPage() {
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [supplier, setSupplier] = useState('')
  const [note, setNote] = useState('')
  const [importedAt, setImportedAt] = useState(new Date().toISOString().slice(0, 16))
  const [items, setItems] = useState<LineItem[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Search debounce
  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); setShowDropdown(false); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await productService.getAll({ search: searchQ, per_page: 10 } as any)
        const filtered = res.data.filter(p => !items.find(i => i.product.id === p.id))
        setSearchRes(filtered)
        setShowDropdown(true)
      } catch {} finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ, items])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [pendingProduct, setPendingProduct] = useState<Product | null>(null)
  const [pendingQty, setPendingQty] = useState(1)
  const [pendingPrice, setPendingPrice] = useState(0)

  const selectProduct = (p: Product) => {
    setPendingProduct(p)
    setPendingQty(1)
    setPendingPrice(p.cost_price ?? Math.round(p.price * 0.6))
    setShowDropdown(false)
  }

  const confirmAdd = () => {
    if (!pendingProduct) return
    if (pendingPrice >= pendingProduct.price) {
      toast.error(`Giá nhập phải nhỏ hơn giá bán (${fmt(pendingProduct.price)})`)
      return
    }
    setItems(prev => [...prev, {
      product: pendingProduct,
      quantity: pendingQty,
      import_price: pendingPrice,
    }])
    setPendingProduct(null)
    setSearchQ('')
    setSearchRes([])
  }

  const addProduct = (p: Product) => {
    setItems(prev => [...prev, {
      product: p,
      quantity: 1,
      import_price: p.cost_price ?? Math.round(p.price * 0.6),
    }])
    setSearchQ('')
    setSearchRes([])
    setShowDropdown(false)
  }

  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const total = items.reduce((s, i) => s + i.quantity * i.import_price, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  const handleSubmit = async () => {
    if (!items.length) { toast.error('Chưa có sản phẩm nào trong phiếu.'); return }
    if (items.some(i => i.quantity < 1)) { toast.error('Số lượng phải ≥ 1.'); return }
    if (items.some(i => i.import_price <= 0)) { toast.error('Giá nhập phải > 0.'); return }
    if (items.some(i => i.import_price >= i.product.price)) {
      const bad = items.find(i => i.import_price >= i.product.price)!
      toast.error(`"${bad.product.name}": Giá nhập (${fmt(bad.import_price)}) phải nhỏ hơn giá bán (${fmt(bad.product.price)})`)
      return
    }
    setSaving(true)
    try {
      const receipt = await importService.create({
        supplier: supplier || undefined,
        note: note || undefined,
        imported_at: importedAt,
        items: items.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
          import_price: i.import_price,
        })),
      })
      toast.success(`Đã tạo phiếu ${receipt.code} thành công!`)
      router.push('/admin/inventory/imports')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Tạo phiếu thất bại.')
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ed2a2a] focus:ring-2 focus:ring-red-50 transition-all'

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800">Tạo phiếu nhập kho</h1>
            <p className="text-xs text-slate-400 mt-0.5">Nhập hàng → cập nhật tồn kho & giá vốn tự động</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-60 shadow-lg shadow-red-500/20 transition-all">
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu phiếu nhập'}
        </button>
      </div>

      {/* Flow context banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-4 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg font-bold text-xs">✅ Bước 1</span>
          <span className="text-slate-400 text-xs">Tạo sản phẩm</span>
        </div>
        <span className="text-slate-600">→</span>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-[#ed2a2a] text-white rounded-lg font-bold text-xs">📦 Bước 2</span>
          <span className="text-white text-xs font-bold">Nhập kho (đang làm)</span>
        </div>
        <span className="text-slate-600">→</span>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1.5 bg-slate-600 text-slate-400 rounded-lg font-bold text-xs">💰 Bước 3</span>
          <span className="text-slate-500 text-xs">Bán hàng</span>
        </div>
        <div className="ml-auto text-xs text-slate-500 hidden lg:block">
          Sản phẩm = cái tên &nbsp;|&nbsp; Kho = số lượng
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Main */}
        <div className="lg:col-span-2 space-y-5">

          {/* Thông tin phiếu */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 text-sm mb-4">Thông tin phiếu nhập</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nhà cung cấp</label>
                <input value={supplier} onChange={e => setSupplier(e.target.value)}
                  placeholder="VD: Công ty TNHH ABC..." className={inp} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Ngày nhập</label>
                <input type="datetime-local" value={importedAt} onChange={e => setImportedAt(e.target.value)} className={inp} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Ghi chú nội bộ</label>
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú về lô hàng này..." className={`${inp} resize-none`} />
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-700 text-sm">Danh sách sản phẩm nhập</h2>
              {items.length > 0 && (
                <span className="text-xs font-bold text-slate-400">{items.length} sản phẩm</span>
              )}
            </div>

            {/* Search */}
            <div ref={searchRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setPendingProduct(null) }}
                onFocus={() => searchRes.length > 0 && setShowDropdown(true)}
                placeholder="🔍 Tìm sản phẩm để thêm vào phiếu..."
                className="w-full pl-9 pr-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#ed2a2a] focus:border-solid transition-all bg-slate-50 focus:bg-white"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-[#ed2a2a] rounded-full animate-spin" />
                </div>
              )}

              {/* Dropdown */}
              {showDropdown && searchRes.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto">
                  {searchRes.map(p => (
                    <button key={p.id} type="button" onClick={() => selectProduct(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-left transition-colors border-b border-slate-50 last:border-0">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0" />
                        : <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Package2 className="w-5 h-5 text-slate-400" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-400">Tồn: <span className={`font-bold ${p.stock <= 10 ? 'text-orange-500' : 'text-slate-600'}`}>{p.stock}</span></span>
                          <span className="text-xs text-slate-400">Giá bán: <span className="font-bold text-slate-600">{fmt(p.price)}</span></span>
                          {p.cost_price && <span className="text-xs text-slate-400">Giá vốn: <span className="font-bold text-blue-600">{fmt(p.cost_price)}</span></span>}
                        </div>
                      </div>
                      <div className="shrink-0 p-1.5 bg-red-50 rounded-lg">
                        <Plus className="w-4 h-4 text-[#ed2a2a]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && !searching && searchQ && searchRes.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 px-4 py-6 text-center">
                  <p className="text-sm text-slate-400">Không tìm thấy sản phẩm nào</p>
                </div>
              )}
            </div>

            {/* Inline input panel — hiện ngay sau khi chọn SP */}
            {pendingProduct && (
              <div className="border-2 border-[#ed2a2a] rounded-xl p-4 bg-red-50/30 space-y-3">
                <div className="flex items-center gap-3">
                  {pendingProduct.image
                    ? <img src={pendingProduct.image} alt={pendingProduct.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                    : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Package2 className="w-6 h-6 text-slate-400" /></div>
                  }
                  <div className="flex-1">
                    <p className="font-black text-slate-800">{pendingProduct.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tồn hiện tại: <span className={`font-bold ${pendingProduct.stock <= 10 ? 'text-orange-500' : 'text-slate-700'}`}>{pendingProduct.stock}</span>
                      &nbsp;•&nbsp; Giá bán: <span className="font-bold text-slate-700">{fmt(pendingProduct.price)}</span>
                    </p>
                  </div>
                  <button onClick={() => { setPendingProduct(null); setSearchQ('') }} className="p-1.5 text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Số lượng nhập *</label>
                    <input
                      type="number" min={1} value={pendingQty}
                      onChange={e => setPendingQty(Math.max(1, Number(e.target.value)))}
                      autoFocus
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-center focus:outline-none focus:border-[#ed2a2a] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Giá nhập (đ) *
                      <span className="ml-1 font-normal text-slate-400">&lt; {fmt(pendingProduct.price)}</span>
                    </label>
                    <input
                      type="number" min={0} value={pendingPrice}
                      onChange={e => setPendingPrice(Number(e.target.value))}
                      className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-bold text-center focus:outline-none bg-white transition-colors ${
                        pendingPrice > 0 && pendingPrice >= pendingProduct.price
                          ? 'border-red-400 bg-red-50'
                          : 'border-slate-200 focus:border-[#ed2a2a]'
                      }`}
                    />
                    {pendingPrice > 0 && pendingPrice >= pendingProduct.price && (
                      <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Phải nhỏ hơn giá bán {fmt(pendingProduct.price)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">{pendingQty} × {fmt(pendingPrice)} =</span>
                  <span className="text-base font-black text-[#ed2a2a]">{fmt(pendingQty * pendingPrice)}</span>
                </div>

                <button
                  onClick={confirmAdd}
                  disabled={pendingQty < 1 || pendingPrice <= 0 || pendingPrice >= pendingProduct.price}
                  className="w-full py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Thêm vào phiếu
                </button>
              </div>
            )}

            {/* Table */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                <ShoppingCart className="w-10 h-10 mb-3" />
                <p className="text-sm font-medium text-slate-400">Chưa có sản phẩm nào trong phiếu</p>
                <p className="text-xs mt-1 text-slate-300">Tìm sản phẩm đã tạo ở ô tìm kiếm phía trên để thêm vào</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <span>Chưa có sản phẩm?</span>
                  <button onClick={() => router.push('/admin/products/create')}
                    className="text-[#ed2a2a] font-bold hover:underline">
                    Tạo sản phẩm trước →
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 rounded-xl">
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider rounded-l-xl">Sản phẩm</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Số lượng</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-36">Giá nhập (đ)</th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Thành tiền</th>
                      <th className="px-3 py-3 w-10 rounded-r-xl" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, idx) => {
                      const subtotal = item.quantity * item.import_price
                      const margin = item.product.price > 0 && item.import_price > 0
                        ? ((item.product.price - item.import_price) / item.product.price * 100)
                        : null

                      return (
                        <tr key={item.product.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              {item.product.image
                                ? <img src={item.product.image} alt={item.product.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0" />
                                : <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Package2 className="w-5 h-5 text-slate-400" /></div>
                              }
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{item.product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-400">Tồn hiện tại: <span className={`font-bold ${item.product.stock <= 10 ? 'text-orange-500' : 'text-slate-500'}`}>{item.product.stock}</span></span>
                                  {item.product.stock <= 5 && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500">
                                      <AlertTriangle className="w-3 h-3" /> Sắp hết
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input type="number" min={1} value={item.quantity}
                              onChange={e => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#ed2a2a] focus:ring-1 focus:ring-red-100" />
                          </td>
                          <td className="px-3 py-3">
                            <input type="number" min={0} value={item.import_price}
                              onChange={e => updateItem(idx, { import_price: Number(e.target.value) })}
                              className={`w-full border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 transition-colors ${
                                item.import_price > 0 && item.import_price >= item.product.price
                                  ? 'border-red-400 bg-red-50 focus:border-red-500'
                                  : 'border-slate-200 focus:border-[#ed2a2a] focus:ring-red-100'
                              }`} />
                            {item.import_price > 0 && item.import_price >= item.product.price ? (
                              <div className="flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold text-red-500">
                                <AlertTriangle className="w-3 h-3" /> Cao hơn giá bán!
                              </div>
                            ) : margin !== null && (
                              <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${margin >= 20 ? 'text-emerald-500' : margin >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                {margin >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                LN: {margin.toFixed(0)}%
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="font-black text-slate-800">{fmt(subtotal)}</span>
                          </td>
                          <td className="px-3 py-3">
                            <button onClick={() => removeItem(idx)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200">
                      <td colSpan={2} className="px-3 py-4 text-xs text-slate-400 font-medium">
                        {totalQty} sản phẩm • {items.length} dòng
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-bold text-slate-600">Tổng cộng:</td>
                      <td className="px-3 py-4 text-right">
                        <span className="text-xl font-black text-[#ed2a2a]">{fmt(total)}</span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-5">
          {/* Summary card */}
          <div className="bg-slate-800 rounded-2xl p-5 text-white sticky top-5">
            <h3 className="font-bold text-sm text-slate-300 mb-4">Tóm tắt phiếu nhập</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Nhà cung cấp</span>
                <span className="font-semibold truncate max-w-[130px]">{supplier || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Số dòng SP</span>
                <span className="font-bold">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Tổng số lượng</span>
                <span className="font-bold">{totalQty}</span>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">Tổng tiền nhập</span>
                  <span className="text-xl font-black text-emerald-400">{fmt(total)}</span>
                </div>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={saving || items.length === 0}
              className="w-full mt-5 py-3 bg-[#ed2a2a] rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
              {saving ? 'Đang lưu...' : 'Lưu phiếu nhập'}
            </button>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black text-blue-800 uppercase tracking-wider">Sau khi lưu phiếu</p>
            <ul className="space-y-1.5">
              {[
                '📦 Tồn kho được cộng thêm',
                '💰 Giá vốn được tính lại (bình quân gia quyền)',
                '📊 Lợi nhuận được cập nhật tự động',
              ].map((t, i) => (
                <li key={i} className="text-xs text-blue-700 font-medium">{t}</li>
              ))}
            </ul>
          </div>

          {/* Quick link */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-600 mb-1">Chưa có sản phẩm?</p>
            <p className="text-[11px] text-slate-400 mb-3">
              Phải tạo sản phẩm trước, sau đó mới nhập kho được.
              <br />
              <span className="font-bold text-slate-500">SP = cái tên &nbsp;|&nbsp; Kho = số lượng</span>
            </p>
            <button onClick={() => router.push('/admin/products/create')}
              className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-[#ed2a2a] hover:text-[#ed2a2a] transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Tạo sản phẩm mới
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
