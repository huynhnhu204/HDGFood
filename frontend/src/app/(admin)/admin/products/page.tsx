'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Plus, Trash2, Pencil, Package, Copy, Eye, Filter, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { productService } from '@/services/product.service'
import AdminTrashTabs from '@/components/admin/AdminTrashTabs'
import api from '@/services/api'
import type { Category, Product } from '@/types'
import * as XLSX from 'xlsx'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

function StatusBadge({ stock, isAvailable }: { stock: number; isAvailable: boolean }) {
  if (!isAvailable || stock === 0)
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">Hết hàng</span>
  if (stock <= 10)
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Sắp hết ({stock})</span>
  return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Còn hàng</span>
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<number | ''>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | ''>('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [listTab, setListTab] = useState<'all' | 'trash'>('all')
  const [importLoading, setImportLoading] = useState(false)
  const excelInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {
        search: search || undefined,
        category: catFilter || undefined,
        page,
        paginate: 20,
      }

      if (listTab === 'trash') {
        params.only_trashed = 1
      } else if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active' ? 1 : 0
      }
      
      if (stockFilter === 'out_of_stock') {
        params.stock = 0
      } else if (stockFilter === 'low_stock') {
        params.stock_max = 10
      } else if (stockFilter === 'in_stock') {
        params.stock_min = 1
      }
      
      if (priceSort) {
        params.sort_by = 'price'
        params.sort_order = priceSort
      }
      
      const res = await productService.getAll(params)
      setProducts(res.data)
      setLastPage(res.meta.last_page)
    } catch { toast.error('Không tải được danh sách sản phẩm.') }
    finally { setLoading(false) }
  }, [search, catFilter, statusFilter, stockFilter, priceSort, page, listTab])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get<{ data: Category[] }>('/categories').then(r => setCategories(r.data.data)).catch(() => {})
  }, [])

  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () =>
    setSelected(selected.size === products.length ? new Set() : new Set(products.map(p => p.id)))

  const handleDelete = async (id: number) => {
    if (!confirm('Xoá sản phẩm này?')) return
    try { await productService.remove(id); toast.success('Đã xoá.'); load() }
    catch { toast.error('Xoá thất bại.') }
  }

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Xoá ${selected.size} sản phẩm đã chọn?`)) return
    setBulkLoading(true)
    try {
      await productService.bulkDelete([...selected])
      toast.success(`Đã xoá ${selected.size} sản phẩm.`)
      setSelected(new Set()); load()
    } catch { toast.error('Xoá hàng loạt thất bại.') }
    finally { setBulkLoading(false) }
  }

  const handleClone = async (p: Product) => {
    try { await productService.clone(p.id); toast.success(`Đã clone "${p.name}".`); load() }
    catch { toast.error('Clone thất bại.') }
  }

  const normalizeHeader = (key: string) => key.toLowerCase().trim().replace(/\s+/g, '_')
  const toNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'number') return value
    const n = Number(String(value).replace(/\s/g, '').replace(',', '.'))
    return Number.isNaN(n) ? null : n
  }
  const toBool = (value: any): boolean | null => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'boolean') return value
    const text = String(value).trim().toLowerCase()
    if (['1', 'true', 'yes', 'y', 'active', 'có', 'co'].includes(text)) return true
    if (['0', 'false', 'no', 'n', 'inactive', 'không', 'khong'].includes(text)) return false
    return null
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
          name: map.name,
          price: toNumber(map.price ?? map.gia_ban),
          sale_price: toNumber(map.sale_price ?? map.gia_khuyen_mai),
          stock: toNumber(map.stock ?? map.ton_kho),
          category_id: toNumber(map.category_id ?? map.danh_muc_id),
          category: map.category ?? map.category_name ?? map.danh_muc,
          description: map.description ?? map.mo_ta,
          image: map.image ?? map.hinh_anh,
          is_active: toBool(map.is_active ?? map.trang_thai),
          is_featured: toBool(map.is_featured ?? map.noi_bat),
          is_available: toBool(map.is_available ?? map.con_ban),
        }
      }).filter(r => r.name && r.price !== null)

      if (!rows.length) {
        toast.error('Không tìm thấy dòng hợp lệ. Cần ít nhất cột: name, price.')
        return
      }

      const res = await productService.importRows(rows)
      if (res.failed_count > 0) {
        const preview = res.errors.slice(0, 3).map(err => `Dòng ${err.row}: ${err.message}`).join(' | ')
        toast.warning(`Đã thêm ${res.created_count}, lỗi ${res.failed_count}. ${preview}`)
      } else {
        toast.success(`Import thành công ${res.created_count} sản phẩm.`)
      }
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import Excel thất bại.')
    } finally {
      setImportLoading(false)
      if (excelInputRef.current) excelInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-3">
          <AdminTrashTabs active={listTab} onChange={setListTab} trashType="product" />
          <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản lý Sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {products.length > 0 && <span className="font-semibold text-slate-700">{products.length}</span>} sản phẩm{listTab === 'trash' ? ' trong thùng rác' : ''}
          </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-2 px-4 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {importLoading ? 'Đang import...' : 'Import Excel'}
          </button>
          <button 
            onClick={() => router.push('/admin/products/create')}
            className="flex items-center gap-2 px-5 py-3 bg-[#ed2a2a] text-white rounded-2xl text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
            <Plus className="w-4 h-4" />
            Thêm sản phẩm mới
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm kiếm sản phẩm..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all" 
            />
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={catFilter} 
              onChange={e => { setCatFilter(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
              className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-[#ed2a2a] cursor-pointer">
              <option value="">Tất cả danh mục</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all border ${
                showFilters 
                  ? 'bg-[#ed2a2a] text-white border-[#ed2a2a] shadow-lg' 
                  : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
              }`}>
              <Filter className="w-4 h-4" />
              Bộ lọc
              {(statusFilter !== 'all' || stockFilter !== 'all' || priceSort) && (
                <span className="w-2 h-2 bg-white rounded-full"></span>
              )}
            </button>
            
            <button 
              onClick={load} 
              disabled={loading}
              className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 disabled:opacity-50 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* View Toggle */}
            <div className="hidden sm:flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                Bảng
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                Lưới
              </button>
            </div>
          </div>
        </div>
        
        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Trạng thái</label>
              <select 
                value={statusFilter} 
                onChange={e => { setStatusFilter(e.target.value as any); setPage(1) }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-[#ed2a2a]">
                <option value="all">Tất cả</option>
                <option value="active">Đang bán</option>
                <option value="inactive">Đã ẩn</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Tồn kho</label>
              <select 
                value={stockFilter} 
                onChange={e => { setStockFilter(e.target.value as any); setPage(1) }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-[#ed2a2a]">
                <option value="all">Tất cả</option>
                <option value="in_stock">Còn hàng</option>
                <option value="low_stock">Sắp hết (≤10)</option>
                <option value="out_of_stock">Hết hàng</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Sắp xếp giá</label>
              <select 
                value={priceSort} 
                onChange={e => { setPriceSort(e.target.value as any); setPage(1) }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-[#ed2a2a]">
                <option value="">Mặc định</option>
                <option value="asc">Giá tăng dần</option>
                <option value="desc">Giá giảm dần</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-2xl px-5 py-4">
          <span className="text-sm font-bold text-red-700">
            <span className="text-lg font-black">{selected.size}</span> sản phẩm đã chọn
          </span>
          <div className="h-4 w-px bg-red-200 mx-1" />
          <button
            onClick={handleBulkDelete} 
            disabled={bulkLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition-all shadow-sm">
            <Trash2 className="w-4 h-4" />
            {bulkLoading ? 'Đang xoá...' : 'Xoá hàng loạt'}
          </button>
          <button 
            onClick={() => setSelected(new Set())} 
            className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
            Bỏ chọn tất cả
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có sản phẩm nào</h3>
            <p className="text-sm text-slate-400 mb-6">Bắt đầu bằng cách thêm sản phẩm đầu tiên của bạn</p>
            <button 
              onClick={() => router.push('/admin/products/create')}
              className="flex items-center gap-2 px-5 py-3 bg-[#ed2a2a] text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-all">
              <Plus className="w-4 h-4" />
              Thêm sản phẩm
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4' : 'overflow-x-auto'}>
            {viewMode === 'grid' ? (
              // Grid View
              products.map(p => (
                <div 
                  key={p.id} 
                  className={`group relative bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
                    selected.has(p.id) ? 'border-[#ed2a2a] shadow-lg shadow-red-100' : 'border-slate-100 hover:border-slate-200'
                  }`}
                  onClick={() => router.push(`/admin/products/${p.id}`)}
                >
                  {/* Checkbox */}
                  <div 
                    className="absolute top-3 left-3 z-10"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(p.id) }}>
                    <input 
                      type="checkbox" 
                      checked={selected.has(p.id)} 
                      onChange={() => toggleSelect(p.id)}
                      className="w-5 h-5 rounded border-2 border-slate-300 accent-[#ed2a2a] cursor-pointer" 
                    />
                  </div>

                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                    {p.image ? (
                      <img 
                        src={p.image} 
                        alt={p.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-orange-100 to-amber-100">
                        🍽️
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                      {p.is_featured && (
                        <span className="px-2 py-1 bg-amber-400 text-white text-[10px] font-black rounded-lg shadow-lg">
                          ⭐ Nổi bật
                        </span>
                      )}
                      {!p.is_active && (
                        <span className="px-2 py-1 bg-slate-800/80 text-white text-[10px] font-black rounded-lg">
                          Ẩn
                        </span>
                      )}
                    </div>

                    {/* Quick actions (always visible for admin consistency) */}
                    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-2 rounded-2xl bg-white/90 px-2 py-1.5 shadow-lg backdrop-blur-sm">
                      <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/products/${p.id}`) }}
                        className="p-3 bg-white rounded-xl text-slate-700 hover:text-[#ed2a2a] shadow-lg transition-all hover:scale-110">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/products/${p.id}/edit`) }}
                        className="p-3 bg-white rounded-xl text-blue-600 hover:text-blue-700 shadow-lg transition-all hover:scale-110">
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleClone(p) }}
                        className="p-3 bg-white rounded-xl text-slate-500 hover:text-slate-700 shadow-lg transition-all hover:scale-110">
                        <Copy className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                        className="p-3 bg-white rounded-xl text-red-500 hover:text-red-600 shadow-lg transition-all hover:scale-110">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight group-hover:text-[#ed2a2a] transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">{p.category?.name ?? 'Chưa phân loại'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <span className="text-lg font-black text-[#ed2a2a]">{fmt(p.sale_price ?? p.price)}</span>
                        {p.sale_price && p.price > p.sale_price && (
                          <span className="text-[11px] text-slate-400 line-through ml-1.5">{fmt(p.price)}</span>
                        )}
                      </div>
                      <StatusBadge stock={p.stock ?? 0} isAvailable={p.is_available ?? true} />
                    </div>

                    {/* Profit Info */}
                    {p.profit_margin !== undefined && p.profit_margin !== null && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          p.profit_margin > 0 ? 'bg-emerald-50 text-emerald-600' : 
                          p.profit_margin < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                          LN: {p.profit_margin.toFixed(1)}%
                        </span>
                        {p.profit_per_unit !== undefined && p.profit_per_unit !== null && (
                          <span className="text-[10px] font-bold text-slate-500">
                            {fmt(p.profit_per_unit)}/món
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // Table View
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 w-12">
                      <input type="checkbox" checked={selected.size === products.length && products.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-[#ed2a2a]" />
                    </th>
                    <th className="px-4 py-4 text-left font-black text-slate-600 text-xs uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-4 py-4 text-left font-black text-slate-600 text-xs uppercase tracking-wider">Danh mục</th>
                    <th className="px-4 py-4 text-right font-black text-slate-600 text-xs uppercase tracking-wider">Giá vốn</th>
                    <th className="px-4 py-4 text-right font-black text-slate-600 text-xs uppercase tracking-wider">Giá bán</th>
                    <th className="px-4 py-4 text-right font-black text-slate-600 text-xs uppercase tracking-wider">Lợi nhuận</th>
                    <th className="px-4 py-4 text-center font-black text-slate-600 text-xs uppercase tracking-wider">Tồn kho</th>
                    <th className="px-4 py-4 text-center font-black text-slate-600 text-xs uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-4 text-center font-black text-slate-600 text-xs uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 rounded accent-[#ed2a2a]" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/admin/products/${p.id}`)}>
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                              {p.name}
                              {p.is_featured && <span className="text-yellow-500 text-xs">⭐</span>}
                            </p>
                            <p className="text-xs text-slate-400">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                          {p.category?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {p.cost_price != null ? (
                          <p className="font-medium text-slate-700">{fmt(p.cost_price)}</p>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-bold text-[#ed2a2a]">{fmt(p.sale_price ?? p.price)}</p>
                        {p.sale_price && p.price > p.sale_price && (
                          <p className="text-xs text-slate-400 line-through">{fmt(p.price)}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {p.profit_margin != null ? (
                          <p className={`font-bold ${p.profit_margin > 0 ? 'text-emerald-600' : p.profit_margin < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                            {p.profit_margin.toFixed(1)}%
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge stock={p.stock ?? 0} isAvailable={p.is_available ?? true} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        {p.is_active ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Đang bán</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Ẩn</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => router.push(`/admin/products/${p.id}`)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => router.push(`/admin/products/${p.id}/edit`)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-all">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleClone(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-all">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-all">
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
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50 transition-all">
            ← Trước
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
              const p = lastPage <= 5 ? i + 1 : Math.max(1, page - 2) + i
              if (p > lastPage) return null
              return (
                <button 
                  key={p} 
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${
                    page === p 
                      ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20' 
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                  {p}
                </button>
              )
            })}
          </div>
          <button 
            disabled={page === lastPage} 
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50 transition-all">
            Sau →
          </button>
          <span className="text-sm text-slate-500 ml-2">
            Trang <span className="font-bold text-slate-700">{page}</span> / {lastPage}
          </span>
        </div>
      )}
    </div>
  )
}
