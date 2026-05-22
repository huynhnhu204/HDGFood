'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Plus, Trash2, Eye, Package2, Filter, X, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { importService } from '@/services/import.service'
import AdminTrashLink from '@/components/admin/AdminTrashLink'
import type { ImportReceipt } from '@/types'
import * as XLSX from 'xlsx'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
})

export default function ImportsPage() {
  const router = useRouter()
  const [receipts, setReceipts] = useState<ImportReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [supplier, setSupplier] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [perPage, setPerPage] = useState(20)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [importLoading, setImportLoading] = useState(false)
  const excelInputRef = useRef<HTMLInputElement>(null)

  const activeFilterCount = [search, supplier, dateFrom, dateTo, minAmount, maxAmount].filter(Boolean).length

  const clearFilters = () => {
    setSearch(''); setSupplier(''); setDateFrom(''); setDateTo('')
    setMinAmount(''); setMaxAmount(''); setPage(1)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await importService.getAll({
        search: search || undefined,
        supplier: supplier || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        per_page: perPage,
        page,
      })
      // Client-side filter by amount if API doesn't support it
      let data = res.data
      if (minAmount) data = data.filter(r => r.total_amount >= Number(minAmount))
      if (maxAmount) data = data.filter(r => r.total_amount <= Number(maxAmount))
      setReceipts(data)
      setLastPage(res.meta.last_page)
      setTotal(res.meta.total)
    } catch { toast.error('Không tải được danh sách.') }
    finally { setLoading(false) }
  }, [search, supplier, dateFrom, dateTo, minAmount, maxAmount, perPage, page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (r: ImportReceipt) => {
    if (!confirm(`Xóa phiếu ${r.code}? Tồn kho sẽ được hoàn lại.`)) return
    try { await importService.remove(r.id); toast.success('Đã xóa phiếu nhập.'); load() }
    catch { toast.error('Xóa thất bại.') }
  }

  const inp = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ed2a2a] focus:ring-2 focus:ring-red-50 transition-all'

  const normalizeHeader = (key: string) => key.toLowerCase().trim().replace(/\s+/g, '_')
  const toNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'number') return value
    const n = Number(String(value).replace(/\s/g, '').replace(',', '.'))
    return Number.isNaN(n) ? null : n
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    try {
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })
      if (!rawRows.length) {
        toast.error('File Excel không có dữ liệu.')
        return
      }

      const rows = rawRows.map((raw) => {
        const map: Record<string, any> = {}
        Object.entries(raw).forEach(([k, v]) => { map[normalizeHeader(k)] = v })
        return {
          product_id: toNumber(map.product_id ?? map.id_san_pham),
          product_name: map.product_name ?? map.ten_san_pham,
          quantity: toNumber(map.quantity ?? map.so_luong),
          import_price: toNumber(map.import_price ?? map.gia_nhap),
        }
      }).filter(r => (r.product_id || r.product_name) && r.quantity && r.import_price)

      if (!rows.length) {
        toast.error('Không có dòng hợp lệ. Cần cột: product_id hoặc product_name, quantity, import_price.')
        return
      }

      const res = await importService.importExcel({
        rows,
        note: `Import Excel ${file.name}`,
      })

      if (res.invalid_rows?.length) {
        const preview = res.invalid_rows.slice(0, 3).map((x) => `Dòng ${x.row}: ${x.message}`).join(' | ')
        toast.warning(`Import xong, có ${res.invalid_rows.length} dòng lỗi. ${preview}`)
      } else {
        toast.success('Import phiếu nhập từ Excel thành công.')
      }

      setPage(1)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import Excel thất bại.')
    } finally {
      setImportLoading(false)
      if (excelInputRef.current) excelInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Phiếu nhập kho</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Đang tải...' : `Tổng ${total} phiếu`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AdminTrashLink href="/admin/trash" label="Thùng rác hệ thống" />
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportExcel}
          />
          <button
            onClick={() => excelInputRef.current?.click()}
            disabled={importLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {importLoading ? 'Đang import...' : 'Import Excel'}
          </button>
          <button onClick={() => router.push('/admin/inventory/imports/create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
            <Plus className="w-4 h-4" /> Tạo phiếu nhập
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        {/* Row 1: Search + quick actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm mã phiếu, nhà cung cấp..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#ed2a2a] focus:ring-2 focus:ring-red-50" />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${
              showFilters || activeFilterCount > 0
                ? 'border-[#ed2a2a] text-[#ed2a2a] bg-red-50'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="bg-[#ed2a2a] text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-red-500 transition-all">
              <X className="w-4 h-4" /> Xóa lọc
            </button>
          )}

          <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ed2a2a]">
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>

          <button onClick={load} disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Row 2: Advanced filters (collapsible) */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Nhà cung cấp</label>
              <input value={supplier} onChange={e => { setSupplier(e.target.value); setPage(1) }}
                placeholder="Tên nhà cung cấp..." className={inp} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Từ ngày</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                className={inp} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Đến ngày</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
                className={inp} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Tổng tiền (đ)</label>
              <div className="flex gap-1.5">
                <input type="number" value={minAmount} onChange={e => { setMinAmount(e.target.value); setPage(1) }}
                  placeholder="Từ" className={inp} />
                <input type="number" value={maxAmount} onChange={e => { setMaxAmount(e.target.value); setPage(1) }}
                  placeholder="Đến" className={inp} />
              </div>
            </div>
          </div>
        )}

        {/* Active filter tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {search && <FilterTag label={`Tìm: "${search}"`} onRemove={() => { setSearch(''); setPage(1) }} />}
            {supplier && <FilterTag label={`NCC: ${supplier}`} onRemove={() => { setSupplier(''); setPage(1) }} />}
            {dateFrom && <FilterTag label={`Từ: ${dateFrom}`} onRemove={() => { setDateFrom(''); setPage(1) }} />}
            {dateTo && <FilterTag label={`Đến: ${dateTo}`} onRemove={() => { setDateTo(''); setPage(1) }} />}
            {minAmount && <FilterTag label={`≥ ${fmt(Number(minAmount))}`} onRemove={() => { setMinAmount(''); setPage(1) }} />}
            {maxAmount && <FilterTag label={`≤ ${fmt(Number(maxAmount))}`} onRemove={() => { setMaxAmount(''); setPage(1) }} />}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Package2 className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium text-slate-400">Không tìm thấy phiếu nhập nào</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-3 text-xs text-[#ed2a2a] font-bold hover:underline">
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mã phiếu</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày nhập</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nhà cung cấp</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Người tạo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {receipts.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-black text-[#ed2a2a] text-sm">{r.code}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-sm">{fmtDate(r.imported_at)}</td>
                  <td className="px-4 py-3.5">
                    {r.supplier
                      ? <span className="text-slate-700 font-medium">{r.supplier}</span>
                      : <span className="text-slate-300 italic text-xs">Không có</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="font-black text-slate-800">{fmt(r.total_amount)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-sm">{r.user?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-400 text-sm max-w-40 truncate">{r.note || '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => router.push(`/admin/inventory/imports/${r.id}`)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Xem chi tiết">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
          <p className="text-xs text-slate-500 font-medium">Trang {page} / {lastPage}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-all">
              ← Trước
            </button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                  page === p ? 'bg-[#ed2a2a] text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}>
                {p}
              </button>
            ))}
            <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-all">
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-100 text-red-700 rounded-full text-xs font-bold">
      {label}
      <button onClick={onRemove} className="hover:text-red-900">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
