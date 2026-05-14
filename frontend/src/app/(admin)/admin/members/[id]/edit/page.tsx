'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Users, RefreshCcw, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import { userService } from '@/services/user.service'
import type { UserTier } from '@/types'
import { TIER_LABELS, TIER_DISCOUNTS, TIER_STYLES } from '@/types'

const TIER_ICONS: Record<UserTier, string> = {
  regular: '👤', silver: '🥈', gold: '🥇', vip: '👑',
}

export default function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const memberId = Number(resolvedParams.id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    tier: 'regular' as UserTier,
    is_active: true,
  })

  useEffect(() => {
    userService.getById(memberId)
      .then(u => {
        if (u.deleted_at) {
          toast.info('Tài khoản đã đóng — khôi phục trước khi sửa.')
          router.replace(`/admin/members/${memberId}`)
          return
        }
        setForm({
          name: u.name,
          phone: u.phone ?? '',
          address: u.address ?? '',
          tier: u.tier,
          is_active: u.is_active,
        })
        setLoading(false)
      })
      .catch(() => {
        toast.error('Không tìm thấy thành viên.')
        router.push('/admin/members')
      })
  }, [memberId, router])

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên.')
    
    setSaving(true)
    try {
      await userService.update(memberId, form)
      toast.success('Đã cập nhật thông tin thành viên.')
      router.push('/admin/members')
    } catch {
      toast.error('Có lỗi xảy ra khi cập nhật.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all placeholder:text-slate-400 font-sans"

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <RefreshCcw className="w-10 h-10 text-slate-300 animate-spin" />
      <p className="mt-4 text-slate-400 font-bold tracking-widest uppercase text-xs">Đang tải dữ liệu...</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-24 lg:pb-10">
      {/* Action Bar (Sticky Top) */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#ed2a2a]" />
              Sửa Thành Viên
            </h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Cập nhật hồ sơ khách hàng</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="hidden sm:flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Cập Nhật
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm space-y-8">
        <div>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">Thông tin liên hệ</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Họ tên khách *</label>
                    <input required type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Nguyễn Văn A" className={inputCls} />
                </div>
                <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Số điện thoại</label>
                    <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="09xxxxxxx" className={inputCls} />
                </div>
           </div>
           <div className="mt-6 space-y-2">
               <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Địa chỉ giao hàng</label>
               <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Số nhà, tên đường..." className={inputCls + " resize-none"} />
            </div>
        </div>

        <div className="border-t pt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Hạng thành viên</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['regular','silver','gold','vip'] as UserTier[]).map(t => {
                const active = form.tier === t
                return (
                    <button key={t} type="button" onClick={() => set('tier', t)}
                    className={`flex flex-col items-center gap-2 p-4 border-2 rounded-2xl transition-all ${active ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a] shadow-md shadow-red-100' : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                        <span className="text-2xl">{TIER_ICONS[t]}</span>
                        <div className="text-center">
                            <p className={`text-[13px] font-bold ${active ? 'text-[#ed2a2a]' : 'text-slate-600'}`}>{TIER_LABELS[t]}</p>
                            <p className="text-[10px] font-medium opacity-80">{TIER_DISCOUNTS[t] > 0 ? `-${TIER_DISCOUNTS[t]}%` : 'Không ưu đãi'}</p>
                        </div>
                    </button>
                )
                })}
            </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-[14px] font-bold text-slate-800 tracking-tight">{form.is_active ? 'Đang Hoạt Động' : 'Tài Khoản Đang Vô Hiệu'}</p>
                   <p className="text-xs text-slate-500 font-medium">Bật để cho phép người dùng đặt hàng</p>
                </div>
            </div>
            <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.is_active ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40">
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#ed2a2a] text-white rounded-2xl text-[15px] font-black shadow-[0_8px_30px_rgba(237,42,42,0.4)] active:scale-95 transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Lưu Cập Nhật
        </button>
      </div>
    </form>
  )
}
