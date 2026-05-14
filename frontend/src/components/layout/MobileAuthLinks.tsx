'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogIn, UserPlus, LogOut, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function MobileAuthLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user, clearAuth } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    clearAuth()
    toast.success('Đã đăng xuất thành công')
    onNavigate?.()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-3">
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Tài khoản</p>

        <div className="space-y-2">
          <Link
            href="/login"
            onClick={onNavigate}
            className="flex items-center gap-3 w-full rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-[#ed2a2a] hover:bg-red-100 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập
          </Link>

          <Link
            href="/register"
            onClick={onNavigate}
            className="flex items-center gap-3 w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-red-50/70 hover:text-[#ed2a2a] transition-colors border border-slate-200/60"
          >
            <UserPlus className="w-4 h-4" />
            Đăng ký tài khoản
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Xin chào</p>

      <div className="space-y-2">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-red-50/70 hover:text-[#ed2a2a] transition-colors border border-slate-200/60"
        >
          <UserCircle className="w-4 h-4" />
          Thông tin cá nhân
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-red-50/70 hover:text-red-600 transition-colors border border-slate-200/60"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </div>
  )
}

