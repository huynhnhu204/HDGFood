'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Mail, ArrowLeft, Clock, User, Phone, 
  CheckCircle2, AlertCircle, Loader2, Send,
  MessageSquare, StickyNote, Inbox
} from 'lucide-react'
import { contactService, type Contact } from '@/services/contact.service'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'

export default function ContactDetailPage() {
  const router = useRouter()
  const { id } = useParams()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [adminNote, setAdminNote] = useState('')

  useEffect(() => {
    fetchContact()
  }, [id])

  const fetchContact = async () => {
    try {
      const data = await contactService.getById(Number(id))
      setContact(data)
      setAdminNote(data.admin_note || '')
    } catch {
      toast.error('Không thể tìm thấy liên hệ')
      router.push('/admin/contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    setUpdating(true)
    try {
      await contactService.updateStatus(Number(id), { 
        status: 'processed', 
        admin_note: adminNote 
      })
      toast.success('Đã đánh dấu xử lý hoàn tất')
      fetchContact()
    } catch {
      toast.error('Cập nhật thất bại')
    } finally {
      setUpdating(false)
    }
  }

  if (loading || !contact) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#ed2a2a] mb-4" />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Đang tải chi tiết...</p>
      </div>
    )
  }

  const isComplaint = /khiếu nại|không ngon|chậm|tệ|kém|lâu/i.test(contact.message)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-5 rounded-[2rem] shadow-sm flex items-center justify-between gap-4 sticky top-0 lg:top-20 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin/contacts')} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-slate-800">Chi tiết Liên hệ</h1>
        </div>

        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
           contact.status === 'pending' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-green-50 text-green-500 border-green-100'
        }`}>
           {contact.status === 'pending' ? 'Đang chờ xử lý' : 'Đã xử lý hoàn tất'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Main Content Card */}
        <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 border border-slate-200 shadow-sm space-y-10 overflow-hidden">
           
           {/* Section 1: Customer Info Header */}
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                    <User className="w-10 h-10" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 mb-1">{contact.name}</h2>
                    <p className="text-sm font-bold text-[#ed2a2a] flex items-center gap-2 mb-2">
                       <Mail className="w-4 h-4" /> {contact.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                       <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {contact.phone || 'Chưa cung cấp'}</span>
                       <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(contact.created_at), 'HH:mm - dd/MM/yyyy')}</span>
                    </div>
                 </div>
              </div>

              <a 
                href={`mailto:${contact.email}?subject=HDG Food - Phản hồi liên hệ&body=Kính chào ${contact.name},`}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-black transition-all active:scale-95"
              >
                 <Send className="w-4 h-4" /> Phản hồi qua Email
              </a>
           </div>

           {/* Priority Alert (Bonus) */}
           {isComplaint && contact.status === 'pending' && (
              <div className="bg-red-50 border-2 border-red-500/20 rounded-3xl p-6 flex items-start gap-5 animate-pulse-slow">
                 <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30">
                    <AlertCircle className="w-7 h-7" />
                 </div>
                 <div>
                    <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Cảnh báo Ưu tiên Cao 🔥</p>
                    <p className="text-[13px] font-bold text-red-500/80 leading-relaxed">
                       Chúng tôi phát hiện những từ khóa tiêu cực trong thông điệp này. Hãy xử lý ngay để giữ gìn uy tín thương hiệu!
                    </p>
                 </div>
              </div>
           )}

           {/* Section 2: Message Content */}
           <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                   <MessageSquare className="w-4 h-4" />
                </div>
                <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Nội dung lời nhắn</h2>
              </div>

              {contact.subject && (
                <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#ed2a2a]">
                  Chủ đề: {contact.subject}
                </div>
              )}
              
              <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 relative group overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Mail className="w-32 h-32" />
                 </div>
                 <div className="text-lg font-medium text-slate-700 leading-relaxed break-words whitespace-pre-wrap relative z-10">
                    {contact.message}
                 </div>
              </div>
           </div>

           {/* Section 3: Admin Processing */}
           <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                   <StickyNote className="w-4 h-4" />
                </div>
                <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Ghi chú xử lý (Nội bộ)</h2>
              </div>

              <textarea 
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Nhân viên điền ghi chú xử lý vào đây (ví dụ: Đã gọi điện xin lỗi khách)..."
                disabled={contact.status === 'processed'}
                className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-red-100 focus:border-[#ed2a2a] transition-all resize-none disabled:bg-white disabled:border-slate-100 disabled:opacity-70"
              />

              {contact.status === 'pending' ? (
                <button 
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-[#ed2a2a] text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                  Xác nhận đã xử lý
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 p-6 rounded-[2rem] flex items-center justify-center gap-4 text-green-600">
                   <CheckCircle2 className="w-6 h-6" />
                   <span className="text-sm font-black uppercase tracking-widest">Đã xử lý hoàn tất</span>
                </div>
              )}
           </div>

        </div>

        {/* Footer info */}
        <div className="flex flex-col items-center justify-center py-6 text-slate-300">
           <Inbox className="w-8 h-8 mb-2 opacity-20" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">Hệ thống chăm sóc khách hàng HDG Food</p>
        </div>
      </div>
    </div>
  )
}
