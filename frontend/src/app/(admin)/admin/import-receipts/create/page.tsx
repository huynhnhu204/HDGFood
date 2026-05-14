'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search, Save, Package2 } from 'lucide-react'
import { toast } from 'sonner'
import { importReceiptService } from '@/services/importReceipt.service'
import { productService } from '@/services/product.service'
import type { Product } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

interface LineItem {
  product: Product
  quantity: number
  import_price: number
}

export default function CreateImportReceiptPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [supplier, setSupplier] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

  // Tìm sản phẩm
  useEffect(() => {
    if (!searchQ.trim()) {
      setSearchRes([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await productService.getAll({ search: searchQ })
        setSearchRes(res.data.filter(p => !items.find(i => i.product.id === p.id)))
      } catch {
        // Silent fail
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ, items])

  const addProduct = (p: Product) => {
    setItems(prev => [...prev, { product: p, quantity: 1, import_price: 0 }])
    setSearchQ('')
    setSearchRes([])
  }

  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const total = items.reduce((s, i) => s + i.quantity * i.import_price, 0)

  const handleSubmit = async () => {
    // Validation client-side
    if (!items.length) {
      toast.error('Chưa có sản phẩm nào.')
      return
    }

    // Validate quantity > 0
    const invalidQuantity = items.find(i => i.quantity <= 0)
    if (invalidQuantity) {
      toast.error('Số lượng phải lớn hơn 0')
      return
    }

    // Validate import_price > 0
    const invalidPrice = items.find(i => i.import_price <= 0)
    if (invalidPrice) {
      toast.error('Giá nhập phải lớn hơn 0')
      return
    }

    setSaving(true)
    try {
      const receipt = await importReceiptService.create({
        supplier: supplier || undefined,
        note: note || undefined,
        items: items.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
          import_price: i.import_price,
        })),
      })
      toast.success(`Tạo phiếu nhập kho thành công`)
      router.push('/admin/import-receipts')
    } catch (error: any) {
      toast.error(error?.message || 'Tạo phiếu nhập kho thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-slate-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Tạo phiếu nhập kho</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu phiếu nhập'}
        </button>
      </div>

      {/* Thông tin phiếu */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Thông tin phiếu nhập</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nhà cung cấp
            </label>
            <input
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              placeholder="VD: Công ty ABC..."
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú nội bộ..."
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Tìm & thêm sản phẩm */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Danh sách sản phẩm nhập</h2>

        {/* Search box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Tìm sản phẩm để thêm vào phiếu..."
            className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          {searchRes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
              {searching && <p className="px-4 py-2 text-sm text-slate-400">Đang tìm...</p>}
              {searchRes.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-8 h-8 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Package2 className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      Tồn: {p.stock} • Giá bán: {fmt(p.price)}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 ml-auto" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items table */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-300 border-2 border-dashed rounded-xl">
            <Package2 className="w-8 h-8 mb-2" />
            <p className="text-sm">Tìm và thêm sản phẩm vào phiếu</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 rounded-xl">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">
                  Sản phẩm
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-600 w-28">
                  Số lượng
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-600 w-36">
                  Giá nhập (đ)
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 w-32">
                  Thành tiền
                </th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.product.id}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-8 h-8 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Package2 className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <span className="font-medium text-slate-800">{item.product.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e =>
                        updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-full border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.import_price}
                      onChange={e => updateItem(idx, { import_price: Number(e.target.value) })}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                    {fmt(item.quantity * item.import_price)}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200">
              <tr>
                <td colSpan={3} className="px-3 py-3 text-right font-semibold text-slate-700">
                  Tổng cộng:
                </td>
                <td className="px-3 py-3 text-right text-lg font-bold text-[#ed2a2a]">
                  {fmt(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
