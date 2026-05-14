'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Plus, Trash2, Pencil, Power, PowerOff, Copy, Package, Grid3X3, MoreVertical, Percent, Calendar, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { comboAdminService } from '@/services/admin/combo-admin.service'
import type { Combo } from '@/types/combo'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const fmtDate = (s: string | null) => {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const getComboStats = (combo: Combo): { groupCount: number; productCount: number } => {
  const raw = combo as Combo & {
    activeGroups?: Array<{ products?: any[]; comboProducts?: any[] }>
    active_groups?: Array<{ products?: any[]; comboProducts?: any[] }>
    groups?: Array<{ products?: any[]; comboProducts?: any[] }>
  }

  const groups =
    (Array.isArray(raw.groups) && raw.groups.length > 0 ? raw.groups : undefined) ||
    (Array.isArray(raw.activeGroups) && raw.activeGroups.length > 0 ? raw.activeGroups : undefined) ||
    (Array.isArray(raw.active_groups) && raw.active_groups.length > 0 ? raw.active_groups : undefined) ||
    []

  const productCount = groups.reduce((acc, g) => {
    if (Array.isArray(g.products)) return acc + g.products.length
    if (Array.isArray(g.comboProducts)) return acc + g.comboProducts.length
    return acc
  }, 0)

  return { groupCount: groups.length, productCount }
}

function getComboStatus(combo: Combo): { label: string; className: string; running: boolean } {
  if (!combo.is_active) {
    return { label: 'Đang tắt', className: 'bg-slate-50 text-slate-500 border-slate-200', running: false }
  }
  
  const now = new Date().getTime()
  const start = combo.start_date ? new Date(combo.start_date).getTime() : null
  const end = combo.end_date ? new Date(combo.end_date).getTime() : null
  
  if (start && now < start) {
    return { label: 'Sắp diễn ra', className: 'bg-blue-50 text-blue-600 border-blue-200', running: false }
  }
  if (end && now > end) {
    return { label: 'Đã kết thúc', className: 'bg-slate-50 text-slate-500 border-slate-200', running: false }
  }
  
  return { label: 'Đang chạy', className: 'bg-emerald-50 text-emerald-600 border-emerald-200', running: true }
}

export default function CombosPage() {
  const router = useRouter()
  const [combos, setCombos]     = useState<Combo[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage]         = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const setActionState = (key: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [key]: loading }))
  }

  const isActionLoading = (key: string) => Boolean(actionLoading[key])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('.action-menu-container') === null) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {
        search: search || undefined,
        page,
      }
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active'
      }
      
      const res = await comboAdminService.getAll(params)
      setCombos(res.data)
      setLastPage(res.meta?.last_page || 1)
    } catch { toast.error('Không tải được danh sách combo.') }
    finally { setLoading(false) }
  }, [search, statusFilter, page])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () =>
    setSelected(prev => prev.size === combos.length ? new Set() : new Set(combos.map(p => p.id)))

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa vĩnh viễn combo này?')) return
    const key = `delete_${id}`
    if (isActionLoading(key)) return
    setActionState(key, true)
    try { await comboAdminService.delete(id); toast.success('Đã xóa combo.'); load() }
    catch { toast.error('Xóa thất bại.') }
    finally { setActionState(key, false) }
  }

  const handleToggle = async (id: number) => {
    const key = `toggle_${id}`
    if (isActionLoading(key)) return
    setActionState(key, true)
    try { await comboAdminService.toggle(id); toast.success('Đã cập nhật trạng thái.'); load() }
    catch { toast.error('Cập nhật thất bại.') }
    finally { setActionState(key, false) }
  }

  const handleClone = async (combo: Combo) => {
    const key = `clone_${combo.id}`
    if (isActionLoading(key)) return
    setActionState(key, true)
    try {
      await comboAdminService.create({
        name: `${combo.name} (Copy)`,
        slug: `${combo.slug}-copy`,
        description: combo.description || undefined,
        image: combo.image || undefined,
        discount_type: combo.discount_type,
        discount_value: combo.discount_value,
        is_active: false,
      })
      toast.success(`Đã clone "${combo.name}".`)
      load()
    } catch { toast.error('Clone thất bại.') }
    finally { setActionState(key, false) }
  }

  const running = combos.filter(c => c.is_active).length
  const total = combos.length

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      
      {/* Mobile FAB */}
      <button
        onClick={() => router.push('/admin/combos/create')}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-[60px] h-[60px] bg-[#ed2a2a] rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(237,42,42,0.35)] hover:scale-105 active:scale-90 transition-all outline-none"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Grid3X3 className="w-6 h-6 text-[#ed2a2a]" />
            Combo Linh Hoạt
          </h1>
          <p className="text-[13px] font-medium text-slate-500 mt-1">Quản lý các gói combo cho phép khách chọn món</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] transition-all shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => router.push('/admin/combos/create')}
            className="hidden lg:flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-5 h-5" /> Tạo Combo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex sm:grid sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-[1.5rem] border border-slate-200 p-5 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
          <p className="text-3xl font-black text-slate-800 tracking-tight">{total}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng Số Combo</p>
        </div>
        <div className="bg-emerald-50 rounded-[1.5rem] border border-emerald-200/60 p-5 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
          <p className="text-3xl font-black text-emerald-600 tracking-tight">{running}</p>
          <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mt-1">Đang Hoạt Động</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-[72px] lg:top-4 z-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm combo..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] placeholder:text-slate-400 bg-white sm:bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1 sm:pb-0 w-full xl:w-auto shrink-0">
          {(['all', 'active', 'inactive'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setStatusFilter(tab); setPage(1) }}
              className={`px-5 py-3 rounded-xl text-[14px] font-bold transition-all active:scale-95 border ${statusFilter === tab ? 'bg-red-50 text-[#ed2a2a] border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {tab === 'all' ? 'Tất cả' : tab === 'active' ? 'Đang bán' : 'Đã ẩn'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        {loading && combos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-4 w-full px-6 opacity-30">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-20 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : combos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm text-slate-400 text-center px-4">
            <div className="w-24 h-24 bg-slate-50 flex items-center justify-center rounded-full mb-4 ring-8 ring-slate-50/50">
              <Grid3X3 className="w-10 h-10 text-[#ed2a2a] opacity-50" />
            </div>
            <p className="font-black text-slate-700 text-[18px] mb-1">Chưa có combo nào!</p>
            <p className="text-[14px] font-medium text-slate-400 mb-6 max-w-md">Tạo combo linh hoạt để khách hàng có thể tự chọn món trong gói.</p>
            <button
              onClick={() => router.push('/admin/combos/create')}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#ed2a2a] text-white rounded-xl text-[14px] font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5" /> Tạo Combo Đầu Tiên
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block bg-white/50 backdrop-blur-md rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
              <table className="hidden lg:table w-full text-sm">
                <thead className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-4 w-10">
                      <input type="checkbox" checked={selected.size === combos.length && combos.length > 0} onChange={toggleAll} className="rounded w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a] cursor-pointer" />
                    </th>
                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[11px]">Combo</th>
                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[11px]">Cấu Hình</th>
                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[11px]">Giá</th>
                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[11px]">Thời Gian</th>
                    <th className="px-4 py-4 text-center font-black text-slate-500 uppercase tracking-widest text-[11px] w-36">Trạng Thái</th>
                    <th className="px-5 py-4 text-center font-black text-slate-500 uppercase tracking-widest text-[11px] w-32">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {combos.map(combo => {
                    const status = getComboStatus(combo)
                    const stats = getComboStats(combo)
                    return (
                      <tr key={combo.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <input type="checkbox" checked={selected.has(combo.id)} onChange={() => toggleSelect(combo.id)} className="rounded w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a] cursor-pointer" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {combo.image ? (
                              <img src={combo.image} alt={combo.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Grid3X3 className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800 text-[15px]">{combo.name}</p>
                              <p className="text-[12px] text-slate-400">{stats.groupCount} nhóm, {stats.productCount} sản phẩm</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-black bg-red-50 text-red-600 border border-red-100 shadow-sm">
                            <Percent className="w-3.5 h-3.5" />
                            {combo.discount_type === 'percent' ? `${combo.discount_value}%` : fmt(combo.discount_value)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-[13px]">
                            <p className="font-semibold text-slate-700">{fmt(combo.final_price)}</p>
                            {combo.base_price > 0 && (
                              <p className="text-slate-400 line-through text-[11px]">{fmt(combo.base_price)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-[180px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
                              <span className="text-slate-400">Từ:</span>
                              <span className="font-medium text-slate-700 truncate">{fmtDate(combo.start_date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></div>
                              <span className="text-slate-400">Đến:</span>
                              <span className="font-medium text-slate-700 truncate">{fmtDate(combo.end_date)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center justify-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold border ${status.className}`}>
                            {status.running && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            )}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/combos/${combo.id}/detail`)}
                              className="p-2 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 hover:bg-violet-100 transition-all active:scale-95"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-[18px] h-[18px]" />
                            </button>
                            <button
                              onClick={() => handleToggle(combo.id)}
                              disabled={isActionLoading(`toggle_${combo.id}`)}
                              className={`p-2 rounded-xl border transition-all active:scale-95 ${combo.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                              title={combo.is_active ? 'Tắt' : 'Bật'}
                            >
                              {combo.is_active ? <Power className="w-[18px] h-[18px]" /> : <PowerOff className="w-[18px] h-[18px]" />}
                            </button>
                            <button
                              onClick={() => router.push(`/admin/combos/${combo.id}/edit`)}
                              className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all active:scale-95"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-[18px] h-[18px]" />
                            </button>
                            <button
                              onClick={() => handleClone(combo)}
                              disabled={isActionLoading(`clone_${combo.id}`)}
                              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
                              title="Clone"
                            >
                              <Copy className="w-[18px] h-[18px]" />
                            </button>
                            <button
                              onClick={() => handleDelete(combo.id)}
                              disabled={isActionLoading(`delete_${combo.id}`)}
                              className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 transition-all active:scale-95"
                              title="Xóa"
                            >
                              <Trash2 className="w-[18px] h-[18px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="block lg:hidden space-y-4">
              {combos.map(combo => {
                const status = getComboStatus(combo)
                const stats = getComboStats(combo)
                return (
                  <div key={combo.id} className="relative bg-white rounded-2xl border border-slate-200 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {combo.image ? (
                          <img src={combo.image} alt={combo.name} className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <Grid3X3 className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[18px] text-slate-900 leading-tight">{combo.name}</p>
                          <p className="text-[12px] text-slate-400 mt-0.5">{stats.groupCount} nhóm • {stats.productCount} sản phẩm</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-bold bg-red-50 text-red-600 border border-red-100">
                              <Percent className="w-3 h-3" />
                              {combo.discount_type === 'percent' ? `${combo.discount_value}%` : fmt(combo.discount_value)}
                            </span>
                            <span className="font-bold text-[14px] text-slate-800">{fmt(combo.final_price)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 3 Dots Menu */}
                      <div className="relative action-menu-container shrink-0">
                        <button onClick={() => setOpenMenuId(openMenuId === combo.id ? null : combo.id)} className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-800 transition-colors">
                          <MoreVertical className="w-6 h-6" />
                        </button>
                        
                        {openMenuId === combo.id && (
                          <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <button onClick={() => { router.push(`/admin/combos/${combo.id}/detail`); setOpenMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-4 text-[15px] font-bold text-violet-600 hover:bg-violet-50 border-b border-slate-50 transition-colors">
                              <Eye className="w-5 h-5" /> Xem chi tiết
                            </button>
                            <button onClick={() => { handleToggle(combo.id); setOpenMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-4 text-[15px] font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors">
                              {combo.is_active ? <PowerOff className="w-5 h-5 text-slate-400" /> : <Power className="w-5 h-5 text-emerald-500" />} 
                              {combo.is_active ? 'Tạm tắt' : 'Bật lên'}
                            </button>
                            <button onClick={() => { router.push(`/admin/combos/${combo.id}/edit`); setOpenMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-4 text-[15px] font-bold text-blue-600 hover:bg-blue-50 border-b border-slate-50 transition-colors">
                              <Pencil className="w-5 h-5" /> Sửa combo
                            </button>
                            <button onClick={() => { handleClone(combo); setOpenMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-4 text-[15px] font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors">
                              <Copy className="w-5 h-5 text-slate-400" /> Clone
                            </button>
                            <button onClick={() => { handleDelete(combo.id); setOpenMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-4 text-[15px] font-bold text-rose-600 hover:bg-rose-50 transition-colors">
                              <Trash2 className="w-5 h-5" /> Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold border ${status.className}`}>
                        {status.running && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                        {status.label}
                      </span>
                      {combo.start_date && combo.end_date && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(combo.start_date)} - {fmtDate(combo.end_date)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Trang {page} • {lastPage}</p>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide py-1 sm:py-0">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 shrink-0 active:scale-95 transition-all">Trở lại</button>
            <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
              className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 shrink-0 active:scale-95 transition-all">Tiếp theo</button>
          </div>
        </div>
      )}
    </div>
  )
}
