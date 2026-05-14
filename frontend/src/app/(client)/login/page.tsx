'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import { motion } from 'framer-motion'
import AuthLayout from '@/components/auth/AuthLayout'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'

export default function LoginPage() {
  const isValidGmail = (value: string) =>
    /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(value.trim())

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Vui lòng điền đủ Email và Mật khẩu')
      return
    }
    if (!isValidGmail(email)) {
      toast.error('Vui lòng nhập Gmail hợp lệ (@gmail.com).')
      return
    }
    if (password.length < 6) {
      toast.error('Mật khẩu phải từ 6 ký tự.')
      return
    }

    setLoading(true)
    try {
      const res = await authService.login(email, password)
      const { user } = res

      toast.success(`Chào mừng ${user.name} đã trở lại!`)

      // Full navigation: cookie middleware (HDG_token_*) phải kèm request tới /admin hoặc /.
      if (user.role === 'admin') {
        window.location.assign('/admin/dashboard')
      } else {
        window.sessionStorage.setItem('HDG_open_table_modal_after_login', '1')
        window.location.assign('/')
      }
    } catch (err: any) {
      console.error("[Login] Error:", err)
      const status = err?.response?.status
      const message =
        status === 401
          ? 'Bạn đã nhập sai email hoặc mật khẩu.'
          : err?.response?.data?.message || 'Đăng nhập thất bại.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-10"
      >
        {/* Header */}
        <div className="space-y-4">
           <Link href="/" className="inline-flex items-center gap-2 group p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-[#ed2a2a] transition-colors" />
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">Quay về trang chủ</span>
           </Link>
           <div className="pt-2">
              <h1 className="text-4xl font-black tracking-tighter text-slate-800 leading-none mb-2">
                Thưởng thức <br/> <span className="text-[#ed2a2a]">Bữa ăn ngon.</span>
              </h1>
              <p className="text-sm font-medium text-slate-400">Đăng nhập để nhận ưu đãi và tích điểm HDG.</p>
           </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email / Tài khoản</label>
             <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                <input 
                  id="user-login-email"
                  name="user_email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="section-user username"
                  style={{ fontSize: '16px' }}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                />
             </div>
          </div>

          <div className="space-y-1.5">
             <div className="flex justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mật khẩu</label>
                <Link href="/forgot-password" title="Quên mật khẩu" className="text-[10px] font-black text-[#ed2a2a] hover:underline underline-offset-4">Quên mật khẩu?</Link>
             </div>
             <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                <input 
                  id="user-login-password"
                  name="user_password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="section-user current-password"
                  style={{ fontSize: '16px' }}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
             </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4.5 bg-[#ed2a2a] text-white rounded-full text-sm font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-700 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Vào ăn thôi!</span>}
          </button>
        </form>

        <div className="relative py-2">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
           <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300 tracking-[0.3em] bg-white px-6">Tài khoản khác</div>
        </div>

        <div className="space-y-3">
          <GoogleLoginButton
            onSuccess={() => {
              window.sessionStorage.setItem('HDG_open_table_modal_after_login', '1')
              window.location.assign('/')
            }}
          />
        </div>

        <div className="text-center pt-4">
           <p className="text-sm font-medium text-slate-400">
              Lần đầu đến với HDG Food?{' '}
              <Link href="/register" className="text-[#ed2a2a] font-black hover:underline decoration-2">
                 Tham gia ngay
              </Link>
           </p>
        </div>
      </motion.div>
    </AuthLayout>
  )
}
