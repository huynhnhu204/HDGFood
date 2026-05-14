'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Plus, Trash2, Pencil, Power, PowerOff, Percent, MoreVertical, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { promotionService } from '@/services/promotion.service'
import type { Promotion } from '@/types'

const fmt     = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

const getTimelineStatus = (start: string, end: string) => {
    const now = new Date().getTime()
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()

    if (now < s) {
        const days = Math.ceil((s - now) / (1000 * 3600 * 24))
        return `Bắt đầu sau ${days} ngày tới`
    } else if (now >= s && now <= e) {
        const days = Math.ceil((e - now) / (1000 * 3600 * 24))
        return `Kết thúc trong ${days} ngày`
    } else {
        return 'Chương trình đã kết thúc'
    }
}

export default function PromotionsPage() {
  const router = useRouter()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'expired'>('all')
  const [page, setPage]             = useState(1)
  const [lastPage, setLastPage]     = useState(1)
  const [total, setTotal]           = useState(0)
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

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
      const res = await promotionService.getAll({
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
      })
      setPromotions(res.data)
      setLastPage(res.meta.last_page)
      setTotal(res.meta.total)
    } catch { toast.error('Không tải được danh sách khuyến mãi.') }
    finally { setLoading(false) }
  }, [search, statusFilter, page])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () =>
    setSelected(prev => prev.size === promotions.length ? new Set() : new Set(promotions.map(p => p.id)))

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Xóa vĩnh viễn ${selected.size} khuyến mãi khỏi hệ thống?`)) return
    setBulkLoading(true)
    try {
      await promotionService.bulkDelete([...selected])
      toast.success(`Đã xóa thành công ${selected.size} khuyến mãi`)
      setSelected(new Set()); load()
    } catch { toast.error('Xóa thất bại') }
    finally { setBulkLoading(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa vĩnh viễn khuyến mãi này?')) return
    try { await promotionService.delete(id); toast.success('Đã dọn dẹp khuyến mãi'); load() }
    catch { toast.error('Xóa thất bại') }
  }

  const handleToggle = async (id: number) => {
    try { await promotionService.toggle(id); toast.success('Đã update trạng thái'); load() }
    catch { toast.error('Cập nhật thất bại') }
  }

  const running = promotions.filter(p => p.status === 'running').length
  const expired = promotions.filter(p => p.status === 'expired').length

  return (
    <div className="space-y-6 pb-24 lg:pb-10 relative">
      
      {/* Mobile FAB */}
      <button
        onClick={() => router.push('/admin/promotions/create')}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-[60px] h-[60px] bg-[#ed2a2a] rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(237,42,42,0.35)] hover:scale-105 active:scale-90 transition-all outline-none"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Percent className="w-6 h-6 text-[#ed2a2a]" />
            Chương Trình Khuyến Mại
          </h1>
          <p className="text-[13px] font-medium text-slate-500 mt-1">Đang quản lý {total} chiến dịch tiếp thị trên hệ thống</p>
        </div>
        <button
          onClick={() => router.push('/admin/promotions/create')}
          className="hidden lg:flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-5 h-5" /> Tạo Khuyến Mại
        </button>
      </div>

      {/* Stats - Horizontal Scrollable on Mobile */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto scrollbar-hide pb-2 sm:pb-0">
        <div className="bg-white rounded-[1.5rem] border border-slate-200 p-5 shadow-sm min-w-[140px] flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
          <p className="text-3xl font-black text-slate-800 tracking-tight">{total}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng Số Lượng</p>
        </div>
        <div className="bg-green-50 rounded-[1.5rem] border border-green-200/60 p-5 shadow-sm min-w-[140px] flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
          <p className="text-3xl font-black text-emerald-600 tracking-tight">{running}</p>
          <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mt-1">Đang Chạy</p>
        </div>
        <div className="bg-slate-50 rounded-[1.5rem] border border-slate-200/60 p-5 shadow-sm min-w-[140px] flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
          <p className="text-3xl font-black text-slate-400 tracking-tight">{expired}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Đã Hết Hạn / Tắt</p>
        </div>
      </div>

      {/* Filters (Sticky on Desktop) */}
      <div className="sticky top-[72px] lg:top-4 z-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm theo tên CTKM..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] placeholder:text-slate-400 bg-white sm:bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
        </div>
        
        {/* Bộ lọc Tabs bằng Nút (Cuộn ngang Mobile) */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1 sm:pb-0 w-full xl:w-auto shrink-0">
           {(['all', 'running', 'expired'] as const).map(tab => (
              <button
                 key={tab}
                 onClick={() => { setStatusFilter(tab); setPage(1) }}
                 className={`px-5 py-3 rounded-xl text-[14px] font-bold transition-all active:scale-95 border ${statusFilter === tab ? 'bg-red-50 text-[#ed2a2a] border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                 {tab === 'all' ? 'Tất cả tình trạng' : tab === 'running' ? '🟢 Đang chạy' : '⚫ Hết hạn'}
              </button>
           ))}
           <button onClick={load} className="p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors shadow-sm active:scale-95 shrink-0 ml-1">
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Bulk action */}
      {selected.size > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 bg-red-50/80 backdrop-blur-sm border border-red-200/70 rounded-2xl p-4 flex items-center justify-between sticky top-[150px] lg:top-[90px] z-30 shadow-md">
          <span className="text-sm text-[#ed2a2a] font-bold tracking-tight">Đang thao tác hàng loạt {selected.size} chiến dịch</span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="flex items-center gap-2 px-5 py-2 bg-white text-[#ed2a2a] border border-[#ed2a2a]/50 rounded-xl text-sm font-bold hover:bg-[#ed2a2a] hover:text-white disabled:opacity-50 transition-colors shadow-sm active:scale-95"
          >
            <Trash2 className="w-[18px] h-[18px]" /> Thùng rác
          </button>
        </div>
      )}

      {/* Container List */}
      <div className="w-full">
        {loading && promotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
             <div className="flex flex-col gap-4 w-full px-6 opacity-30">
               {[1,2,3].map(i => (
                 <div key={i} className="w-full h-16 bg-slate-200 rounded-xl animate-pulse" />
               ))}
             </div>
          </div>
        ) : promotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm text-slate-400 text-center px-4">
             <div className="w-24 h-24 bg-slate-50 flex items-center justify-center rounded-full mb-4 ring-8 ring-slate-50/50">
                <Percent className="w-10 h-10 text-[#ed2a2a] opacity-50" />
             </div>
             <p className="font-black text-slate-700 text-[18px] mb-1">Cửa hàng đang nguyên giá!</p>
             <p className="text-[14px] font-medium text-slate-400 mb-6 max-w-md">Marketing là chìa khóa! Hãy gắn thêm siêu khuyến mãi cho các sản phẩm để kích thích nhu cầu mua sắm.</p>
             <button
               onClick={() => router.push('/admin/promotions/create')}
               className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#ed2a2a] text-white rounded-xl text-[14px] font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] transition-all hover:scale-[1.02] active:scale-95"
             >
               <Plus className="w-5 h-5" /> Tung Khuyến Mại
             </button>
          </div>
        ) : (
          <>
            {/* ── DESKTOP: TABLE ── */}
            <div className="hidden lg:block bg-white/50 backdrop-blur-md rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
              <table className="hidden lg:table w-full text-sm">
                <thead className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-4 w-10">
                      <input type="checkbox" checked={selected.size === promotions.length && promotions.length > 0} onChange={toggleAll} className="rounded w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a] cursor-pointer" />
                    </th>
                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[11px]">Chiến Dịch / Chương Trình</th>
                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[11px]">Mặt Hàng Gắn KM</th>
                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[11px]">Trọng số Giảm</th>
                    <th className="px-4 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[11px]">Hiệu Lực Thời Gian</th>
                    <th className="px-4 py-4 text-center font-black text-slate-500 uppercase tracking-widest text-[11px] w-36">Hiện Trạng</th>
                    <th className="px-5 py-4 text-center font-black text-slate-500 uppercase tracking-widest text-[11px] w-32">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {promotions.map(promo => (
                    <tr key={promo.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <input type="checkbox" checked={selected.has(promo.id)} onChange={() => toggleSelect(promo.id)} className="rounded w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a] cursor-pointer" />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-800 text-[15px]">{promo.name}</p>
                        {promo.min_order_amount && (
                          <div className="text-[12px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>Điều kiện đơn: {fmt(promo.min_order_amount)}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                          <span className="flex items-center gap-2 text-[13px] font-bold text-blue-700 bg-blue-50 w-fit px-3 py-1.5 rounded-lg border border-blue-100">
                             <Tag className="w-4 h-4" /> {promo.product?.name || 'Tất cả mặt hàng'}
                          </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-black bg-red-50 text-red-600 border border-red-100 shadow-sm">
                          {promo.discount_label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 items-start text-[12px] font-medium text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div> <span className="text-slate-400">Từ:</span> <strong className="text-slate-700">{fmtDate(promo.start_date)}</strong></div>
                           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></div> <span className="text-slate-400">Đến:</span> <strong className="text-slate-700">{fmtDate(promo.end_date)}</strong></div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {promo.status === 'running' && promo.is_active ? (
                          <span className="inline-flex items-center justify-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm shadow-emerald-500/10">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Đang Chạy
                          </span>
                        ) : !promo.is_active ? (
                          <span className="inline-flex items-center justify-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold bg-slate-50 text-slate-500 border border-slate-200">
                            ⏸ Đang Tắt
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold bg-slate-100 text-slate-500 border border-slate-200">
                             ⚫ Hết hạn
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggle(promo.id)}
                            className={`p-2 rounded-xl border transition-all active:scale-95 ${promo.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                            title={promo.is_active ? 'Tắt' : 'Bật'}
                          >
                            {promo.is_active ? <Power className="w-[18px] h-[18px]" /> : <PowerOff className="w-[18px] h-[18px]" />}
                          </button>
                          <button
                            onClick={() => router.push(`/admin/promotions/edit/${promo.id}`)}
                            className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all active:scale-95"
                          >
                            <Pencil className="w-[18px] h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 transition-all active:scale-95"
                          >
                            <Trash2 className="w-[18px] h-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE: CARD LIST VIEW DYNAMIC ── */}
            <div className="block lg:hidden space-y-4">
               {promotions.map(promo => (
                 <div key={promo.id} className="relative bg-white rounded-2xl border border-slate-200 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 active:scale-[0.98]">
                    
                    <div className="pl-1 space-y-4">
                       
                       {/* Header Card (Badge & 3 Dots) */}
                       <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-1.5 pr-4 w-full">
                             <div className="flex items-center justify-between w-full">
                               {promo.status === 'running' && promo.is_active ? (
                                  <span className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-black uppercase tracking-wider">
                                     <span className="relative flex h-2 w-2">
                                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                     </span>
                                     Đang chạy marketing
                                  </span>
                               ) : !promo.is_active ? (
                                  <span className="flex items-center gap-1.5 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                                     <div className="w-2 h-2 rounded-full bg-slate-300"></div> Đang tắt nháp
                                  </span>
                               ) : (
                                  <span className="flex items-center gap-1.5 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                                     <div className="w-2 h-2 rounded-full bg-slate-400"></div> Hết thời hạn
                                  </span>
                               )}
                             </div>
                             
                             <div className="flex items-start justify-between gap-3 mt-1">
                               <h3 className="font-black text-[20px] text-slate-900 leading-tight">{promo.name}</h3>
                               <span className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[13px] font-black bg-red-50 text-red-600 border border-red-100 uppercase tracking-widest whitespace-nowrap">
                                  {promo.discount_label}
                               </span>
                             </div>
                             
                             <div className="text-[12px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md w-fit flex items-center gap-1.5 mt-1 border border-orange-100/50">
                               <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div> {getTimelineStatus(promo.start_date, promo.end_date)}
                             </div>
                          </div>

                          {/* 3 Dots Menu Xổ Giảm cho Mobile */}
                          <div className="relative action-menu-container shrink-0">
                             <button onClick={() => setOpenMenuId(openMenuId === promo.id ? null : promo.id)} className="p-2 -mr-3 -mt-2 text-slate-400 hover:text-slate-800 transition-colors">
                               <MoreVertical className="w-6 h-6" />
                             </button>
                             
                             {openMenuId === promo.id && (
                                <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                   <button onClick={() => { handleToggle(promo.id); setOpenMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-4 text-[15px] font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors first:rounded-t-2xl">
                                     {promo.is_active ? <PowerOff className="w-5 h-5 text-slate-400" /> : <Power className="w-5 h-5 text-emerald-500" />} 
                                     {promo.is_active ? 'Tạm tắt KM' : 'Khởi động KM'}
                                   </button>
                                   <button onClick={() => router.push(`/admin/promotions/edit/${promo.id}`)} className="w-full flex items-center gap-3 px-4 py-4 text-[15px] font-bold text-blue-600 hover:bg-blue-50 border-b border-slate-50 transition-colors">
                                     <Pencil className="w-5 h-5" /> Cập nhật Sửa
                                   </button>
                                   <button onClick={() => { handleDelete(promo.id); setOpenMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-4 text-[15px] font-bold text-rose-600 hover:bg-rose-50 transition-colors last:rounded-b-2xl">
                                     <Trash2 className="w-5 h-5" /> Hủy hoàn toàn
                                   </button>
                                </div>
                             )}
                          </div>
                       </div>

                       {/* Thân Card: Điều khoản */}
                       <div className="flex flex-col gap-2.5 py-2">
                          <div className="flex flex-col gap-2">
                            <span className="text-[14px] font-bold text-slate-700 flex items-center gap-2">
                               <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                 <Tag className="w-3.5 h-3.5 text-slate-500" />
                               </div>
                               Sản phẩm: {promo.product?.name ? <span className="truncate max-w-[200px] text-blue-600">{promo.product.name}</span> : <span className="text-slate-500">Tất cả sản phẩm</span>}
                            </span>
                            {promo.min_order_amount && (
                               <div className="text-[14px] font-bold text-slate-700 flex items-center gap-2">
                                 <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                   <Percent className="w-3.5 h-3.5 text-slate-500" />
                                 </div>
                                 Đơn tối thiểu: <span className="text-[#ed2a2a] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">{fmt(promo.min_order_amount)}</span>
                               </div>
                            )}
                          </div>
                       </div>

                    </div>
                 </div>
               ))}
            </div>
          </>
        )}
      </div>

      {lastPage > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Trang {page} • {lastPage}</p>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide py-1 sm:py-0">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 shrink-0 active:scale-95 transition-all">Trở lại</button>
            <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
              className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 shrink-0 active:scale-95 transition-all">Đến sau</button>
          </div>
        </div>
      )}
    </div>
  )
}
