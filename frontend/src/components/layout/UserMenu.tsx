'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, LogOut, Package, UserCircle, ChevronDown, 
  LogIn, UserPlus, LayoutDashboard, Heart
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { maskEmail } from '@/lib/pii'

export default function UserMenu() {
  const { user, clearAuth } = useAuthStore()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    clearAuth()
    setIsOpen(false)
    toast.success('Đã đăng xuất thành công')
    router.push('/')
  }

  /* ── LOADING STATE ── */
  if (!isMounted) {
    return (
      <div className="flex items-center gap-2 p-1.5 pl-3 pr-2.5 rounded-2xl border-2 border-transparent bg-slate-50">
        <div className="w-7 h-7 rounded-lg bg-slate-200 animate-pulse"></div>
        <div className="w-12 sm:w-16 h-4 bg-slate-200 rounded animate-pulse"></div>
      </div>
    )
  }

  /* ── GUEST STATE ── */
  if (!user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 p-1.5 pl-3 pr-2.5 rounded-2xl transition-all border-2 ${
            isOpen
              ? 'bg-[#ed2a2a] border-[#ed2a2a] text-white shadow-lg shadow-red-500/20'
              : 'bg-red-50/50 border-transparent text-[#ed2a2a] hover:bg-red-50'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            isOpen ? 'bg-white/20' : 'bg-[#ed2a2a] text-white'
          }`}>
            <User className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline text-sm font-bold">Tài khoản</span>
          <span className="sr-only">Đăng nhập</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-100 py-3 z-50 overflow-hidden"
            >
              <div className="px-5 py-3 mb-1 border-b border-slate-50">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Chào mừng bạn!</p>
                <p className="text-[13px] font-medium text-slate-500 mt-1">Đăng nhập để nhận ưu đãi</p>
              </div>
              <div className="px-2 space-y-1">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:text-[#ed2a2a] hover:bg-red-50 rounded-xl transition-all group"
                >
                  <LogIn className="w-4 h-4 text-[#ed2a2a] group-hover:scale-110 transition-transform" />
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:text-[#ed2a2a] hover:bg-red-50 rounded-xl transition-all group"
                >
                  <UserPlus className="w-4 h-4 text-[#ed2a2a] group-hover:scale-110 transition-transform" />
                  Đăng ký tài khoản
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  /* ── AUTHENTICATED STATE ── */
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 p-1.5 pl-3 pr-2.5 rounded-2xl transition-all border-2 ${
          isOpen
            ? 'bg-[#ed2a2a] border-[#ed2a2a] text-white shadow-lg shadow-red-500/20'
            : 'bg-red-50/50 border-transparent text-[#ed2a2a] hover:bg-red-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            isOpen ? 'bg-white/20' : 'bg-[#ed2a2a] text-white'
          }`}>
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-[10px] font-black uppercase tracking-widest opacity-70 leading-none mb-0.5">Xin chào</span>
            <span className="block text-sm font-black truncate max-w-[100px] leading-none">
              {user.name.split(' ').pop()}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-64 bg-white rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-100 py-3 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-3 mb-2 border-b border-slate-50 bg-slate-50/50">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Xin chào,</p>
              <h4 className="font-black text-slate-800 truncate">{user.name}</h4>
              <p className="text-[11px] font-bold text-slate-400 truncate" title={user.email}>
                {maskEmail(user.email)}
              </p>
            </div>

            <div className="px-2 space-y-0.5">
              {user.role === 'admin' && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-[#ed2a2a] hover:bg-red-50 rounded-xl transition-all group"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#ed2a2a] group-hover:scale-110 transition-transform" />
                  Quản trị hệ thống
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-[#ed2a2a] hover:bg-red-50 rounded-xl transition-all group"
              >
                <UserCircle className="w-4 h-4 text-[#ed2a2a] group-hover:scale-110 transition-transform" />
                Thông tin cá nhân
              </Link>
              <Link
                href="/profile?tab=orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-[#ed2a2a] hover:bg-red-50 rounded-xl transition-all group"
              >
                <Package className="w-4 h-4 text-[#ed2a2a] group-hover:scale-110 transition-transform" />
                Đơn hàng của tôi
              </Link>
              <Link
                href="/profile?tab=wishlist"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-[#ed2a2a] hover:bg-red-50 rounded-xl transition-all group"
              >
                <Heart className="w-4 h-4 text-[#ed2a2a] group-hover:scale-110 transition-transform" />
                Yêu thích
              </Link>

              <div className="h-px bg-slate-100 my-2 mx-4" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
              >
                <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                Đăng xuất
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
