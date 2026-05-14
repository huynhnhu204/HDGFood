'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Trash2, Package2 } from 'lucide-react'
import { toast } from 'sonner'
import { importService } from '@/services/import.service'
import type { ImportReceipt } from '@/types'

const fmt     = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function ImportDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [receipt, setReceipt] = useState<ImportReceipt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    importService.getById(Number(id))
      .then(setReceipt).catch(() => toast.error('Không tải được phiếu.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!receipt || !confirm(`Xóa phiếu ${receipt.code}? Tồn kho sẽ được hoàn lại.`)) return
    try {
      await importService.remove(receipt.id)
      toast.success('Đã xóa phiếu nhập.')
      router.push('/admin/inventory/imports')
    } catch { toast.error('Xóa thất bại.') }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
    </div>
  )
  if (!receipt) return <div className="text-center py-32 text-slate-500">Không tìm thấy phiếu.</div>

  const total = receipt.items?.reduce((s, i) => s + i.subtotal, 0) ?? receipt.total_amount

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 font-mono">{receipt.code}</h1>
              <p className="text-sm text-slate-500 mt-1">{fmtDate(receipt.imported_at)}</p>
            </div>
            <button onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Xóa phiếu
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Nhà cung cấp</p>
              <p className="text-sm font-medium text-slate-700">{receipt.supplier || '—'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Người tạo</p>
              <p className="text-sm font-medium text-slate-700">{receipt.user?.name ?? '—'}</p>
            </div>
            {receipt.note && (
              <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-600 mb-1">Ghi chú</p>
                <p className="text-sm text-amber-800">{receipt.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">Danh sách sản phẩm nhập</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Sản phẩm</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Số lượng</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Giá nhập</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipt.items?.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.product?.image
                      ? <img src={item.product.image} alt={item.product.name} className="w-9 h-9 rounded-lg object-cover border" />
                      : <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Package2 className="w-4 h-4 text-slate-400" /></div>
                    }
                    <span className="font-medium text-slate-800">{item.product?.name ?? `#${item.product_id}`}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-slate-700">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(item.import_price)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50">
            <tr>
              <td colSpan={3} className="px-4 py-4 text-right font-semibold text-slate-700">Tổng cộng:</td>
              <td className="px-4 py-4 text-right text-xl font-bold text-[#ed2a2a]">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
