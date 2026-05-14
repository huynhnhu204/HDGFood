'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, Send, Clock, Facebook, Instagram, PhoneCall, MessageSquareText } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const SUBJECT_OPTIONS = [
  { value: 'Góp ý', label: 'Góp ý' },
  { value: 'Khiếu nại', label: 'Khiếu nại' },
  { value: 'Đặt tiệc', label: 'Đặt tiệc' },
  { value: 'Hợp tác', label: 'Hợp tác' },
]

export default function ContactPage() {
  const user = useAuthStore((s) => s.user)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'Góp ý',
    message: '',
  })

  useEffect(() => {
    if (!user) return
    setForm((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
    }))
  }, [user])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc.')
      return
    }
    setSending(true)
    try {
      await api.post('/public/contacts', {
        ...form,
        user_id: user?.id ?? null,
      })
      toast.success('Gửi liên hệ thành công! HDG FOOD sẽ phản hồi trong 24h.')
      setForm((prev) => ({ ...prev, message: '' }))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không gửi được liên hệ. Vui lòng thử lại.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-24 lg:mt-28 pb-20">
      <section className="container mx-auto px-4 mb-10">
        <div className="rounded-[2.5rem] bg-slate-900 text-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full bg-[#ed2a2a]/30 blur-[100px]" />
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 relative z-10">HDG FOOD</p>
          <h1 className="relative z-10 mt-2 text-4xl lg:text-5xl font-black tracking-tighter">
            Lien he & Ho tro khach hang
          </h1>
          <p className="relative z-10 mt-3 text-slate-300 max-w-2xl">
            HDG FOOD luon san sang tiep nhan gop y, khieu nai va yeu cau dat tiec. Chung toi phan hoi toi da trong 24 gio.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 grid grid-cols-1 xl:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="xl:col-span-2 space-y-6"
        >
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Thong tin lien he</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ed2a2a] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Dia chi</p>
                  <p className="text-sm font-semibold text-slate-700">Ladeco Building, 266 Doi Can, Ba Dinh, Hanoi</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ed2a2a] flex items-center justify-center shrink-0 animate-pulse">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Hotline</p>
                  <a href="tel:19006750" className="text-sm font-black text-[#ed2a2a] hover:underline">1900 6750</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ed2a2a] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Email ho tro</p>
                  <a href="mailto:support@HDGfood.vn" className="text-sm font-semibold text-slate-700 hover:text-[#ed2a2a]">support@HDGfood.vn</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ed2a2a] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Gio hoat dong</p>
                  <p className="text-sm font-semibold text-slate-700">08:00 - 22:00 (Hang ngay)</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Mang xa hoi</p>
              <div className="flex items-center gap-3">
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#ed2a2a]"><Facebook className="w-4 h-4" /></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#ed2a2a]"><Instagram className="w-4 h-4" /></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#ed2a2a]"><MessageSquareText className="w-4 h-4" /></a>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm h-[330px] bg-slate-100">
            <iframe
              title="HDG Food Map"
              src="https://maps.google.com/maps?q=Ladeco%20Building%20266%20Doi%20Can%20Ba%20Dinh%20Ha%20Noi&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full grayscale contrast-125"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onSubmit={submit}
          className="xl:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8"
        >
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-5">Gui loi nhan cho HDG FOOD</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ho ten *" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50" required />
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="So dien thoai" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50" />
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email *" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50" required />
            <select value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50">
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <textarea
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            placeholder="Noi dung lien he *"
            className="mt-4 w-full min-h-[170px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 resize-y"
            required
          />

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400">Thong tin cua ban duoc bao mat va chi su dung de phan hoi lien he.</p>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#ed2a2a] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-100 hover:bg-red-600 transition-all disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Dang gui...' : 'Gui lien he'}
            </button>
          </div>
        </motion.form>
      </section>
    </div>
  )
}
