'use client'

import { useState, useEffect } from 'react'
import { 
  Star, MessageSquare, Trash2, Eye, 
  CheckCircle, XCircle, Clock, Search,
  TrendingUp, TrendingDown, Filter,
  Reply, MoreVertical, LayoutGrid, List as ListIcon,
  MessageCircle, StarHalf, AlertCircle, RefreshCw, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { reviewService } from '@/services/review.service'
import AdminTrashLink from '@/components/admin/AdminTrashLink'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

/* ── Types ──────────────────────────────────────────────────────────── */

interface AdminReview {
  id: number
  rating: number
  content: string
  images: string[]
  is_approved: boolean
  reply: string | null
  created_at: string
  user: { name: string; avatar: string | null } | null
  product: { name: string; image: string | null }
}

interface ReportData {
  stats: {
    total_reviews: number
    pending_approval: number
    average_all: number
  }
  low_performers: any[]
}

/* ────────────────────────────────────────────────────────────────────── */
/*                        ADMIN REVIEW MANAGEMENT                        */
/* ────────────────────────────────────────────────────────────────────── */

export default function ReviewManagementPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<ReportData | null>(null)
  
  // Filters
  const [status, setStatus] = useState<'all' | 'pending' | 'approved'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Modals
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isReplying, setIsReplying] = useState(false)

  /* ── Load Data ── */
  const fetchData = async () => {
    setLoading(true)
    try {
      const [res, reportRes] = await Promise.all([
        reviewService.getAll({ status: status === 'all' ? undefined : status, search, page }),
        reviewService.getReport()
      ])
      setReviews(res.data)
      setMeta(res)
      setReport(reportRes)
    } catch (err) {
      toast.error('Không thể tải danh sách đánh giá.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [status, page]) // Trigger on status/page change. Search uses manual button or debounced?

  const handleToggle = async (r: AdminReview) => {
    try {
      const res = await reviewService.toggleApproval(r.id)
      toast.success(res.message)
      setReviews(prev => prev.map(item => item.id === r.id ? { ...item, is_approved: res.is_approved } : item))
      // Update stats
      reviewService.getReport().then(setReport)
    } catch {
      toast.error('Có lỗi xảy ra.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return
    try {
      await reviewService.remove(id)
      toast.success('Đã xóa đánh giá.')
      setReviews(prev => prev.filter(r => r.id !== id))
    } catch {
      toast.error('Không thể xóa.')
    }
  }

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) return
    setIsReplying(true)
    try {
      await reviewService.submitReply(selectedReview.id, replyText)
      toast.success('Đã gửi phản hồi.')
      setReviews(prev => prev.map(r => r.id === selectedReview.id ? { ...r, reply: replyText } : r))
      setSelectedReview(prev => prev ? { ...prev, reply: replyText } : null)
      setReplyText('')
    } catch {
      toast.error('Lỗi khi gửi phản hồi.')
    } finally {
      setIsReplying(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Quản lý Đánh giá
            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-[#ed2a2a] text-[10px] font-black uppercase tracking-widest border border-red-100">
              Moderation
            </span>
          </h1>
          <p className="text-[13px] font-medium text-slate-400 mt-1">Duyệt, phản hồi và theo dõi chất lượng món ăn</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminTrashLink trashType="review" />
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard 
          label="Tổng đánh giá" value={report?.stats.total_reviews || 0} 
          icon={<MessageCircle className="w-5 h-5 text-blue-500" />} 
          color="blue"
        />
        <StatCard 
          label="Chờ phê duyệt" value={report?.stats.pending_approval || 0} 
          icon={<Clock className="w-5 h-5 text-amber-500" />} 
          color="amber"
          highlight={report && report.stats.pending_approval > 0}
        />
        <StatCard 
          label="Rating trung bình" value={report?.stats.average_all || 0} 
          icon={<StarHalf className="w-5 h-5 text-indigo-500" />} 
          color="indigo"
          sub="Toàn sàn"
        />
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden shadow-sm">
        
        {/* Actions Bar */}
        <div className="p-5 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4 bg-slate-50/30">
           <div className="flex items-center gap-2">
              <FilterTab active={status === 'all'} onClick={() => setStatus('all')}>Tất cả</FilterTab>
              <FilterTab active={status === 'pending'} onClick={() => setStatus('pending')} isWarning={report && report.stats.pending_approval > 0}>
                Chờ duyệt
              </FilterTab>
              <FilterTab active={status === 'approved'} onClick={() => setStatus('approved')}>Đã duyệt</FilterTab>
           </div>
           
           <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && fetchData()}
                 placeholder="Tìm theo sản phẩm, khách hàng..." 
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:border-[#ed2a2a] outline-none transition-all"
              />
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
               <tr className="text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Sản phẩm</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Nội dung</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {loading ? [1,2,3,4,5].map(i => <TableRowSkeleton key={i} />) : reviews.length === 0 ? (
                  <tr>
                     <td colSpan={6} className="px-6 py-16 text-center">
                        <p className="text-sm font-bold text-slate-400">Chưa có đánh giá nào hoặc không khớp bộ lọc.</p>
                        <p className="text-xs text-slate-300 mt-1">Thử đổi tab hoặc bấm Làm mới.</p>
                     </td>
                  </tr>
               ) : reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                              <img src={r.product.image || '/placeholder.png'} className="w-full h-full object-cover" />
                           </div>
                           <span className="text-[13px] font-bold text-slate-700 truncate max-w-[150px]">{r.product.name}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-[13px] font-bold text-slate-900">{r.user?.name || 'Khách vãng lai'}</span>
                           <span className="text-[10px] font-medium text-slate-400">{format(new Date(r.created_at), 'HH:mm dd/MM', { locale: vi })}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                           <span className="text-[13px] font-black text-slate-900">{r.rating}</span>
                           <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </div>
                     </td>
                     <td className="px-6 py-4 max-w-[250px]">
                        <p className="text-[13px] font-medium text-slate-500 truncate">{r.content || '(Không có nội dung)'}</p>
                     </td>
                     <td className="px-6 py-4">
                        <StatusBadge approved={r.is_approved} />
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                           <ActionBtn icon={<Eye />} color="blue" onClick={() => setSelectedReview(r)} />
                           <ActionBtn 
                             icon={r.is_approved ? <XCircle /> : <CheckCircle />} 
                             color={r.is_approved ? "red" : "emerald"} 
                             onClick={() => handleToggle(r)} 
                           />
                           <ActionBtn icon={<Trash2 />} color="slate" onClick={() => handleDelete(r.id)} />
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="p-5 bg-slate-50/20 border-t border-slate-50 flex items-center justify-between">
           <p className="text-xs font-bold text-slate-400">Hiển thị {(page - 1) * 20 + 1}-{Math.min(page * 20, meta?.total || 0)} trong {meta?.total || 0} kết quả</p>
           <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black disabled:opacity-50">Trước</button>
              <button disabled={!meta?.next_page_url} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black disabled:opacity-50">Sau</button>
           </div>
        </div>
      </div>

      {/* Detail & Reply Modal */}
      <AnimatePresence>
         {selectedReview && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedReview(null)}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]" 
                onClick={e => e.stopPropagation()}
              >
                 {/* Modal Header */}
                 <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Chi tiết đánh giá</h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">Sản phẩm: {selectedReview.product.name}</p>
                    </div>
                    <StatusBadge approved={selectedReview.is_approved} />
                 </div>

                 {/* Modal Body */}
                 <div className="p-8 overflow-y-auto space-y-8 flex-1">
                    
                    {/* Review Info */}
                    <div className="flex gap-6">
                       <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-indigo-100">
                          {selectedReview.user?.avatar ? <img src={selectedReview.user.avatar} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-indigo-400" />}
                       </div>
                       <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                             <span className="text-sm font-black text-slate-900">{selectedReview.user?.name || 'Khách vãng lai'}</span>
                             <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= selectedReview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-100'}`} />)}
                             </div>
                          </div>
                          <p className="text-[14px] font-medium text-slate-600 italic leading-relaxed">"{selectedReview.content || '(Không có nội dung)'}"</p>
                       </div>
                    </div>

                    {/* Photos */}
                    {selectedReview.images?.length > 0 && (
                       <div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Hình ảnh thực tế</p>
                          <div className="flex flex-wrap gap-2.5">
                             {selectedReview.images.map((url, i) => (
                                <img key={i} src={url} className="w-24 h-24 rounded-2xl object-cover border border-slate-200" />
                             ))}
                          </div>
                       </div>
                    )}

                    {/* Reply Section */}
                    <div className="pt-6 border-t border-slate-100">
                       <p className="text-[11px] font-black text-[#ed2a2a] uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Reply className="w-4 h-4" /> Phản hồi từ Quản trị viên
                       </p>
                       
                       {selectedReview.reply ? (
                          <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 text-sm font-medium text-slate-700 leading-relaxed relative">
                             {selectedReview.reply}
                             <button onClick={() => { setReplyText(selectedReview.reply!); setSelectedReview(prev => prev ? { ...prev, reply: null } : null) }} className="absolute top-4 right-4 text-[10px] font-black text-blue-500 uppercase">Chỉnh sửa</button>
                          </div>
                       ) : (
                          <div className="space-y-4">
                             <textarea 
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Viết phản hồi hoặc lời cảm ơn tới khách hàng..."
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] outline-none transition-all h-32 resize-none"
                             />
                             <button 
                                onClick={handleReply}
                                disabled={isReplying || !replyText.trim()}
                                className="px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
                             >
                                {isReplying ? 'Đang gửi...' : 'Gửi phản hồi'}
                             </button>
                          </div>
                       )}
                    </div>
                 </div>

                 {/* Modal Footer */}
                 <div className="p-6 bg-slate-50/50 text-center border-t border-slate-100">
                    <button onClick={() => setSelectedReview(null)} className="text-xs font-black uppercase text-slate-400 hover:text-slate-900 transition-colors">Đóng</button>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

    </div>
  )
}

/* ── UI Components ── */

function StatCard({ label, value, icon, color, highlight, sub }: any) {
  const colors: any = { blue: 'bg-blue-50', amber: 'bg-amber-50', indigo: 'bg-indigo-50' }
  return (
    <div className={`bg-white p-6 rounded-[2rem] border ${highlight ? 'border-amber-200 ring-4 ring-amber-50' : 'border-slate-200/80'} shadow-sm transition-all`}>
       <div className={`w-10 h-10 rounded-2xl ${colors[color]} flex items-center justify-center mb-4`}>{icon}</div>
       <div className="flex items-baseline gap-2">
          <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
          {sub && <span className="text-[10px] font-bold text-slate-400 uppercase">{sub}</span>}
       </div>
       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

function FilterTab({ children, active, onClick, isWarning }: any) {
   return (
      <button 
        onClick={onClick}
        className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${
           active 
           ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
           : 'text-slate-400 hover:bg-slate-100'
        }`}
      >
         {children}
         {isWarning && !active && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ed2a2a] rounded-full border-2 border-white ring-2 ring-red-100 animate-pulse" />}
      </button>
   )
}

function StatusBadge({ approved }: { approved: boolean }) {
   return approved ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 rounded-full">
         <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
         Đã duyệt
      </span>
   ) : (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100 rounded-full">
         <Clock className="w-3 h-3" />
         Chờ duyệt
      </span>
   )
}

function ActionBtn({ icon, color, onClick }: any) {
   const colors: any = { 
     blue: 'text-blue-500 bg-blue-50 hover:bg-blue-100', 
     red: 'text-red-500 bg-red-50 hover:bg-red-100',
     emerald: 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100',
     slate: 'text-slate-400 bg-slate-50 hover:bg-slate-200'
   }
   return (
      <button onClick={onClick} className={`p-2.5 rounded-xl transition-all ${colors[color]}`}>
         {cloneWithProps(icon, { size: 16 })}
      </button>
   )
}

function cloneWithProps(element: React.ReactElement, props: any) {
  return React.cloneElement(element, props)
}

import React from 'react'

function TableRowSkeleton() {
   return (
      <tr>
         <td className="px-6 py-4"><div className="flex gap-3"><Skeleton className="w-10 h-10 rounded-xl"/><Skeleton className="w-32 h-4 self-center"/></div></td>
         <td className="px-6 py-4 space-y-2"><Skeleton className="w-24 h-4"/><Skeleton className="w-16 h-3"/></td>
         <td className="px-6 py-4"><Skeleton className="w-8 h-4"/></td>
         <td className="px-6 py-4"><Skeleton className="w-48 h-4"/></td>
         <td className="px-6 py-4"><Skeleton className="w-24 h-6 rounded-full"/></td>
         <td className="px-6 py-4"><div className="flex justify-end gap-1"><Skeleton className="w-9 h-9 rounded-xl"/><Skeleton className="w-9 h-9 rounded-xl"/></div></td>
      </tr>
   )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-slate-100 animate-pulse ${className}`} />
}

function User({ ...props }) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
