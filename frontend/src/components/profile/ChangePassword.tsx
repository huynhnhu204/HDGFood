'use client'

import { useState } from 'react'
import { Lock, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { profileService } from '@/services/profile.service'

export default function ChangePassword() {
  const [saving, setSaving] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [form, setForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.current_password) return toast.error('Vui lòng nhập mật khẩu hiện tại')
    if (!form.password) return toast.error('Vui lòng nhập mật khẩu mới')
    if (form.password.length < 6) return toast.error('Mật khẩu mới phải có ít nhất 6 ký tự')
    if (form.password !== form.password_confirmation) return toast.error('Mật khẩu xác nhận không khớp')

    setSaving(true)
    try {
      const res = await profileService.changePassword(form)
      toast.success(res.message || 'Đổi mật khẩu thành công')
      setForm({ current_password: '', password: '', password_confirmation: '' })
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message
      toast.error(serverMsg || 'Đổi mật khẩu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-slate-100">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#ed2a2a]" />
          </div>
          Đổi Mật Khẩu
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1 ml-[52px]">
          Đảm bảo tài khoản luôn được bảo mật
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6 max-w-lg">
        {/* Current Password */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">
            Mật khẩu hiện tại <span className="text-[#ed2a2a]">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={form.current_password}
              onChange={e => handleChange('current_password', e.target.value)}
              placeholder="Nhập mật khẩu hiện tại..."
              className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">
            Mật khẩu mới <span className="text-[#ed2a2a]">*</span>
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={form.password}
              onChange={e => handleChange('password', e.target.value)}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
              className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.password && form.password.length < 6 && (
            <p className="text-[12px] text-orange-500 font-medium">Tối thiểu 6 ký tự</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">
            Xác nhận mật khẩu mới <span className="text-[#ed2a2a]">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={form.password_confirmation}
              onChange={e => handleChange('password_confirmation', e.target.value)}
              placeholder="Nhập lại mật khẩu mới..."
              className={`w-full px-4 py-3 pr-12 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                form.password_confirmation && form.password !== form.password_confirmation
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-[#ed2a2a] focus:ring-[#ed2a2a]/20'
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.password_confirmation && form.password !== form.password_confirmation && (
            <p className="text-[12px] text-red-500 font-medium">Mật khẩu xác nhận không khớp</p>
          )}
          {form.password_confirmation && form.password === form.password_confirmation && form.password.length >= 6 && (
            <p className="text-[12px] text-emerald-500 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Mật khẩu khớp
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            Đổi Mật Khẩu
          </button>
        </div>
      </form>
    </div>
  )
}
