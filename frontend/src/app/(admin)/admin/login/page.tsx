'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { motion } from 'framer-motion'

export default function AdminLoginPage() {
  const user = useAuthStore((s) => s.user)
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Redirect nếu đã đăng nhập và là admin
  useEffect(() => {
    if (mounted && user) {
      if (user.role === 'admin') window.location.assign('/admin/dashboard')
    }
  }, [mounted, user])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin quản trị')
      return
    }

    setLoading(true)
    try {
      const res = await authService.loginAdmin(email, password)
      const { user } = res

      // NHIỆM VỤ 3: Kiểm tra Role Admin
      if (user.role !== 'admin') {
         toast.error('Lỗi xác thực quyền hạn!', {
            description: 'Bạn không có quyền truy cập vào khu vực quản trị!',
         })
         // Nếu không phải admin, clear session vừa login nhầm
         useAuthStore.getState().clearAuth()
         return
      }

      toast.success('Xác thực thành công!', {
         description: `Chào mừng Admin ${user.name} trở lại hệ thống.`,
      })
      window.location.assign('/admin/dashboard')
    } catch (err: any) {
      const status = err?.response?.status
      const serverMessage = err?.response?.data?.message
      const message =
        status === 401 && !serverMessage
          ? 'Bạn đã nhập sai email hoặc mật khẩu.'
          : serverMessage || 'Đăng nhập Admin thất bại'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Tech background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(237,42,42,0.1),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.05),transparent_40%)]"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[440px] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
      >
        {/* Glow behind logo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#ed2a2a]/20 blur-3xl opacity-50 rounded-full"></div>

        <div className="text-center space-y-3 mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ed2a2a] text-white rounded-2xl shadow-xl mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
               <ShieldCheck className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none">
              HDG FOOD <span className="text-[#ed2a2a]">ADMIN</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Hệ thống quản trị tập trung</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-6" autoComplete="on">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Xác thực Email</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 transition-colors group-focus-within:text-[#ed2a2a]" />
              <input 
                id="admin-login-email"
                name="admin_email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@HDGfood.vn"
                autoComplete="section-admin username"
                className="w-full pl-14 pr-4 py-4.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-500/10 transition-all text-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mật khẩu bảo mật</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 transition-colors group-focus-within:text-[#ed2a2a]" />
              <input 
                id="admin-login-password"
                name="admin_password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="section-admin current-password"
                className="w-full pl-14 pr-12 py-4.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-500/10 transition-all text-white font-medium"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-[#ed2a2a] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-red-600/20 hover:bg-red-700 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4 group"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xác thực...</span>
              </div>
            ) : (
              <>
                <span>Truy cập Dashboard</span> 
                <ShieldCheck className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </button>
        </form>

        <div className="mt-12 text-center">
           <p className="text-slate-600 text-[9px] font-black uppercase tracking-widest leading-relaxed">
             Security Level: Highly Protected 
             <br/>
             © {new Date().getFullYear()} HDG Food Team
           </p>
        </div>
      </motion.div>
    </div>
  )
}
