'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Plus, Eye, Users, Pencil, Trash2 } from 'lucide-react'
import AdminTrashLink from '@/components/admin/AdminTrashLink'
import { toast } from 'sonner'
import { userService } from '@/services/user.service'
import type { User, UserTier } from '@/types'
import { TIER_LABELS, TIER_DISCOUNTS, TIER_STYLES } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const TIER_ICONS: Record<UserTier, string> = {
  regular: '👤', silver: '🥈', gold: '🥇', vip: '👑',
}

const getLoginProviderMeta = (u: User) => {
  if (u.login_provider === 'google' || u.has_google) {
    return { label: 'Google', className: 'bg-blue-50 text-blue-700 border border-blue-200' }
  }
  if (u.login_provider === 'password' || u.has_password) {
    return { label: 'Thường', className: 'bg-slate-100 text-slate-700 border border-slate-200' }
  }
  return { label: 'Không rõ', className: 'bg-amber-50 text-amber-700 border border-amber-200' }
}

/** Email hiển thị: sau đóng TK email trong DB là placeholder — dùng bản lưu để hiển thị */
const displayEmail = (u: User) => u.deleted_original_email || u.email

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MembersPage() {
  const router = useRouter()
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [tier, setTier]         = useState<UserTier | ''>('')
  const [status, setStatus]     = useState<'active' | 'inactive' | ''>('')
  const [perPage, setPerPage]   = useState(20)
  const [page, setPage]         = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal]       = useState(0)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await userService.getAll({
        search: search || undefined,
        tier: tier || undefined,
        status: status || undefined,
        per_page: perPage,
        page,
      })
      setUsers(res.data)
      setLastPage(res.meta.last_page)
      setTotal(res.meta.total)
    } catch { toast.error('Không tải được danh sách.') }
    finally { setLoading(false) }
  }, [search, tier, status, perPage, page])

  useEffect(() => { load() }, [load])

  const handleToggle = async (u: User) => {
    try {
      await userService.update(u.id, { is_active: !u.is_active })
      toast.success(u.is_active ? 'Đã khóa đăng nhập.' : 'Đã mở khóa.')
      load()
    } catch { toast.error('Cập nhật thất bại.') }
  }

  const handleDelete = async (u: User) => {
    const msg =
      `Đóng tài khoản "${u.name}"?\n\n` +
      `• Đây là xóa mềm: lịch sử đơn hàng vẫn giữ theo mã khách.\n` +
      `• Email gốc được giải phóng — khách có thể đăng ký lại bằng email đó.\n` +
      `• Khác với "Khóa": khóa chỉ chặn đăng nhập, không giải phóng email.`
    if (!confirm(msg)) return
    try {
      await userService.remove(u.id)
      toast.success('Đã đóng tài khoản (xóa mềm). Email có thể đăng ký lại.')
      load()
    } catch { toast.error('Thao tác thất bại.') }
  }

  const handleRecalc = async (u: User) => {
    try {
      const updated = await userService.recalculateTier(u.id)
      toast.success(`Tier mới: ${TIER_LABELS[updated.tier]}`)
      load()
    } catch { toast.error('Cập nhật thất bại.') }
  }

  const tierCounts = users.reduce((acc, u) => {
    acc[u.tier] = (acc[u.tier] ?? 0) + 1; return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-3xl border border-slate-100 px-6 py-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý thành viên</h1>
          <p className="text-sm text-slate-500 mt-1 font-semibold">
            Tổng {total} khách hàng trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminTrashLink trashType="member" label="TK đã đóng (tự xóa 30 ngày)" />
          <button onClick={() => router.push('/admin/members/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-black shadow-md shadow-red-200 hover:bg-red-600 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Tier stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {(['regular','silver','gold','vip'] as UserTier[]).map(t => (
          <button key={t} onClick={() => { setTier(tier === t ? '' : t); setPage(1) }}
            className={`p-4 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${tier === t ? 'border-[#ed2a2a] ring-4 ring-red-50' : 'border-slate-100 hover:border-slate-200'} ${TIER_STYLES[t]}`}>
            <p className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-300">{TIER_ICONS[t]}</p>
            <p className="font-black text-xl lg:text-2xl text-slate-800">{tierCounts[t] ?? 0}</p>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{TIER_LABELS[t]}</p>
            {TIER_DISCOUNTS[t] > 0 && <span className="absolute top-2 right-2 bg-white/40 px-2 py-0.5 rounded-full text-[10px] font-black">-{TIER_DISCOUNTS[t]}% OFF</span>}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 font-bold" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm tên, SĐT, email..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-transparent border focus:bg-white focus:border-red-400 rounded-xl text-sm font-semibold focus:outline-none transition-all" />
        </div>
        <select value={tier} onChange={(e) => { setTier(e.target.value as UserTier | ''); setPage(1) }}
          className="bg-slate-50 border-transparent border rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-red-400 focus:outline-none cursor-pointer">
          <option value="">Tất cả tier</option>
          <option value="regular">👤 Thường</option>
          <option value="silver">🥈 Silver</option>
          <option value="gold">🥇 Gold</option>
          <option value="vip">👑 VIP</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as 'active' | 'inactive' | ''); setPage(1) }}
          className="bg-slate-50 border-transparent border rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-red-400 focus:outline-none cursor-pointer"
        >
          <option value="">Trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã khóa (vẫn còn TK)</option>
        </select>
        <button onClick={load} className="p-3 bg-slate-50 border-transparent border rounded-xl hover:bg-slate-100 transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-red-500" /> 
            <span className="font-bold text-xs uppercase tracking-widest">Đang tải khách hàng...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Users className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold">Không tìm thấy thành viên nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 text-left font-black text-slate-500 uppercase text-[11px] tracking-wider min-w-[260px]">Khách hàng</th>
                    <th className="px-5 py-4 text-center font-black text-slate-500 uppercase text-[11px] tracking-wider min-w-[120px]">Tạo bằng</th>
                    <th className="px-5 py-4 text-left font-black text-slate-500 uppercase text-[11px] tracking-wider hidden md:table-cell min-w-[140px]">Liên hệ</th>
                    <th className="px-5 py-4 text-center font-black text-slate-500 uppercase text-[11px] tracking-wider min-w-[120px]">Hạng</th>
                    <th className="px-5 py-4 text-right font-black text-slate-500 uppercase text-[11px] tracking-wider hidden sm:table-cell min-w-[140px]">Tổng chi</th>
                    <th className="px-5 py-4 text-center font-black text-slate-500 uppercase text-[11px] tracking-wider hidden lg:table-cell min-w-[90px]">Đơn</th>
                    <th className="px-5 py-4 text-center font-black text-slate-500 uppercase text-[11px] tracking-wider min-w-[120px]">
                      Trạng thái
                    </th>
                    <th className="px-5 py-4 min-w-[150px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => {
                    const providerMeta = getLoginProviderMeta(u)
                    return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-red-200">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-800 text-[14px] truncate">{u.name}</p>
                            <p className="text-[11px] font-semibold text-slate-400 truncate">{displayEmail(u)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wide ${providerMeta.className}`}>
                          {providerMeta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-semibold hidden md:table-cell">{u.phone || '—'}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-tight ${TIER_STYLES[u.tier]}`}>
                          {TIER_ICONS[u.tier]} {TIER_LABELS[u.tier]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-slate-800 hidden sm:table-cell">{fmt(u.total_spent)}</td>
                      <td className="px-5 py-4 text-center text-slate-700 font-black hidden lg:table-cell">{u.total_orders}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(u)}
                          title="Khóa / mở khóa đăng nhập (không xóa dữ liệu, không giải phóng email)"
                          className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase transition-all border ${
                            u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {u.is_active ? '● Hoạt động' : '● Đã khóa'}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => router.push(`/admin/members/${u.id}`)} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300 shadow-sm transition-all active:scale-95" title="Xem chi tiết">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => router.push(`/admin/members/${u.id}/edit`)} className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 shadow-sm transition-all active:scale-95" title="Sửa">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleRecalc(u)} className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 shadow-sm transition-all active:scale-95" title="Tính lại hạng">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="p-2 rounded-xl bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 shadow-sm transition-all active:scale-95"
                            title="Đóng tài khoản (xóa mềm — giải phóng email)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
            </table>
          </div>
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => { setPage(p => p - 1); window.scrollTo(0,0) }}
            className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">← Trước</button>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">Trang {page} / {lastPage}</span>
          <button disabled={page === lastPage} onClick={() => { setPage(p => p + 1); window.scrollTo(0,0) }}
            className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">Sau →</button>
        </div>
      )}
    </div>
  )
}
