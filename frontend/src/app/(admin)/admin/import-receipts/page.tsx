'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Plus, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { importReceiptService } from '@/services/importReceipt.service'
import type { ImportReceipt } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function ImportReceiptsPage() {
  const router = useRouter()
  const [receipts, setReceipts] = useState<ImportReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await importReceiptService.list({
        search: search || undefined,
        page,
        per_page: 15,
      })
      setReceipts(res.data)
      setMeta(res.meta)
    } catch (error: any) {
      console.error('Error fetching import receipts:', error)
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách phiếu nhập')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  const handleDelete = async (receipt: ImportReceipt) => {
    const msg = `Xóa phiếu nhập ${receipt.code}?\nTồn kho và giá vốn sẽ được điều chỉnh lại.`
    if (!confirm(msg)) return
    
    try {
      await importReceiptService.delete(receipt.id)
      toast.success(`Đã xóa phiếu nhập ${receipt.code}`)
      fetchReceipts()
    } catch (error: any) {
      toast.error(error?.message || 'Xóa phiếu nhập thất bại')
    }
  }

  return (
    <div className="space-y-4 md:space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 md:px-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#ed2a2a]" />
            Danh sách Phiếu nhập kho
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Đang tải dữ liệu...' : `Tìm thấy tổng cộng ${meta.total} phiếu nhập`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReceipts}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => router.push('/admin/import-receipts/create')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-[0_4px_10px_rgba(237,42,42,0.25)]"
          >
            <Plus className="w-5 h-5" />
            <span>Tạo phiếu nhập</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4">
        <form
          onSubmit={e => {
            e.preventDefault()
            setSearch(searchInput)
            setPage(1)
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã phiếu, nhà cung cấp..."
              className="w-full pl-10 pr-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl outline-none transition-all focus:border-[#ed2a2a] focus:ring-2 focus:ring-[#ed2a2a]/20"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* LIST CONTAINER */}
      <div className="w-full">
        {/* DESKTOP: Table */}
        <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mã Phiếu
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ngày Nhập
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Nhà Cung Cấp
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng Tiền
                </th>
                <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-5">
                        <div className="h-4 bg-slate-100/60 rounded animate-pulse w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-slate-400">
                    <span className="text-4xl block mb-2 opacity-50">📦</span>
                    <p className="text-sm font-medium">Không tìm thấy phiếu nhập kho nào.</p>
                  </td>
                </tr>
              ) : (
                receipts.map(receipt => (
                  <tr key={receipt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {receipt.code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-600">
                        {new Date(receipt.imported_at).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="block text-xs text-slate-400 mt-0.5">
                        {new Date(receipt.imported_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-700">
                        {receipt.supplier || (
                          <span className="text-slate-400 italic">Chưa có thông tin</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-base font-black text-[#ed2a2a]">
                        {fmt(receipt.total_amount)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleDelete(receipt)}
                          title="Xóa phiếu nhập"
                          className="p-2 rounded-lg bg-red-50/50 border border-red-100 text-red-500 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE: Card Layout */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-pulse"
              >
                <div className="h-6 bg-slate-100 rounded mb-3 w-1/3"></div>
                <div className="h-4 bg-slate-100 rounded mb-2 w-2/3"></div>
                <div className="h-10 bg-slate-100 rounded mt-4"></div>
              </div>
            ))
          ) : receipts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <span className="text-4xl block mb-2 opacity-30">📦</span>
              <p className="text-slate-500 font-medium text-sm">
                Không tìm thấy phiếu nhập kho nào.
              </p>
            </div>
          ) : (
            receipts.map(receipt => (
              <div
                key={receipt.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative"
              >
                {/* Accent bar */}
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#ed2a2a] opacity-80"></div>

                {/* Card Content */}
                <div className="p-5 pl-6">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <span className="text-xl font-black text-slate-800 tracking-tight">
                        {receipt.code}
                      </span>
                      <span className="block text-sm text-slate-500 mt-1">
                        {new Date(receipt.imported_at).toLocaleDateString('vi-VN')} •{' '}
                        {new Date(receipt.imported_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                        Tổng tiền
                      </span>
                      <span className="text-xl font-black text-[#ed2a2a]">
                        {fmt(receipt.total_amount)}
                      </span>
                    </div>
                  </div>

                  {receipt.supplier && (
                    <div className="mb-3">
                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Nhà cung cấp
                      </span>
                      <p className="text-sm text-slate-700 font-medium mt-0.5">
                        {receipt.supplier}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="p-4 pl-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <button
                    onClick={() => handleDelete(receipt)}
                    className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-500 shadow-sm flex items-center gap-2 font-semibold text-sm hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa phiếu
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500">
              Trang {meta.current_page} trên {meta.last_page}
            </p>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 shadow-sm shrink-0"
              >
                Trở lại
              </button>

              {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  disabled={loading}
                  className={`min-w-[40px] h-[38px] px-2 text-xs font-black rounded-xl transition-all shadow-sm shrink-0
                    ${
                      page === p
                        ? 'bg-[#ed2a2a] text-white border-transparent'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page || loading}
                className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 shadow-sm shrink-0"
              >
                Tiếp theo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
