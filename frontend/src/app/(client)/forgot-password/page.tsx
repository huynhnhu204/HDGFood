'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mail, Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { authService } from '@/services/auth.service'
import AuthLayout from '@/components/auth/AuthLayout'

export default function ForgotPasswordPage() {
  const isValidGmail = (value: string) =>
    /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(value.trim())

  const router = useRouter()
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'link' | 'otp'>('link')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Vui lòng nhập email.')
      return
    }
    if (!isValidGmail(email)) {
      toast.error('Vui lòng nhập Gmail hợp lệ (@gmail.com).')
      return
    }

    setLoading(true)
    try {
      if (mode === 'link') {
        await authService.forgotPassword(email)
        setSent(true)
        toast.success('Đã gửi link đặt lại mật khẩu.')
      } else {
        await authService.forgotPasswordOtp(email)
        setOtpSent(true)
        toast.success('Đã gửi OTP qua email.')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gửi yêu cầu khôi phục.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetWithOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !otp || !password || !passwordConfirmation) {
      toast.error('Vui lòng nhập đầy đủ thông tin.')
      return
    }
    if (!isValidGmail(email)) {
      toast.error('Vui lòng nhập Gmail hợp lệ (@gmail.com).')
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
      await authService.resetPasswordWithOtp({
        email,
        otp,
        password,
        password_confirmation: passwordConfirmation,
      })
      setSent(true)
      toast.success('Đặt lại mật khẩu thành công.')
      setTimeout(() => router.replace('/login'), 1200)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể đặt lại mật khẩu bằng OTP.')
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
          <Link href="/login" className="inline-flex items-center gap-2 group p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-[#ed2a2a] transition-colors" />
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">
              Quay lại đăng nhập
            </span>
          </Link>
          <div className="pt-2">
            <h1 className="text-4xl font-black tracking-tighter text-slate-800 leading-none mb-2">
              Khôi phục <br /> <span className="text-[#ed2a2a]">Tài khoản</span>
            </h1>
            <p className="text-sm font-medium text-slate-400">
              Chọn cách khôi phục: nhận link hoặc OTP qua email.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => { setMode('link'); setOtpSent(false); setSent(false) }}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${mode === 'link' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Link Email
          </button>
          <button
            type="button"
            onClick={() => { setMode('otp'); setSent(false) }}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${mode === 'otp' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            OTP Email
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email đăng ký</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{ fontSize: '16px' }}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4.5 bg-[#ed2a2a] text-white rounded-full text-sm font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-700 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{mode === 'link' ? 'GỬI LINK KHÔI PHỤC' : 'GỬI MÃ OTP'}</span>}
          </button>
        </form>

        {mode === 'otp' && otpSent && !sent && (
          <form onSubmit={handleResetWithOtp} className="space-y-3 border border-slate-200 rounded-2xl p-4 bg-slate-50">
            <p className="text-xs font-bold text-slate-600">Nhập OTP và mật khẩu mới</p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Mã OTP 6 số"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu mới"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Xác nhận mật khẩu mới"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition"
            >
              Xác nhận OTP và đổi mật khẩu
            </button>
          </form>
        )}

        {sent && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
            <p className="text-xs font-bold text-emerald-700 leading-relaxed">
              {mode === 'link'
                ? 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email đặt lại mật khẩu trong ít phút.'
                : 'Đổi mật khẩu thành công. Đang chuyển về trang đăng nhập...'}
            </p>
          </div>
        )}

        {!sent && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5" />
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Kiểm tra cả thư mục spam nếu bạn chưa thấy email.
            </p>
          </div>
        )}
      </motion.div>
    </AuthLayout>
  )
}
