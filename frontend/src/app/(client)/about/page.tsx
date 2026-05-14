'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Heart, Leaf, Star, Award, MapPin, Clock, Send, Mail, UserRound, Phone, MessageSquareText } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'

function useCounter(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

function CounterItem({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const count = useCounter(value, 2000, started)
  return (
    <div className="text-center">
      <div className="text-5xl font-black text-[#ed2a2a] tabular-nums">{count}{suffix}</div>
      <div className="mt-2 text-sm font-semibold uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  )
}

const TIMELINE = [
  { year: '2019', title: 'Khởi đầu khiêm tốn', desc: 'HDG Food ra đời từ một gian bếp nhỏ với ước mơ mang ẩm thực Việt thuần túy đến mọi nhà.' },
  { year: '2020', title: 'Mở rộng thực đơn', desc: 'Bổ sung hơn 100 món mới, kết hợp tinh hoa ẩm thực Á - Âu, chinh phục khẩu vị đa dạng.' },
  { year: '2022', title: 'Nền tảng số hóa', desc: 'Ra mắt ứng dụng đặt món trực tuyến, rút ngắn thời gian giao hàng xuống còn 30 phút.' },
  { year: '2024', title: 'Vươn tầm thương hiệu', desc: 'Đạt chứng nhận VietGAP, mở rộng 50+ chi nhánh toàn quốc, phục vụ hơn 1000 khách hàng mỗi ngày.' },
]

const VALUES = [
  { icon: Leaf, title: 'Tươi Ngon', desc: 'Nguyên liệu được tuyển chọn mỗi sáng từ các nông trại đạt chuẩn VietGAP & GlobalGAP.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: Heart, title: 'Sạch Sẽ', desc: 'Quy trình chế biến khép kín, đảm bảo vệ sinh an toàn thực phẩm theo tiêu chuẩn quốc tế.', color: 'text-[#ed2a2a]', bg: 'bg-red-50' },
  { icon: Star, title: 'Tận Tâm', desc: 'Đội ngũ 200+ nhân viên luôn sẵn sàng phục vụ với nụ cười và sự chân thành.', color: 'text-amber-500', bg: 'bg-amber-50' },
]

const TEAM = [
  { name: 'Nguyễn Văn An', role: 'Bếp Trưởng', exp: '15 năm kinh nghiệm', img: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop' },
  { name: 'Trần Thị Bình', role: 'Giám Đốc Điều Hành', exp: 'Sáng lập HDG Food', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop' },
  { name: 'Lê Minh Cường', role: 'Bếp Phó', exp: '10 năm kinh nghiệm', img: 'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=400&h=400&fit=crop' },
]

export default function AboutPage() {
  const counterRef = useRef<HTMLElement>(null)
  const counterInView = useInView(counterRef, { once: true, margin: '-100px' })
  const user = useAuthStore((s) => s.user)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })

  useEffect(() => {
    if (!user) return
    setContactForm((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
    }))
  }, [user])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      toast.error('Vui lòng nhập đầy đủ Họ tên, Email và Nội dung.')
      return
    }

    setSendingMessage(true)
    try {
      await api.post('/public/contacts', {
        ...contactForm,
        user_id: user?.id || null,
      })
      toast.success('Gửi tin nhắn thành công. HDG Food sẽ phản hồi sớm nhất!')
      setContactForm((prev) => ({ ...prev, message: '' }))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không gửi được tin nhắn. Vui lòng thử lại.')
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className="flex flex-col overflow-x-hidden">

      {/* HERO */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ed2a2a]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4"
        >
          <span className="text-xs uppercase tracking-[0.4em] text-slate-400 font-semibold">Since 2019</span>
          <h1 className="mt-3 text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
            Về <span className="text-[#ed2a2a]">HDG Food</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-xl mx-auto font-light leading-relaxed">
            Hành trình mang tinh hoa ẩm thực Việt đến từng bữa ăn — từ gian bếp nhỏ đến thương hiệu được yêu mến.
          </p>
          <div className="mx-auto mt-6 h-1 w-20 bg-[#ed2a2a] rounded-full" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2"
        >
          <div className="w-1 h-2 bg-white/60 rounded-full" />
        </motion.div>
      </section>

      {/* MISSION & VISION */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-10">
          {[
            { icon: Award, label: 'Sứ Mệnh', text: 'Mang đến những bữa ăn ngon, sạch và tiện lợi — nơi mỗi món ăn là một câu chuyện về văn hóa và tình yêu ẩm thực Việt Nam.' },
            { icon: MapPin, label: 'Tầm Nhìn', text: 'Trở thành thương hiệu ẩm thực Việt được yêu mến nhất tại Đông Nam Á vào năm 2030, với tiêu chuẩn chất lượng quốc tế.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex gap-6 p-8 bg-white rounded-3xl shadow-sm hover:shadow-xl transition-shadow"
            >
              <div className="shrink-0 w-14 h-14 bg-red-50 text-[#ed2a2a] rounded-2xl flex items-center justify-center">
                <item.icon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold mb-2">{item.label}</h3>
                <p className="text-slate-700 leading-relaxed font-medium">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-20 bg-slate-900 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Hành Trình</span>
            <h2 className="mt-2 text-4xl font-black text-white tracking-tighter">
              Câu Chuyện Của <span className="text-[#ed2a2a]">HDG Food</span>
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 bg-[#ed2a2a] rounded-full" />
          </motion.div>
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />
            {TIMELINE.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
                className={`relative flex items-center mb-12 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <div className={`w-[calc(50%-2rem)] ${i % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                  <div className="inline-block px-6 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                    <div className="text-[#ed2a2a] font-black text-lg">{item.year}</div>
                    <div className="text-white font-bold mt-1">{item.title}</div>
                    <div className="text-slate-400 text-sm mt-1 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#ed2a2a] rounded-full border-4 border-slate-900 z-10" />
                <div className="w-[calc(50%-2rem)]" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COUNTER */}
      <section ref={counterRef} className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Con Số Biết Nói</span>
            <h2 className="mt-2 text-4xl font-black text-slate-900 tracking-tighter">
              Uy Tín Được <span className="text-[#ed2a2a]">Chứng Minh</span>
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 bg-[#ed2a2a] rounded-full" />
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 max-w-3xl mx-auto">
            <CounterItem value={10} suffix="+" label="Năm Kinh Nghiệm" started={counterInView} />
            <CounterItem value={50} suffix="+" label="Chi Nhánh" started={counterInView} />
            <CounterItem value={200} suffix="+" label="Món Ăn" started={counterInView} />
            <CounterItem value={1000} suffix="+" label="Khách Hàng / Ngày" started={counterInView} />
          </div>
        </div>
      </section>

      {/* CORE VALUES */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Giá Trị Cốt Lõi</span>
            <h2 className="mt-2 text-4xl font-black text-slate-900 tracking-tighter">
              Điều Chúng Tôi <span className="text-[#ed2a2a]">Tin Tưởng</span>
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 bg-[#ed2a2a] rounded-full" />
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {VALUES.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${v.bg} ${v.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <v.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{v.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDER MESSAGE */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-slate-900 rounded-[2.5rem] p-10 md:p-16 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#ed2a2a]/15 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
              <div className="shrink-0 w-28 h-28 rounded-full overflow-hidden ring-4 ring-[#ed2a2a]/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop" alt="Founder" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-slate-300 text-lg leading-relaxed italic">
                  &ldquo;Mỗi món ăn chúng tôi tạo ra đều mang theo tâm huyết và tình yêu với ẩm thực Việt. HDG Food không chỉ là nơi bán đồ ăn — đó là nơi chúng tôi kể câu chuyện về quê hương qua từng hương vị.&rdquo;
                </p>
                <div className="mt-6">
                  <div className="font-black text-white text-lg" style={{ fontFamily: 'cursive' }}>Trần Thị Bình</div>
                  <div className="text-[#ed2a2a] text-sm font-semibold uppercase tracking-widest mt-1">Nhà Sáng Lập &amp; CEO</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Đội Ngũ</span>
            <h2 className="mt-2 text-4xl font-black text-slate-900 tracking-tighter">
              Những Người <span className="text-[#ed2a2a]">Tạo Nên HDG</span>
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 bg-[#ed2a2a] rounded-full" />
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {TEAM.map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group text-center"
              >
                <div className="relative w-48 h-48 mx-auto mb-5 rounded-3xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.img}
                    alt={member.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="font-black text-slate-900 text-lg">{member.name}</h3>
                <div className="text-[#ed2a2a] font-semibold text-sm mt-1">{member.role}</div>
                <div className="flex items-center justify-center gap-1 mt-2 text-slate-400 text-xs">
                  <Clock className="w-3 h-3" />
                  {member.exp}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid lg:grid-cols-5 gap-6"
        >
          <div className="lg:col-span-2 rounded-[2rem] bg-slate-900 text-white p-8 relative overflow-hidden">
            <div className="absolute -top-12 -right-10 w-56 h-56 bg-[#ed2a2a]/25 blur-[90px] rounded-full" />
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 relative z-10">Liên hệ nhanh</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight relative z-10">
              Gửi tin nhắn cho <span className="text-[#ed2a2a]">HDG Food</span>
            </h3>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed relative z-10">
              Đội ngũ quản trị luôn sẵn sàng hỗ trợ góp ý, hợp tác hoặc phản hồi trải nghiệm của bạn.
            </p>
            <div className="mt-6 space-y-3 relative z-10">
              <div className="flex items-center gap-3 text-sm text-slate-200"><Mail className="w-4 h-4 text-[#ed2a2a]" /> contact@hdgfood.vn</div>
              <div className="flex items-center gap-3 text-sm text-slate-200"><Phone className="w-4 h-4 text-[#ed2a2a]" /> 1900 6868</div>
            </div>
          </div>

          <form suppressHydrationWarning onSubmit={handleSendMessage} className="lg:col-span-3 rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><UserRound className="w-3.5 h-3.5" /> Họ tên</span>
                <input
                  suppressHydrationWarning
                  autoComplete="name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[#ed2a2a] focus:bg-white focus:ring-4 focus:ring-red-50"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
                <input
                  suppressHydrationWarning
                  autoComplete="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[#ed2a2a] focus:bg-white focus:ring-4 focus:ring-red-50"
                  placeholder="name@example.com"
                  required
                />
              </label>
            </div>

            <label className="space-y-2 mt-4 block">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Số điện thoại (tuỳ chọn)</span>
              <input
                suppressHydrationWarning
                autoComplete="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[#ed2a2a] focus:bg-white focus:ring-4 focus:ring-red-50"
                placeholder="09xxxxxxxx"
              />
            </label>

            <label className="space-y-2 mt-4 block">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><MessageSquareText className="w-3.5 h-3.5" /> Nội dung</span>
              <textarea
                suppressHydrationWarning
                autoComplete="off"
                value={contactForm.message}
                onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full min-h-[150px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all resize-y focus:border-[#ed2a2a] focus:bg-white focus:ring-4 focus:ring-red-50"
                placeholder="Bạn muốn HDG Food hỗ trợ điều gì?"
                required
              />
            </label>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">Thông tin của bạn được bảo mật và chỉ dùng để phản hồi.</p>
              <button
                suppressHydrationWarning
                type="submit"
                disabled={sendingMessage}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#ed2a2a] px-6 py-3 text-xs font-black uppercase tracking-[0.15em] text-white hover:bg-slate-900 transition-all disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {sendingMessage ? 'Đang gửi...' : 'Gửi tin nhắn'}
              </button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative bg-slate-900 rounded-[3rem] p-12 text-center overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-[#ed2a2a]/20 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
              Sẵn sàng trải nghiệm <br />
              <span className="text-[#ed2a2a]">ẩm thực HDG?</span>
            </h2>
            <p className="mt-4 text-slate-400 max-w-md mx-auto">Đặt món ngay hôm nay và cảm nhận sự khác biệt từ từng hương vị.</p>
            <a
              href="/products"
              className="inline-block mt-8 px-10 py-4 bg-[#ed2a2a] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-red-600/30"
            >
              Xem Menu Ngay
            </a>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
