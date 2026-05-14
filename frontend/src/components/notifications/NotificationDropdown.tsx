'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Bell, Check, X, ShoppingBag, 
  LayoutGrid, Settings, Info,
  ExternalLink, Trash2, CheckCircle,
  Clock
} from 'lucide-react'
import { notificationService, type Notification } from '@/services/notification.service'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import useSound from 'use-sound'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/common/Skeleton'
import { ChevronRight } from 'lucide-react'

const TYPE_CONFIG: any = {
  order: { icon: ShoppingBag, color: 'text-green-500', bg: 'bg-green-50' },
  table: { icon: LayoutGrid, color: 'text-amber-500', bg: 'bg-amber-50' },
  voucher: { icon: Settings, color: 'text-blue-500', bg: 'bg-blue-50' },
  system: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50' }
}

export default function NotificationDropdown() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [play] = useSound('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') // Âm thanh Ting nhẹ
  const dropdownRef = useRef<HTMLDivElement>(null)
  const unreadCountRef = useRef(0)

  const fetchNotifs = async (isFirstLoad = false) => {
    // NHIỆM VỤ 1: Kiểm tra Auth trước khi gọi API (Sử dụng chung logic với api.ts)
    let token = null
    try {
      const raw = localStorage.getItem('HDG-auth-storage')
      token = raw ? JSON.parse(raw)?.state?.token : null
    } catch (e) {
      console.error("[Notification] Error parsing auth token:", e)
    }

    if (!token) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    if (isFirstLoad) setLoading(true)
    
    try {
      // Gọi song song để tối ưu tốc độ
      const [count, latest] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getLatest()
      ])

      if (!isFirstLoad && count > unreadCountRef.current) {
        play()
      }

      unreadCountRef.current = count || 0
      setNotifications(latest || [])
      setUnreadCount(count || 0)
    } catch (err: any) {
      // Nếu là lỗi 401 thì im lặng (api.ts đã xử lý redirect)
      if (err?.response?.status === 401) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      if (err?.message !== 'Network Error') {
        console.error(' [Notification] Chi tiết lỗi:', err)
      }
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifs(true)
    const timer = setInterval(() => fetchNotifs(false), 15000) // 15s check 1 lần
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownRef])

  const handleRead = async (id: number, link?: string) => {
    await notificationService.markAsRead(id)
    setUnreadCount(prev => Math.max(0, prev - 1))
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setIsOpen(false)
    if (link) router.push(link)
  }

  const markAllRead = async () => {
    await notificationService.markAllAsRead()
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 relative hover:bg-slate-200 transition-all active:scale-95"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ed2a2a] text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce-short">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[350px] bg-white rounded-[2rem] border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Thông báo</h3>
               <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Bạn có {unreadCount} thông báo chưa đọc</p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] font-black text-[#ed2a2a] uppercase tracking-widest hover:underline underline-offset-4">
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
             {loading ? (
                // NHIỆM VỤ 2: Skeleton Loading
                <div className="p-4 space-y-4">
                   {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-4">
                         <Skeleton className="w-10 h-10 rounded-xl" />
                         <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-full rounded-md" />
                         </div>
                      </div>
                   ))}
                </div>
             ) : notifications.length > 0 ? (
                notifications.map(n => {
                  const Config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => handleRead(n.id, n.link)}
                      className={`p-4 flex gap-4 cursor-pointer hover:bg-slate-50 transition-all ${!n.is_read ? 'bg-red-50/10' : ''}`}
                    >
                       <div className={`w-10 h-10 rounded-xl ${Config.bg} ${Config.color} flex items-center justify-center shrink-0`}>
                          <Config.icon className="w-5 h-5" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-tight mb-1 ${!n.is_read ? 'font-black text-slate-800' : 'font-medium text-slate-500'}`}>
                             {n.title}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium truncate mb-1.5">{n.content}</p>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                             <Clock className="w-3 h-3" />
                             {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                          </p>
                       </div>
                       {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#ed2a2a] mt-2 shrink-0" />}
                    </div>
                  )
                })
             ) : (
                <div className="py-20 flex flex-col items-center justify-center opacity-30">
                   <Bell className="w-10 h-10 mb-4" />
                   <p className="text-xs font-black uppercase tracking-widest text-center px-6">Bạn không có thông báo mới nào.</p>
                </div>
             )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100">
             <Link 
               href="/admin/notifications"
               onClick={() => setIsOpen(false)}
               className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-[#ed2a2a] hover:border-[#ed2a2a] transition-all active:scale-95"
             >
                Xem tất cả thông báo
                <ChevronRight className="w-4 h-4" />
             </Link>
          </div>
        </div>
      )}
    </div>
  )
}

