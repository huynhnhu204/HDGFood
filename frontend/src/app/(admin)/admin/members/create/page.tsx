'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { userService } from '@/services/user.service'

export default function CreateMemberPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên.')
    if (!form.email.trim()) return toast.error('Vui lòng nhập email.')
    if (!form.password.trim()) return toast.error('Vui lòng nhập mật khẩu.')
    
    setSaving(true)
    try {
      await userService.create(form)
      toast.success('Đã thêm thành viên mới thành công.')
      router.push('/admin/members')
      router.refresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Có lỗi xảy ra khi tạo thành viên.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all placeholder:text-slate-400 font-sans"

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
              Thêm Khách Hàng
            </h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Tạo tài khoản thành viên mới</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="hidden sm:flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Lưu Lại
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm space-y-8">
        <div>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Thông tin cá nhân</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Họ tên khách *</label>
                    <input required type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Nguyễn Văn A" className={inputCls} />
                </div>
                <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Email tài khoản *</label>
                    <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" className={inputCls} />
                </div>
                <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Số điện thoại</label>
                    <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="09xxxxxxx" className={inputCls} />
                </div>
                <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Mật khẩu ban đầu *</label>
                    <input required type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Tối thiểu 6 ký tự" className={inputCls} />
                </div>
           </div>
        </div>

        <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Địa chỉ giao hàng</label>
            <textarea rows={3} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Số nhà, tên đường, phường/xã..." className={inputCls + " resize-none"} />
        </div>
      </div>

      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40">
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#ed2a2a] text-white rounded-2xl text-[15px] font-black shadow-[0_8px_30px_rgba(237,42,42,0.4)] active:scale-95 transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Tạo Thành Viên Mới
        </button>
      </div>
    </form>
  )
}
