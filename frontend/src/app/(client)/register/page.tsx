'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Eye, EyeOff, Loader2, Lock, Mail, User, Phone, 
  ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, UserPlus
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import AuthLayout from '@/components/auth/AuthLayout'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'

const registerSchema = z.object({
  name: z.string().min(2, 'Họ tên phải ít nhất 2 ký tự'),
  email: z.string().email('Email không đúng định dạng'),
  phone: z.string().regex(/^(03|05|07|08|09|01[2|6|8|9])([0-9]{8})$/, 'Số điện thoại Việt Nam không hợp lệ'),
  password: z.string()
    .min(8, 'Mật khẩu phải từ 8 ký tự')
    .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
  password_confirmation: z.string()
}).refine((data) => data.password === data.password_confirmation, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["password_confirmation"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched'
  })

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    try {
      await authService.register(data)
      toast.success('Đăng ký thành công!')
      // Full navigation để cookie middleware có trên request tới /profile (router.push dễ bị đẩy về /login).
      window.location.assign('/profile')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="space-y-3">
           <Link href="/login" className="inline-flex items-center gap-2 group -ml-2 p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-[#ed2a2a] transition-colors" />
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">Quay lại đăng nhập</span>
           </Link>
           <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-800 leading-tight mb-1.5">
                Bắt đầu <br /> <span className="text-[#ed2a2a]">Hành trình</span> ngon miệng.
              </h1>
              <p className="text-sm font-medium text-slate-400">Đăng ký để nhận ưu đãi và tích điểm HDG.</p>
           </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Họ tên */}
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
             <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                <input 
                  {...register('name')}
                  placeholder="Nguyễn Văn A"
                  style={{ fontSize: '16px' }}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                />
             </div>
             {errors.name && <span className="text-[10px] font-bold text-[#ed2a2a] ml-2 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
               <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                  <input 
                    {...register('email')}
                    type="email"
                    placeholder="name@example.com"
                    style={{ fontSize: '16px' }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                  />
               </div>
               {errors.email && <span className="text-[10px] font-bold text-[#ed2a2a] ml-2 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.email.message}</span>}
            </div>

            {/* SĐT */}
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
               <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                  <input 
                    {...register('phone')}
                    placeholder="09xx xxx xxx"
                    style={{ fontSize: '16px' }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                  />
               </div>
               {errors.phone && <span className="text-[10px] font-bold text-[#ed2a2a] ml-2 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.phone.message}</span>}
            </div>
          </div>

          {/* Mật khẩu */}
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
             <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                <input 
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
             </div>
             {errors.password && <span className="text-[10px] font-bold text-[#ed2a2a] ml-2 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.password.message}</span>}
          </div>

          {/* Confirm Mật khẩu */}
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
             <div className="relative group">
                <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#ed2a2a] transition-all" />
                <input 
                  {...register('password_confirmation')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 transition-all font-medium text-slate-700"
                />
             </div>
             {errors.password_confirmation && <span className="text-[10px] font-bold text-[#ed2a2a] ml-2 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.password_confirmation.message}</span>}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden py-3.5 bg-gradient-to-r from-[#ff4d4d] via-[#ed2a2a] to-[#c81e1e] text-white rounded-full text-sm font-black uppercase tracking-widest shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-12 group-hover:translate-x-full transition-transform duration-700 ease-out" />
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4 transition-transform group-hover:-rotate-12" />
                <span>Tham gia ngay!</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
           <p className="text-sm font-medium text-slate-400">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-[#ed2a2a] font-black hover:underline decoration-2">
                 Đăng nhập ngay
              </Link>
           </p>
        </div>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300 tracking-[0.3em] bg-white px-6">Hoặc đăng ký với</div>
        </div>

        <div className="space-y-3">
          <GoogleLoginButton onSuccess={() => window.location.assign('/profile')} label="Đăng ký với Google" />
        </div>
      </motion.div>
    </AuthLayout>
  )
}
