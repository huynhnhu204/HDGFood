'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, RefreshCw, Plus, Trash2, Pencil, Tag, GripVertical, X, Save, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { categoryService, type CategoryPayload } from '@/services/category.service'
import AdminTrashLink from '@/components/admin/AdminTrashLink'
import type { Category } from '@/types'

// ── Main Page ─────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState<'all' | 'active' | 'hidden'>('all')
  const [perPage, setPerPage]       = useState(20)
  const [page, setPage]             = useState(1)
  const [lastPage, setLastPage]     = useState(1)
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [dragging, setDragging]     = useState<number | null>(null)
  const dragOver                    = useRef<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [moveToCategoryId, setMoveToCategoryId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await categoryService.getAll({
        search: search || undefined,
        status,
        per_page: perPage,
        page,
      }) as any
      if (res.meta) {
        setCategories(res.data)
        setLastPage(res.meta.last_page)
      } else {
        setCategories(res.data)
        setLastPage(1)
      }
    } catch { toast.error('Không tải được danh mục.') }
    finally { setLoading(false) }
  }, [search, status, perPage, page])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () =>
    setSelected(selected.size === categories.length ? new Set() : new Set(categories.map(c => c.id)))

  const handleDelete = async (cat: Category) => {
    if (cat.id === 1) {
      toast.error('Không thể xóa danh mục mặc định.')
      return
    }

    if ((cat.products_count ?? 0) > 0) {
      const fallback = categories.find(c => c.id !== cat.id && c.id !== 1)?.id ?? null
      setMoveToCategoryId(fallback)
      setDeleteTarget(cat)
      return
    }

    if (!confirm('Xoá danh mục này?')) return
    try {
      await categoryService.remove(cat.id)
      toast.success('Đã xoá.')
      load()
    } catch {
      toast.error('Xoá thất bại.')
    }
  }

  const confirmDeleteWithMove = async () => {
    if (!deleteTarget || !moveToCategoryId) return
    setDeleting(true)
    try {
      await categoryService.remove(deleteTarget.id, moveToCategoryId)
      toast.success('Đã chuyển sản phẩm và xóa danh mục.')
      setDeleteTarget(null)
      setMoveToCategoryId(null)
      load()
    } catch {
      toast.error('Không thể xóa danh mục. Vui lòng thử lại.')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Xoá ${selected.size} danh mục?`)) return
    setBulkLoading(true)
    try { await categoryService.bulkDelete([...selected]); toast.success(`Đã xoá ${selected.size} danh mục.`); setSelected(new Set()); load() }
    catch { toast.error('Xoá thất bại.') }
    finally { setBulkLoading(false) }
  }

  const handleToggle = async (cat: Category) => {
    try { await categoryService.toggle(cat.id); toast.success(cat.is_active ? 'Đã ẩn.' : 'Đã hiện.'); load() }
    catch { toast.error('Cập nhật thất bại.') }
  }

  // Drag & drop reorder
  const handleDragStart = (id: number) => setDragging(id)
  const handleDragEnter = (id: number) => { dragOver.current = id }
  const handleDragEnd   = async () => {
    if (dragging === null || dragOver.current === null || dragging === dragOver.current) {
      setDragging(null); return
    }
    const from = categories.findIndex(c => c.id === dragging)
    const to   = categories.findIndex(c => c.id === dragOver.current)
    const reordered = [...categories]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setCategories(reordered)
    setDragging(null)
    dragOver.current = null
    try {
      await categoryService.reorder(reordered.map((c, i) => ({ id: c.id, sort_order: i })))
      toast.success('Đã cập nhật thứ tự.')
    } catch { toast.error('Lưu thứ tự thất bại.'); load() }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh mục</h1>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý danh mục sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminTrashLink trashType="category" />
          <button
            onClick={() => router.push('/admin/categories/create')}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed2a2a] text-white rounded-xl text-sm font-medium hover:bg-red-600 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Thêm danh mục
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm danh mục..."
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value as any); setPage(1) }}
          className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hiển thị</option>
          <option value="hidden">Đang ẩn</option>
        </select>
        <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
          className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
          <option value={10}>10 / trang</option>
          <option value={20}>20 / trang</option>
          <option value={50}>50 / trang</option>
        </select>
        <button onClick={load} className="p-2 border rounded-xl hover:bg-slate-50">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-red-700">Đã chọn {selected.size} danh mục</span>
          <button onClick={handleBulkDelete} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
            <Trash2 className="w-3.5 h-3.5" />
            {bulkLoading ? 'Đang xoá...' : 'Xoá hàng loạt'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-slate-500 hover:text-slate-700">Bỏ chọn</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Tag className="w-10 h-10 mb-2" />
            <p className="text-sm">Không có danh mục nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-8" />
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.size === categories.length && categories.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Danh mục</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden md:table-cell">Slug</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Sản phẩm</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600 hidden sm:table-cell">Thứ tự</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(cat => (
                  <tr
                    key={cat.id}
                    draggable
                    onDragStart={() => handleDragStart(cat.id)}
                    onDragEnter={() => handleDragEnter(cat.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className={`hover:bg-slate-50 transition-colors ${dragging === cat.id ? 'opacity-40' : ''}`}
                  >
                    {/* Drag handle */}
                    <td className="px-2 py-3 text-slate-300 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(cat.id)} onChange={() => toggleSelect(cat.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {cat.image
                          ? <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-xl object-cover border" />
                          : <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Tag className="w-5 h-5 text-slate-400" /></div>
                        }
                        <div>
                          <p className="font-bold text-slate-800">{cat.name}</p>
                          {cat.description && <p className="text-xs text-slate-400 truncate max-w-[120px] sm:max-w-48">{cat.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono hidden md:table-cell">{cat.slug}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-slate-700">{cat.products_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 text-sm hidden sm:table-cell">{cat.sort_order}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(cat)}
                        className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-full font-medium transition-all ${
                          cat.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}>
                        {cat.is_active ? '👁 Hiện' : '🙈 Ẩn'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => router.push(`/admin/categories/${cat.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Xem chi tiết">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => router.push(`/admin/categories/${cat.id}/edit`)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Sửa">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Xoá">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">← Trước</button>
          <span className="text-sm text-slate-600">Trang {page} / {lastPage}</span>
          <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50">Sau →</button>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Chuyển sản phẩm trước khi xóa</h3>
              <p className="text-sm text-slate-500 mt-1">
                Danh mục <span className="font-semibold">{deleteTarget.name}</span> đang có sản phẩm. Hãy chọn danh mục thay thế.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Danh mục thay thế</label>
              <select
                value={moveToCategoryId ?? ''}
                onChange={e => setMoveToCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories
                  .filter(c => c.id !== deleteTarget.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDeleteTarget(null)
                  setMoveToCategoryId(null)
                }}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteWithMove}
                disabled={!moveToCategoryId || deleting}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Đang xử lý...' : 'Chuyển và xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
