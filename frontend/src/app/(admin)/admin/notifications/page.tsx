'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, ShoppingBag, LayoutGrid, Settings, 
  Info, Clock, Trash2, CheckCircle2,
  ChevronRight, AlertCircle, Loader2
} from 'lucide-react'
import { notificationService, type Notification } from '@/services/notification.service'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'

const TYPE_CONFIG: any = {
  order: { icon: ShoppingBag, color: 'text-green-500', bg: 'bg-green-50', label: 'Đơn hàng' },
  table: { icon: LayoutGrid, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Phòng bàn' },
  voucher: { icon: Settings, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Voucher' },
  system: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Hệ thống' }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<any>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchNotifications()
  }, [page])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const data = await notificationService.getAll(page)
      setNotifications(data.data)
      setMeta(data)
    } catch {
      toast.error('Không thể tải thông báo')
    } finally {
      setLoading(false)
    }
  }

  const handleRead = async (id: number, link?: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      if (link) router.push(link)
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái')
    }
  }

  const markAllRead = async () => {
    if (!confirm('Đánh dấu tất cả thông báo là đã đọc?')) return
    try {
      await notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('Đã cập nhật tất cả')
    } catch {
      toast.error('Thao tác thất bại')
    }
  }

  const deleteAll = async () => {
    if (!confirm('Xóa vĩnh viễn toàn bộ thông báo? Hành động này không thể hoàn tác.')) return
    try {
      await notificationService.deleteAll()
      setNotifications([])
      toast.success('Đã xóa sạch bộ nhớ thông báo')
    } catch {
      toast.error('Thao tác thất bại')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-5 lg:p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 lg:top-20 z-30">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-3">
            <Bell className="w-7 h-7 text-[#ed2a2a]" />
            Trung tâm Thông báo
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lịch sử hoạt động của hệ thống HDG Food</p>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={markAllRead}
             className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
           >
              <CheckCircle2 className="w-4 h-4" />
              Đọc tất cả
           </button>
           <button 
             onClick={deleteAll}
             className="flex items-center gap-2 px-4 py-2 bg-red-50 text-[#ed2a2a] rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
           >
              <Trash2 className="w-4 h-4" />
              Xóa sạch
           </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#ed2a2a] mb-4" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Đang truy xuất thông báo...</p>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(n => {
            const Config = TYPE_CONFIG[n.type]
            return (
              <div 
                key={n.id}
                onClick={() => handleRead(n.id, n.link)}
                className={`group relative bg-white border rounded-[2rem] p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-start gap-6 ${!n.is_read ? 'border-red-100 bg-red-50/20' : 'border-slate-100'}`}
              >
                <div className={`w-14 h-14 rounded-2xl ${Config.bg} ${Config.color} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                   <Config.icon className="w-7 h-7" />
                </div>

                <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-4 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${Config.color}`}>
                        {Config.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                      </span>
                   </div>
                   <h3 className={`text-base leading-tight mb-2 ${!n.is_read ? 'font-black text-slate-800' : 'font-bold text-slate-500'}`}>
                      {n.title}
                   </h3>
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      {n.content}
                   </p>
                </div>

                {n.link && (
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-[#ed2a2a] group-hover:bg-red-50 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}

                {!n.is_read && (
                   <div className="absolute top-6 right-6 w-3 h-3 rounded-full bg-[#ed2a2a] shadow-lg shadow-red-500/50" />
                )}
              </div>
            )
          })
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 flex flex-col items-center text-center">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 ring-8 ring-slate-50/50">
                <Bell className="w-12 h-12 text-slate-200" />
             </div>
             <h2 className="text-xl font-black text-slate-800 mb-2">Hộp thư trống</h2>
             <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto">
                Hiện tại bạn không có thông báo nào mới. Các thông báo về đơn hàng và bàn sẽ sớm xuất hiện tại đây.
             </p>
          </div>
        )}
      </div>

      {/* Pagination (Simple) */}
      {meta && meta.last_page > 1 && (
         <div className="flex items-center justify-center gap-4 py-8">
            <button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] disabled:opacity-30 transition-all"
            >
               ←
            </button>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
               Trang {page} / {meta.last_page}
            </span>
            <button 
              disabled={page === meta.last_page}
              onClick={() => setPage(page + 1)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] disabled:opacity-30 transition-all"
            >
               →
            </button>
         </div>
      )}
    </div>
  )
}
