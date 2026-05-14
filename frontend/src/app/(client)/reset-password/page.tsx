'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import AuthLayout from '@/components/auth/AuthLayout'

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const email = params.get('email') || ''
  const isValidGmail = (value: string) =>
    /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(value.trim())

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const linkValid = useMemo(() => Boolean(token && email), [token, email])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!linkValid) {
      toast.error('Link đặt lại mật khẩu không hợp lệ.')
      return
    }
    if (!isValidGmail(email)) {
      toast.error('Email trong link không đúng định dạng Gmail.')
      return
    }
    if (password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự.')
      return
    }
    if (password !== passwordConfirmation) {
      toast.error('Mật khẩu xác nhận không khớp.')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      })
      setSuccess(true)
      toast.success('Đặt lại mật khẩu thành công.')
      setTimeout(() => router.replace('/login'), 1200)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể đặt lại mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8 py-4"
      >
        <div className="space-y-4">
          <Link href="/forgot-password" className="inline-flex items-center gap-2 group p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-[#ed2a2a] transition-colors" />
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">
              Quay lại quên mật khẩu
            </span>
          </Link>
          <div className="pt-2">
            <h1 className="text-4xl font-black tracking-tighter text-slate-800 leading-none mb-2">
              Đặt lại <br /> <span className="text-[#ed2a2a]">Mật khẩu mới</span>
            </h1>
            <p className="text-sm font-medium text-slate-400 break-all">{email || 'Thiếu thông tin email trong link.'}</p>
          </div>
        </div>

        {!linkValid ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-xs font-bold text-red-700 leading-relaxed">
              Link không hợp lệ hoặc thiếu token. Vui lòng yêu cầu lại từ trang quên mật khẩu.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu mới</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-4.5 bg-[#ed2a2a] text-white rounded-full text-sm font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-700 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>CẬP NHẬT MẬT KHẨU</span>}
            </button>
          </form>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
            <p className="text-xs font-bold text-emerald-700 leading-relaxed">
              Đổi mật khẩu thành công. Đang chuyển về trang đăng nhập...
            </p>
          </div>
        )}
      </motion.div>
    </AuthLayout>
  )
}
