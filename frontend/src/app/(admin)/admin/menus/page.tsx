'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ListTree, Plus, Loader2, Edit, Trash2,
  LayoutTemplate, Smartphone, MoreHorizontal, Settings,
  ChevronRight, Calendar, ArrowRight, Search, 
  RotateCcw, Info, Trash, Check, X, Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { menuService } from '@/services/menu.service'
import type { Menu } from '@/types'
import Link from 'next/link'
import { Skeleton } from '@/components/common/Skeleton'

const POSITIONS: Record<string, { label: string; icon: any; color: string }> = {
  header: { label: 'Header Menu', icon: LayoutTemplate, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  footer: { label: 'Footer Menu', icon: MoreHorizontal, color: 'text-slate-600 bg-slate-50 border-slate-100' },
  mobile: { label: 'Mobile Menu', icon: Smartphone, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
}

const isMenuActive = (status: string | number | boolean | null | undefined) =>
  status === 1 || status === '1' || status === 'active' || status === true

export default function MenusPage() {
  const router = useRouter()
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'trash'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [posFilter, setPosFilter] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { q: searchQuery }
      if (posFilter) params.position = posFilter
      // Tab 'all' lay ca status 0 va 1, tab 'trash' chi lay status 0
      if (activeTab === 'trash') params.status = 0
      // Khong truyen status khi 'all' de lay het
      const res = await menuService.adminGetAll(params)
      // Filter client-side: 'all' chi hien status=1, 'trash' hien status=0
      const filtered = activeTab === 'all'
        ? (Array.isArray(res) ? res : []).filter((m: any) => isMenuActive(m.status))
        : (Array.isArray(res) ? res : [])
      setMenus(filtered)
    } catch {
      toast.error('Lỗi khi tải danh sách Menu')
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery, posFilter])

  useEffect(() => {
    const timer = setTimeout(loadData, 300)
    return () => clearTimeout(timer)
  }, [loadData])

  const handleToggleStatus = async (id: number) => {
    try {
      await menuService.toggleStatus(id)
      loadData()
      toast.success('Đã cập nhật trạng thái')
    } catch {
      toast.error('Cập nhật trạng thái thất bại')
    }
  }

  const handleTrash = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn đưa menu này vào thùng rác? Tất cả menu con cũng sẽ bị tạm ẩn.')) return
    try {
      await menuService.delete(id)
      toast.success('Đã đưa vào thùng rác')
      loadData()
    } catch {
      toast.error('Có lỗi xảy ra khi xóa')
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await menuService.restore(id)
      toast.success('Đã khôi phục thành công')
      loadData()
    } catch {
      toast.error('Khôi phục thất bại')
    }
  }

  const handlePurge = async (id: number) => {
    if (!confirm('Hành động này sẽ xóa vĩnh viễn menu khỏi hệ thống và không thể khôi phục. Bạn có chắc chắn?')) return
    try {
      await menuService.purge(id)
      toast.success('Đã xóa vĩnh viễn')
      loadData()
    } catch {
      toast.error('Xóa vĩnh viễn thất bại')
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 text-[12px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <span>Admin</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#ed2a2a]">Quản lý Menu</span>
           </div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
              <ListTree className="w-8 h-8 text-[#ed2a2a]" />
              Hệ thống Menu
           </h1>
        </div>
        
        <button
          onClick={() => router.push('/admin/menus/create')}
          className="flex items-center justify-center gap-2 px-10 py-4 bg-[#ed2a2a] text-white rounded-2xl text-[14px] font-black shadow-[0_8px_30px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto uppercase tracking-widest"
        >
          <Plus className="w-5 h-5" /> Thêm Menu Mới
        </button>
      </div>

      {/* ── TABS & FILTERS ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shadow-sm">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-8 py-3 rounded-xl text-[13px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'all' ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Tất cả Menu
          </button>
          <button 
            onClick={() => setActiveTab('trash')}
            className={`px-8 py-3 rounded-xl text-[13px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'trash' ? 'bg-slate-800 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Thùng rác
            {activeTab !== 'trash' && <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black tracking-normal">!</span>}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
           <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ed2a2a] transition-colors" />
              <input 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Tìm tên menu..." 
                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-red-50 focus:border-[#ed2a2a] transition-all outline-none"
              />
           </div>
           
           <div className="relative w-full sm:w-52">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold appearance-none outline-none focus:ring-4 focus:ring-red-50"
              >
                  <option value="">Tất cả vị trí</option>
                  <option value="header">Header Menu</option>
                  <option value="footer">Footer Menu</option>
                  <option value="mobile">Mobile Menu</option>
                  <option value="other">Vị trí khác</option>
              </select>
           </div>
        </div>
      </div>

      {/* ── TABLE CONTENT ── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden ring-1 ring-slate-100">
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[30%]">Tên Phân Nhóm</th>
                <th className="px-6 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Loại Phân Loại</th>
                <th className="px-6 py-6 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ưu tiên</th>
                <th className="px-6 py-6 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hiển thị</th>
                <th className="px-6 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ngày cập nhật</th>
                <th className="px-8 py-6 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-8 py-6"><Skeleton className="h-6 w-48 rounded" /></td>
                    <td className="px-6 py-6"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-6 py-6 text-center"><Skeleton className="h-8 w-8 rounded-full mx-auto" /></td>
                    <td className="px-6 py-6 text-center"><Skeleton className="h-6 w-10 rounded-full mx-auto" /></td>
                    <td className="px-6 py-6"><Skeleton className="h-4 w-32 rounded" /></td>
                    <td className="px-8 py-6 text-right space-x-2"><Skeleton className="h-8 w-8 inline-block rounded" /><Skeleton className="h-8 w-8 inline-block rounded" /></td>
                  </tr>
                ))
              ) : menus.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Info className="w-10 h-10 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-black uppercase tracking-widest text-[11px]">Không tìm thấy menu nào phù hợp!</p>
                      <p className="text-slate-400 text-xs font-bold mt-2">Vui lòng kiểm tra lại bộ lọc hoặc tìm kiếm.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                menus.map((item) => {
                  const pos = POSITIONS[item.position] || { label: 'Unknown', icon: Settings, color: 'text-amber-600 bg-amber-50 border-amber-100' }
                  const PosIcon = pos.icon
                  
                  return (
                    <tr key={item.id} className="group border-b border-slate-50 hover:bg-slate-50/30 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-[1.2rem] flex items-center justify-center group-hover:bg-[#ed2a2a]/10 transition-colors border-2 border-transparent group-hover:border-[#ed2a2a]/10">
                              <ListTree className="w-6 h-6 text-slate-400 group-hover:text-[#ed2a2a] transition-colors" />
                           </div>
                           <div>
                              <p className="text-[15px] font-semibold text-slate-800 tracking-tight group-hover:text-[#ed2a2a] transition-colors uppercase leading-none">{item.name}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">ID: #{item.id}</p>
                                {(item as any).items_count > 0 && (
                                  <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                    {(item as any).items_count} mục con
                                  </span>
                                )}
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest ${pos.color}`}>
                           <PosIcon className="w-4 h-4" />
                           {pos.label}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center font-semibold text-slate-700 text-base">
                         {item.sort_order ?? 0}
                      </td>
                      <td className="px-6 py-6 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isMenuActive((item as any).status)}
                            onChange={() => handleToggleStatus(item.id)}
                          />
                          <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ed2a2a] transition-all" />
                        </label>
                      </td>
                      <td className="px-6 py-6">
                         <div className="flex items-center gap-2 text-slate-500">
                            <Calendar className="w-4 h-4 text-[#ed2a2a]" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest">{new Date(item.updated_at || '').toLocaleDateString('vi-VN')}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2.5 opacity-100 transition-all scale-100">
                           {activeTab === 'all' ? (
                              <>
                                <button 
                                  onClick={() => router.push(`/admin/menus/${item.id}/edit`)}
                                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-200 hover:border-blue-100 shadow-sm"
                                  title="Thiết kế menu"
                                >
                                    <Edit className="w-4.5 h-4.5" />
                                </button>
                                <button 
                                  onClick={() => handleTrash(item.id)}
                                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-[#ed2a2a] hover:bg-red-50 transition-all border border-slate-200 hover:border-red-100 shadow-sm"
                                  title="Đưa vào thùng rác"
                                >
                                    <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </>
                           ) : (
                              <>
                                <button 
                                  onClick={() => handleRestore(item.id)}
                                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-200 hover:border-emerald-100 shadow-sm"
                                  title="Khôi phục"
                                >
                                    <RotateCcw className="w-4.5 h-4.5" />
                                </button>
                                <button 
                                  onClick={() => handlePurge(item.id)}
                                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-red-700 hover:bg-red-50 transition-all border border-slate-200 hover:border-red-300 shadow-sm"
                                  title="Xóa vĩnh viễn"
                                >
                                    <Trash className="w-4.5 h-4.5" />
                                </button>
                              </>
                           )}
                           <Link 
                             href={`/admin/menus/${item.id}/edit`}
                             className="ml-2 p-3 rounded-2xl bg-slate-900 text-white hover:bg-[#ed2a2a] shadow-lg shadow-slate-200 hover:shadow-red-500/30 transition-all"
                           >
                              <ArrowRight className="w-4.5 h-4.5" />
                           </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER STATS ── */}
        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tất cả: {menus.length} Nhóm Menu đang đồng bộ
           </p>
           <button 
             onClick={loadData}
             className="text-[10px] font-black text-[#ed2a2a] uppercase tracking-widest hover:underline px-4 py-2 bg-red-50/50 rounded-xl"
           >
              Làm mới dữ liệu
           </button>
        </div>
      </div>
    </div>
  )
}
