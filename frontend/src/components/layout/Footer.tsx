'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, Mail, MapPin, Clock, 
  Facebook, Youtube, ChevronDown, 
  CreditCard, ShieldCheck, Truck, 
  HelpCircle, Info, MessageSquare
} from 'lucide-react'
import api from '@/services/api'

// Simple Zalo & TikTok Icons (SVG)
const ZaloIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 12.14c-.35.35-.74.65-1.16.9-.42.25-.87.45-1.35.6-.48.15-.97.23-1.47.23-.5 0-.99-.08-1.47-.23-.48-.15-.93-.35-1.35-.6-.42-.25-.81-.55-1.16-.9-.35-.35-.65-.74-.9-1.16-.25-.42-.45-.87-.6-1.35-.15-.48-.23-.97-.23-1.47s.08-.99.23-1.47c.15-.48.35-.93.6-1.35.25-.42.55-.81.9-1.16.35-.35.74-.65 1.16-.9.42-.25.87-.45 1.35-.6.48-.15.97-.23 1.47-.23.5 0 .99.08 1.47.23.48.15.93.35 1.35.6.42.25.81.55 1.16.9.35.35.65.74.9 1.16.25.42.45.87.6 1.35.15.48.23.97.23 1.47s-.08.99-.23 1.47c-.15.48-.35.93-.6 1.35-.25.42-.55.81-.9 1.16z" />
  </svg>
)

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.525.02c1.31 0 2.57.51 3.51 1.44.24.24.45.5.64.77 1.43-.1 2.82-.62 3.96-1.48.01.24.01.47.01.71 0 3.01-2.44 5.45-5.45 5.45-.14 0-.28-.01-.42-.02v3.31c4.54.43 8.1 4.25 8.1 8.9 0 4.94-4.01 8.95-8.95 8.95-4.94 0-8.95-4.01-8.95-8.95 0-.11 0-.21.01-.32 0-3.23 1.71-6.13 4.54-7.72V0h2.99s.01.01.01.02z" />
  </svg>
)

export default function Footer() {
  const [settings, setSettings] = useState<any>({
    phone: '1900 6750',
    address: 'Ladeco Building, 266 Doi Can, Ba Dinh, Hanoi',
    email: 'support@HDGfood.vn',
    working_hours: '08:00 - 22:00 (Hàng ngày)',
    facebook: '#',
    tiktok: '#',
    youtube: '#',
    zalo: '#'
  })
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [policyLinks, setPolicyLinks] = useState<Array<{ label: string; href: string }>>([])

  useEffect(() => {
    setMounted(true)
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    
    const cacheKey = 'HDG_footer_cache_v1'
    const cacheTtlMs = 10 * 60 * 1000

    const readCache = () => {
      try {
        const raw = window.sessionStorage.getItem(cacheKey)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed?.timestamp || Date.now() - parsed.timestamp > cacheTtlMs) return null
        return parsed
      } catch {
        return null
      }
    }

    const cached = readCache()
    if (cached) {
      if (cached.settings) setSettings((prev: any) => ({ ...prev, ...cached.settings }))
      if (Array.isArray(cached.policyLinks)) setPolicyLinks(cached.policyLinks)
    } else {
      ;(async () => {
        try {
          const [settingsRes, policiesRes] = await Promise.allSettled([
            api.get('/public/settings', { skipNetworkErrorToast: true }),
            api.get('/policies', { skipNetworkErrorToast: true }),
          ])

          let nextSettings: any = null
          let nextPolicyLinks: Array<{ label: string; href: string }> = []

          if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.data) {
            nextSettings = settingsRes.value.data.data
            setSettings((prev: any) => ({ ...prev, ...nextSettings }))
          }

          if (policiesRes.status === 'fulfilled') {
            const list = Array.isArray(policiesRes.value.data?.data) ? policiesRes.value.data.data : []
            nextPolicyLinks = list
              .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
              .map((p: any) => ({
                label: p.title,
                href: `/policy/${p.slug}`,
              }))
            setPolicyLinks(nextPolicyLinks)
          }

          window.sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              settings: nextSettings,
              policyLinks: nextPolicyLinks,
            })
          )
        } catch {
          // keep defaults silently
        }
      })()
    }

    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  const sections = [
    {
      id: 'support',
      title: 'Hỗ trợ khách hàng',
      links: [
        { label: 'Câu hỏi thường gặp (FAQ)', href: '/faq' },
        { label: 'Trung tâm hỗ trợ', href: '/contact' },
        { label: 'Khiếu nại & Góp ý', href: '/contact' },
        { label: 'Hướng dẫn bảo hành', href: '/policy/huong-dan-bao-hanh' },
        { label: 'Kiểm tra đơn hàng', href: '/order' }
      ]
    },
    {
      id: 'policies',
      title: 'Chính sách & Dịch vụ',
      links: [
        { label: 'Giới thiệu HDG Food', href: '/about' },
        ...(policyLinks.length > 0
          ? policyLinks
          : [
              { label: 'Chính sách bảo mật', href: '/policy/chinh-sach-bao-mat' },
              { label: 'Điều khoản sử dụng', href: '/policy/dieu-khoan-su-dung' },
              { label: 'Chính sách đổi trả', href: '/policy/chinh-sach-hoan-tien' },
              { label: 'Chính sách vận chuyển', href: '/policy/chinh-sach-giao-hang' },
            ]),
      ]
    }
  ]

  return (
    <footer className="bg-slate-50 border-t border-slate-100 pt-20 md:pt-24 pb-12 relative overflow-hidden">
      {/* Brand top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#ed2a2a]" />
      {/* Decorative Blob */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-50/30 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 -z-10" />
      
      <div className="container mx-auto px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6">
          
          {/* Column 1: Brand */}
          <div className="lg:col-span-4 space-y-8">
            <Link href="/" className="inline-block group">
               <h3 className="text-2xl lg:text-3xl font-black tracking-tighter">
                 HDG<span className="text-[#ed2a2a] group-hover:drop-shadow-[0_0_8px_rgba(237,42,42,0.3)] transition-all">FOOD</span>
               </h3>
            </Link>
            <p className="text-sm font-semibold text-slate-500 leading-relaxed max-w-sm">
              Sứ mệnh của HDG Food là mang đến trải nghiệm ẩm thực tinh tế, an toàn và tiện lợi nhất cho mọi gia đình Việt. Chúng tôi luôn ưu tiên nguyên liệu sạch và quy trình chế biến đạt chuẩn quốc tế.
            </p>
            <div className="flex items-center gap-4">
               {[
                 { icon: Facebook, href: settings.facebook, color: 'hover:text-blue-600' },
                 { icon: TikTokIcon, href: settings.tiktok, color: 'hover:text-black' },
                 { icon: Youtube, href: settings.youtube, color: 'hover:text-red-600' },
                 { icon: ZaloIcon, href: settings.zalo, color: 'hover:text-blue-400' }
               ].map((social, i) => (
                 <a 
                   key={i} 
                   href={social.href} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className={`w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all ${social.color} hover:bg-white hover:shadow-xl`}
                 >
                   <social.icon className="w-5 h-5" />
                 </a>
               ))}
            </div>
          </div>

          {/* Column 2 & 3: Links (Accordion on Mobile) */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-4">
            {sections.map((section) => (
              <div key={section.id} className="space-y-6">
                <button 
                  suppressHydrationWarning
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between text-left lg:pointer-events-none group"
                >
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 lg:mb-2">
                    {section.title}
                  </h4>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform lg:hidden ${openSection === section.id ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {(openSection === section.id || (mounted && isDesktop)) && (
                    <motion.ul 
                      initial={!isDesktop ? { height: 0, opacity: 0 } : false}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {section.links.map((link) => (
                        <li key={link.label}>
                          <Link 
                            href={link.href} 
                            rel="nofollow"
                            className="text-xs font-bold text-slate-400 hover:text-[#ed2a2a] transition-colors inline-block"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Column 4: Contact & Maps */}
          <div className="lg:col-span-4 space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 pb-2 border-b border-slate-50 inline-block">
               Kết nối với chúng tôi
            </h4>
            <ul className="space-y-4">
               {[
                 { icon: MapPin, text: settings.address },
                 { icon: Phone, text: settings.phone, href: `tel:${settings.phone}` },
                 { icon: Mail, text: settings.email, href: `mailto:${settings.email}` },
                 { icon: Clock, text: settings.working_hours }
               ].map((item, i) => (
                 <li key={i} className="flex items-start gap-3 group">
                   <div className="w-8 h-8 rounded-xl bg-red-50 text-[#ed2a2a] flex items-center justify-center shrink-0 group-hover:bg-[#ed2a2a] group-hover:text-white transition-colors">
                     <item.icon className="w-4 h-4" />
                   </div>
                   {item.href ? (
                     <a href={item.href} className="text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors leading-relaxed pt-1">
                       {item.text}
                     </a>
                   ) : (
                     <span className="text-xs font-bold text-slate-400 leading-relaxed pt-1">
                       {item.text}
                     </span>
                   )}
                 </li>
               ))}
            </ul>
            
            {/* Simple Map Link Placeholder */}
            <div className="rounded-[1.5rem] overflow-hidden aspect-video bg-slate-100 border border-slate-200 relative group">
               <img 
                 src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=800" 
                 alt="Store Location" 
                 loading="lazy"
                 decoding="async"
                 className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
               />
               <a 
                 href="https://goo.gl/maps/placeholder" 
                 target="_blank" 
                 className="absolute inset-0 flex items-center justify-center"
               >
                  <div className="px-5 py-2.5 bg-white shadow-2xl rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#ed2a2a] hover:text-white transition-colors">
                    <MapPin className="w-4 h-4" />
                    Xem bản đồ
                  </div>
               </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center md:text-left">
              Copyright © 2026 <span className="text-slate-900">HDG FOOD</span>. Thiết kế bởi <span className="text-[#ed2a2a]">Như (HITU)</span>. Bản quyền được bảo lưu.
           </p>
           
           <div className="flex items-center gap-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-5" />
              <img
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                alt="MoMo"
                className="h-5"
                loading="lazy"
              />
              <img src="https://vnpay.vn/wp-content/uploads/2020/07/Logo-VNPAYQR-update.png" alt="VNPAY" className="h-4" />
           </div>
        </div>

      </div>
    </footer>
  )
}
