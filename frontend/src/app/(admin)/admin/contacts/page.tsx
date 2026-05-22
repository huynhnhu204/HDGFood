'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Mail, Search, Filter, 
  ChevronRight, Clock, AlertCircle, 
  CheckCircle2, Loader2, User, Phone
} from 'lucide-react'
import { contactService, type Contact } from '@/services/contact.service'
import AdminTrashLink from '@/components/admin/AdminTrashLink'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'

export default function ContactListPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<any>(null)

  useEffect(() => {
    fetchContacts()
  }, [page, statusFilter])

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const result = await contactService.getAll({ 
        page, 
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined
      })
      setContacts(result.data)
      setMeta(result)
    } catch {
      toast.error('Không thể tải danh sách liên hệ')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchContacts()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-5 lg:p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 lg:top-20 z-30">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-3">
            <Mail className="w-7 h-7 text-[#ed2a2a]" />
            Quản lý Liên hệ
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tiếp nhận & Xử lý phản hồi từ khách hàng</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <AdminTrashLink href="/admin/trash" label="Thùng rác hệ thống" />
        <form onSubmit={handleSearch} className="flex items-center gap-2">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ed2a2a] transition-colors" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm tên, email, sđt..."
                className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-red-50 focus:border-[#ed2a2a] transition-all w-[240px]"
              />
           </div>
           <button type="submit" className="px-5 py-3 bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all">
              Tìm
           </button>
        </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2 px-2">
         {['all', 'pending', 'processed'].map(s => (
            <button 
               key={s}
               onClick={() => { setStatusFilter(s); setPage(1); }}
               className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                 statusFilter === s ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
               }`}
            >
               {s === 'all' ? 'Tất cả' : s === 'pending' ? 'Chờ xử lý' : 'Đã xử lý'}
            </button>
         ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#ed2a2a] mb-4" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Đang tải danh sách...</p>
        </div>
      ) : contacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {/* Desktop Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50 border-b border-slate-200 rounded-t-[2rem] text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <div className="col-span-3">Khách hàng</div>
             <div className="col-span-5">Thông điệp</div>
             <div className="col-span-2">Ngày gửi</div>
             <div className="col-span-2 text-right">Trạng thái</div>
          </div>

          <div className="space-y-4">
            {contacts.map(c => (
              <div 
                key={c.id}
                onClick={() => router.push(`/admin/contacts/${c.id}`)}
                className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Customer Info */}
                  <div className="col-span-3 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-[#ed2a2a] transition-all shrink-0">
                        <User className="w-6 h-6" />
                     </div>
                     <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-800 truncate">{c.name}</h3>
                        <p className="text-[11px] font-medium text-slate-400 truncate">{c.email}</p>
                     </div>
                  </div>

                  {/* Message Preview */}
                  <div className="col-span-5">
                     {c.subject && (
                       <p className="text-[10px] font-black uppercase tracking-widest text-[#ed2a2a] mb-1">
                         {c.subject}
                       </p>
                     )}
                     <p className="text-[13px] text-slate-500 font-medium line-clamp-2 leading-relaxed break-words">
                        {c.message}
                     </p>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                     <Clock className="w-3.5 h-3.5" />
                     {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-2 text-right">
                     <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                       c.status === 'pending' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-green-50 text-green-500 border-green-100'
                     }`}>
                        {c.status === 'pending' ? 'Chờ xử lý' : 'Đã xử lý'}
                     </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 flex flex-col items-center text-center">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 ring-8 ring-slate-50/50">
              <Mail className="w-12 h-12 text-slate-200" />
           </div>
           <h2 className="text-xl font-black text-slate-800 mb-2">Không tìm thấy yêu cầu nào</h2>
           <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto text-pretty">
              Hộp thư liên hệ của bạn đang trống hoặc dữ liệu tìm kiếm không khớp.
           </p>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
         <div className="flex items-center justify-center gap-4 py-8">
            <button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] disabled:opacity-30 transition-all shadow-sm"
            >
               ←
            </button>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
               Trang {page} / {meta.last_page}
            </span>
            <button 
              disabled={page === meta.last_page}
              onClick={() => setPage(page + 1)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] disabled:opacity-30 transition-all shadow-sm"
            >
               →
            </button>
         </div>
      )}
    </div>
  )
}
