'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LogOut, Menu, X, Search, Bell, User
} from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import ClientOnly from '@/components/ClientOnly'
import NotificationDropdown from '@/components/notifications/NotificationDropdown'
import api from '@/services/api'
import Sidebar from '@/components/admin/Sidebar'
import { MotionConfig } from 'framer-motion'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)

  // Đóng sidebar khi đổi trang trên mobile
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (pathname === '/admin/login') return

    const fetchPending = async () => {
      try {
        const res = await api.get('/admin/orders', { params: { status: 'pending', page: 1, per_page: 1 } })
        setPendingOrdersCount(Number(res.data?.meta?.total || 0))
      } catch {}
    }
    fetchPending()
    const t = window.setInterval(fetchPending, 20000)
    return () => window.clearInterval(t)
  }, [pathname])

  const handleLogout = async () => {
    await authService.logout()
    toast.success('Đã đăng xuất.')
    router.push('/admin/login')
  }

  // Nếu là trang LOGIN của Admin thì không hiện Sidebar/Layout của Admin dashboard
  if (pathname === '/admin/login') {
    return <MotionConfig reducedMotion="always">{children}</MotionConfig>
  }

  return (
    <MotionConfig reducedMotion="always">
      <ClientOnly>
        <div className="admin-root min-h-screen bg-[#f9fafb] flex font-lexend">
        
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`
            fixed top-0 left-0 z-50 h-screen w-64 bg-white flex flex-col border-r border-slate-100
            transform transition-all duration-500 ease-[0.22,1,0.36,1]
            lg:translate-x-0
            ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/20' : '-translate-x-full'}
          `}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-20 px-6 shrink-0">
            <Link href="/admin/dashboard" className="flex items-center group">
              <img
                src="/images/hdg-logo.png"
                alt="HDG Food"
                className="h-16 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <button 
              className="lg:hidden text-slate-400 hover:text-[#ed2a2a] p-2 rounded-xl bg-slate-50 transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Sidebar pathname={pathname} pendingOrdersCount={pendingOrdersCount} />

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100 shrink-0">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:bg-slate-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
            >
              <LogOut className="w-5 h-5 shrink-0" /> 
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 relative">
          
          {/* Top Header */}
          <header className={`
            fixed top-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 
            transition-all h-16 flex items-center px-4 lg:px-6 justify-between
            ${'w-full lg:w-[calc(100%-16rem)]'}
          `}>
             <div className="flex items-center gap-4 flex-1">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#ed2a2a] transition-all"
                >
                  <Menu className="w-5 h-5" />
                </button>
                
                {/* Search Bar */}
                <div className="hidden md:flex items-center max-w-md w-full relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ed2a2a] transition-colors" />
                   <input 
                      placeholder="Tìm kiếm nhanh..." 
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-[#ed2a2a] focus:bg-white transition-all"
                   />
                </div>
             </div>

             <div className="flex items-center gap-3 lg:gap-6">
                {/* Notification */}
                <NotificationDropdown />

                <div className="hidden sm:block w-px h-6 bg-slate-200" />

                {/* Profile */}
                <div className="flex items-center gap-3 rounded-full bg-slate-50 border border-slate-200 px-2 py-1.5 cursor-pointer group transition-all hover:bg-white hover:border-slate-300">
                   <div className="hidden xl:block text-right pr-1">
                      <p className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider leading-none">Admin HDG</p>
                      <p className="text-[9px] font-light text-slate-500 mt-1 uppercase tracking-tight">Super Admin</p>
                   </div>
                   <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-500 border border-slate-200 group-hover:border-[#ed2a2a] group-hover:text-[#ed2a2a] transition-all relative">
                      <User className="w-4 h-4" />
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                   </div>
                </div>
             </div>
          </header>

          <main className="flex-1 p-3 lg:p-6 mt-16">
            {children}
          </main>

        </div>
        </div>
      </ClientOnly>
    </MotionConfig>
  )
}
