'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Plus, Trash2, Pencil, Power, PowerOff, Ticket, Gift, Users, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { voucherService } from '@/services/voucher.service'
import AdminTrashLink from '@/components/admin/AdminTrashLink'
import type { Voucher } from '@/types'

const fmt     = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const TIER_LABELS: Record<string, string> = {
  all: 'Tất cả TV', silver: 'Silver+', gold: 'Gold+', vip: 'VIP',
}
const TIER_STYLES: Record<string, string> = {
  all:    'bg-slate-100 text-slate-600 border border-slate-200',
  silver: 'bg-slate-100 text-slate-800 border border-slate-300',
  gold:   'bg-yellow-50 text-yellow-700 border border-yellow-200 shadow-sm',
  vip:    'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 shadow-sm',
}

export default function VouchersPage() {
  const router = useRouter()
  const [vouchers, setVouchers]     = useState<Voucher[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [page, setPage]             = useState(1)
  const [lastPage, setLastPage]     = useState(1)
  const [total, setTotal]           = useState(0)
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await voucherService.getAll({
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
      })
      setVouchers(res.data)
      setLastPage(res.meta.last_page)
      setTotal(res.meta.total)
    } catch { toast.error('Không tải được bản ghi hệ thống.') }
    finally { setLoading(false) }
  }, [search, statusFilter, page])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () =>
    setSelected(prev => prev.size === vouchers.length ? new Set() : new Set(vouchers.map(v => v.id)))

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Xóa vĩnh viễn ${selected.size} mã này khỏi hệ thống?`)) return
    setBulkLoading(true)
    try {
      await voucherService.bulkDelete([...selected])
      toast.success(`Đã xóa thành công ${selected.size} mã`)
      setSelected(new Set()); load()
    } catch { toast.error('Xóa thất bại') }
    finally { setBulkLoading(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa vĩnh viễn mã giảm giá này?')) return
    try { await voucherService.delete(id); toast.success('Đã dọn dẹp mã khỏi hệ thống'); load() }
    catch { toast.error('Xóa thất bại') }
  }

  const handleToggle = async (id: number) => {
    try { await voucherService.toggle(id); toast.success('Đã cập nhật trạng thái hoạt động'); load() }
    catch { toast.error('Cập nhật thất bại') }
  }

  const active  = vouchers.filter(v => v.is_valid).length
  const expired = vouchers.filter(v => !v.is_valid).length

  return (
    <div className="space-y-6 pb-24 lg:pb-10 relative">
      
      {/* Mobile FAB */}
      <button
        onClick={() => router.push('/admin/vouchers/create')}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-[60px] h-[60px] bg-gradient-to-r from-[#ed2a2a] to-[#d12525] rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(237,42,42,0.35)] hover:scale-105 active:scale-90 transition-all outline-none border border-red-400"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#ed2a2a]" />
            Mã Khuyến Mục (Vouchers)
          </h1>
          <p className="text-[13px] font-medium text-slate-500 mt-1">Đang quản lý {total} mã giảm giá trên hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <AdminTrashLink trashType="voucher" />
          <button
            onClick={() => router.push('/admin/vouchers/create')}
            className="hidden lg:flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 bg-gradient-to-r from-[#ed2a2a] to-[#d12525] text-white rounded-xl text-sm font-bold hover:from-[#f53535] hover:to-[#e02b2b] shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-5 h-5" /> Khởi tạo Mã mới
          </button>
        </div>
      </div>

      {/* Stats - Horizontal Scrollable on Mobile */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto scrollbar-hide pb-2 sm:pb-0">
        <div className="bg-white rounded-[1.5rem] border border-slate-200 p-5 shadow-sm min-w-[140px] flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
          <p className="text-3xl font-black text-slate-800 tracking-tight">{total}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng Voucher</p>
        </div>
        <div className="bg-green-50 rounded-[1.5rem] border border-green-200/60 p-5 shadow-sm min-w-[140px] flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
          <p className="text-3xl font-black text-emerald-600 tracking-tight">{active}</p>
          <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mt-1">Đang hoạt động</p>
        </div>
        <div className="bg-slate-50 rounded-[1.5rem] border border-slate-200/60 p-5 shadow-sm min-w-[140px] flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
          <p className="text-3xl font-black text-slate-400 tracking-tight">{expired}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Hết hạn / Khóa</p>
        </div>
      </div>

      {/* Filters (Sticky on Desktop) */}
      <div className="sticky top-[72px] lg:top-4 z-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-5 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Gõ mã hoặc tên voucher cần tìm..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] placeholder:text-slate-400 bg-white sm:bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
        </div>
        <div className="flex gap-3">
           <select
             value={statusFilter}
             onChange={e => { setStatusFilter(e.target.value as any); setPage(1) }}
             className="flex-1 sm:flex-none w-auto border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-bold focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] text-slate-700 bg-white sm:bg-slate-50 focus:bg-white transition-all"
           >
             <option value="all">Tất cả tình trạng</option>
             <option value="active">🟢 Đang kích hoạt</option>
             <option value="expired">⚫ Đã hết hạn / Lưu nháp</option>
           </select>
           <button onClick={load} className="p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors shadow-sm active:scale-95">
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Bulk action */}
      {selected.size > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 bg-red-50/80 backdrop-blur-sm border border-red-200/70 rounded-2xl p-4 flex items-center justify-between sticky top-[150px] lg:top-[90px] z-30 shadow-md">
          <span className="text-sm text-[#ed2a2a] font-bold tracking-tight">Đang quét chọn {selected.size} mã voucher</span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="flex items-center gap-2 px-5 py-2 bg-white text-[#ed2a2a] border border-[#ed2a2a]/50 rounded-xl text-sm font-bold hover:bg-[#ed2a2a] hover:text-white disabled:opacity-50 transition-colors shadow-sm active:scale-95"
          >
            <Trash2 className="w-[18px] h-[18px]" /> Xóa đã chọn
          </button>
        </div>
      )}

      {/* Container List */}
      <div className="w-full">
        {loading && vouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
             <div className="flex flex-col gap-4 w-full px-6 opacity-30">
               {[1,2,3].map(i => (
                 <div key={i} className="w-full h-16 bg-slate-200 rounded-xl animate-pulse" />
               ))}
             </div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm text-slate-400 text-center px-4">
             <div className="w-24 h-24 bg-slate-50 flex items-center justify-center rounded-full mb-4 ring-8 ring-slate-50/50">
                <Ticket className="w-10 h-10 text-slate-300" />
             </div>
             <p className="font-black text-slate-700 text-[18px] mb-1">Chưa có Chương trình Khuyến mãi nào</p>
             <p className="text-[14px] font-medium text-slate-400 mb-6 max-w-md">Hãy tạo ngay một mã giảm giá để thu hút khách hàng, kích cầu mua sắm và bứt phá doanh thu hệ thống!</p>
             <button
               onClick={() => router.push('/admin/vouchers/create')}
               className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#ed2a2a] to-[#d12525] text-white rounded-xl text-[14px] font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] transition-all hover:scale-[1.02] active:scale-95"
             >
               <Plus className="w-5 h-5" /> Thiết lập Khuyến mãi đầu tiên
             </button>
          </div>
        ) : (
          <>
            {/* ── DESKTOP: TABLE ── */}
            <div className="hidden lg:block bg-white/50 backdrop-blur-md rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
              <table className="w-full">
                <thead className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === vouchers.length}
                        onChange={toggleAll}
                        className="rounded w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a] cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Mã ưu đãi</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Giảm giá & Điều kiện</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Lượt sử dụng</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Thời gian hiệu lực</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap w-36">Trạng thái</th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap w-32">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {vouchers.map(voucher => (
                    <tr key={voucher.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(voucher.id)}
                          onChange={() => toggleSelect(voucher.id)}
                          className="rounded w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                           <p className="font-mono text-[16px] font-black tracking-[0.1em] text-[#ed2a2a]">{voucher.code}</p>
                           <span className={`px-2 py-[2px] rounded-md text-[10px] font-bold whitespace-nowrap ${TIER_STYLES[voucher.tier_restriction]}`}>
                             {TIER_LABELS[voucher.tier_restriction]}
                           </span>
                        </div>
                        <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-[200px] truncate" title={voucher.name}>{voucher.name}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#ed2a2a] text-white shadow-sm shadow-[#ed2a2a]/20">
                          {voucher.discount_label}
                        </span>
                        {voucher.min_order_amount && (
                          <div className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> 
                             Đơn từ: <strong className="text-slate-700">{fmt(voucher.min_order_amount)}</strong>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-bold text-slate-800 text-[15px]">{voucher.used_count} <span className="text-slate-400 font-medium text-xs">/ {voucher.usage_limit ?? '∞'}</span></span>
                        {voucher.remaining !== null && voucher.remaining !== undefined && voucher.remaining <= 10 && voucher.remaining > 0 && (
                          <p className="text-[11px] font-bold text-orange-600 bg-orange-100 w-fit mx-auto px-2 py-0.5 rounded-md mt-1">Sắp hết ({voucher.remaining})</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 items-start text-[12px] font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div> <span className="text-slate-400">Từ:</span> <strong className="text-slate-700">{fmtDate(voucher.start_date)}</strong></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></div> <span className="text-slate-400">Đến:</span> <strong className="text-slate-700">{fmtDate(voucher.end_date)}</strong></div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {voucher.is_valid && voucher.is_active ? (
                          <span className="inline-flex items-center justify-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm shadow-emerald-500/10">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Đang Hoạt Động
                          </span>
                        ) : !voucher.is_active ? (
                          <span className="inline-flex items-center justify-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold bg-slate-50 text-slate-500 border border-slate-200">
                             ⏸ Đang Tắt
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold bg-rose-50 text-rose-600 border border-rose-200">
                             ⚫ Hết hạn
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/vouchers/${voucher.id}`)}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-[18px] h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleToggle(voucher.id)}
                            className={`p-2 rounded-xl border transition-all active:scale-95 ${voucher.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                            title={voucher.is_active ? 'Nhấn để Tắt' : 'Nhấn để Bật'}
                          >
                            {voucher.is_active ? <Power className="w-[18px] h-[18px]" /> : <PowerOff className="w-[18px] h-[18px]" />}
                          </button>
                          <button
                            onClick={() => router.push(`/admin/vouchers/${voucher.id}/edit`)}
                            className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all active:scale-95"
                            title="Chỉnh sửa mã"
                          >
                            <Pencil className="w-[18px] h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleDelete(voucher.id)}
                            className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 transition-all active:scale-95"
                            title="Hủy mã này"
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

            {/* ── MOBILE: CARD LIST ── */}
            <div className="lg:hidden space-y-4">
                {vouchers.map(voucher => (
                  <div key={voucher.id} onClick={() => router.push(`/admin/vouchers/${voucher.id}`)} className="cursor-pointer active:scale-[0.98] transition-all relative bg-white rounded-2xl border border-slate-200 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-md overflow-hidden hover:scale-[1.01]">
                    
                    {/* Dải màu thẻ */}
                    <div className={`absolute top-0 bottom-0 left-0 w-[5px] opacity-80 ${voucher.is_valid && voucher.is_active ? 'bg-emerald-500' : (!voucher.is_active ? 'bg-slate-300' : 'bg-rose-500')}`} />
                    
                    {/* Checkbox ẩn góc */}
                    <div className="absolute top-4 right-4 z-10">
                       <input
                          type="checkbox"
                          checked={selected.has(voucher.id)}
                          onChange={() => toggleSelect(voucher.id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded w-[18px] h-[18px] text-[#ed2a2a] accent-[#ed2a2a]"
                       />
                    </div>

                    <div className="pl-2 space-y-4">
                       
                       {/* Hàng 1: Code + Badge phần trăm */}
                       <div className="flex flex-col pr-8">
                          <div className="flex items-center gap-2 mb-1.5">
                             <span className="font-mono text-xl font-black text-slate-800 tracking-[0.1em]">{voucher.code}</span>
                             {voucher.is_valid && voucher.is_active ? (
                               <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                  </span>
                                  K.Hoạt
                               </span>
                             ) : !voucher.is_active ? (
                               <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded uppercase">Vô hiệu</span>
                             ) : (
                               <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded uppercase">Hết hạn</span>
                             )}
                          </div>
                          <span className="inline-block mt-0.5 bg-[#ed2a2a] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg w-fit shadow-sm shadow-[#ed2a2a]/20">
                             🎁 {voucher.discount_label}
                          </span>
                       </div>

                       {/* Hàng 2: Tên, thông tin, số lượt */}
                       <div className="flex flex-col gap-2">
                          <p className="text-[14px] font-medium text-slate-700 leading-snug">{voucher.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${TIER_STYLES[voucher.tier_restriction]}`}>
                                {TIER_LABELS[voucher.tier_restriction]}
                             </div>
                             <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                <Users className="w-3 h-3" />
                                {voucher.used_count} / {voucher.usage_limit ?? 'Không giới hạn'}
                             </span>
                          </div>
                       </div>

                       {/* Hàng 3: Khung Thời Gian */}
                       <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5 text-[12px] font-medium text-slate-600">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-400 opacity-80" /> Bắt đầu: <strong className="text-slate-800 font-bold">{fmtDate(voucher.start_date)}</strong>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-rose-400 opacity-80" /> Kết thúc: <strong className="text-slate-800 font-bold">{fmtDate(voucher.end_date)}</strong>
                          </div>
                       </div>

                        <div className="flex items-center gap-3 pt-2">
                           <button
                             onClick={(e) => { e.stopPropagation(); handleToggle(voucher.id); }}
                             className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl border-2 text-[13px] font-bold transition-all disabled:opacity-50 active:scale-95 ${voucher.is_active ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                           >
                             {voucher.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                             {voucher.is_active ? 'Tắt' : 'Bật Mã'}
                           </button>
                           
                           <div className="flex gap-3 w-[120px] shrink-0">
                             <button
                               onClick={(e) => { e.stopPropagation(); router.push(`/admin/vouchers/${voucher.id}/edit`); }}
                               className="flex-1 flex justify-center items-center py-3 bg-blue-50 border-2 border-transparent text-blue-600 rounded-xl active:scale-95 transition-all"
                             >
                               <Pencil className="w-4 h-4" />
                             </button>
                             <button
                               onClick={(e) => { e.stopPropagation(); handleDelete(voucher.id); }}
                               className="flex-1 flex justify-center items-center py-3 bg-rose-50 border-2 border-transparent text-rose-500 rounded-xl active:scale-95 transition-all"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
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
              className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-600 disabled:opacity-40 disabled:bg-slate-50 shrink-0 active:scale-95 transition-all">Trở lại</button>
            
            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} disabled={loading}
                  className={`min-w-[45px] px-3 py-2.5 text-[14px] font-black rounded-xl transition-all shadow-sm shrink-0 active:scale-95
                    ${page === p ? 'bg-[#ed2a2a] text-white border-2 border-[#ed2a2a]' : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50'}
                  `}>
                  {p}
                </button>
              ))}

            <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
              className="px-5 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-600 disabled:opacity-40 disabled:bg-slate-50 shrink-0 active:scale-95 transition-all">Đến sau</button>
          </div>
        </div>
      )}
    </div>
  )
}
