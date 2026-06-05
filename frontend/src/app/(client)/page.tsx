'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { UtensilsCrossed, Zap, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '@/services/api'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

const CategorySection = dynamic(() => import('@/components/home/CategorySection'), {
  loading: () => <SectionSkeleton />,
})
const VoucherSection = dynamic(() => import('@/components/home/VoucherSection'), {
  loading: () => <SectionSkeleton />,
})
const PromotionSection = dynamic(() => import('@/components/home/PromotionSection'), {
  loading: () => <SectionSkeleton />,
})
const BestSellersSection = dynamic(() => import('@/components/home/BestSellersSection'), {
  loading: () => <SectionSkeleton />,
})
const ComboSection = dynamic(() => import('@/components/combos/ComboSection'), {
  loading: () => <SectionSkeleton />,
})
const BlogSection = dynamic(() => import('@/components/home/BlogSection'), {
  loading: () => <SectionSkeleton />,
})
const SocialProofSection = dynamic(() => import('@/components/home/SocialProofSection'), {
  loading: () => <SectionSkeleton />,
})
const FoodieAssistantChat = dynamic(() => import('@/components/chat/FoodieAssistantChat'), {
  ssr: false,
  loading: () => <SectionSkeleton />,
})
const MarketingModal = dynamic(() => import('@/components/marketing/MarketingModal'), {
  ssr: false,
})

const FEATURES = [
  { icon: UtensilsCrossed, label: 'Menu Đa Dạng', desc: 'Hơn 200 món ăn Á - Âu tinh tế.' },
  { icon: Zap, label: 'Giao Hàng Siêu Tốc', desc: 'Nhận món chỉ trong 30 phút nội thành.' },
  { icon: ShieldCheck, label: 'An Toàn Tuyệt Đối', desc: 'Nguyên liệu đạt chuẩn VietGAP & GlobalGAP.' },
]

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const setTableId = useCartStore((s) => s.setTableId)
  const setTableSessionToken = useCartStore((s) => s.setTableSessionToken)
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [tableModalOpen, setTableModalOpen] = useState(false)
  const [tableOptions, setTableOptions] = useState<Array<{ id: number; name: string; area?: string }>>([])
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HDG Food',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  useEffect(() => {
    if (!tableModalOpen) return
    api.get<{ data: Array<{ id: number; name: string; area?: string }> }>('/tables/available')
      .then((res) => setTableOptions(res.data.data || []))
      .catch(() => setTableOptions([]))
  }, [tableModalOpen])

  useEffect(() => {
    if (!user || user.role === 'admin') return
    const shouldOpen = window.sessionStorage.getItem('HDG_open_table_modal_after_login') === '1'
    if (!shouldOpen) return
    setServiceModalOpen(true)
    window.sessionStorage.removeItem('HDG_open_table_modal_after_login')
  }, [user])

  const handleDeferTable = () => {
    setTableModalOpen(false)
    window.sessionStorage.setItem('HDG_pending_table_selection', '1')
  }

  const handleConfirmTable = () => {
    if (!selectedTable) return
    api.post(`/tables/${selectedTable}/claim-session`)
      .then((res) => {
        const token = res.data?.data?.session_token
        setTableId(selectedTable)
        setTableSessionToken(token || null)
        window.localStorage.setItem('HDG_order_mode', 'dine_in')
        window.localStorage.setItem('HDG_table_id', String(selectedTable))
        const tableName = res.data?.data?.table?.name || tableOptions.find((t) => t.id === selectedTable)?.name
        if (tableName) window.localStorage.setItem('HDG_table_name', tableName)
        if (token) window.localStorage.setItem('HDG_table_session_token', token)
        window.sessionStorage.removeItem('HDG_pending_table_selection')
        setTableModalOpen(false)
        toast.success(`Đã chọn ${res.data?.data?.table?.name || `Bàn ${selectedTable}`}. Bạn có thể tiếp tục xem trang chủ.`)
      })
      .catch((err) => {
        alert(err?.response?.data?.message || 'Không thể chọn bàn này, vui lòng chọn bàn khác.')
      })
  }

  const handleChooseOnline = () => {
    window.localStorage.setItem('HDG_order_mode', 'online')
    window.localStorage.removeItem('HDG_table_id')
    window.localStorage.removeItem('HDG_table_name')
    window.localStorage.removeItem('HDG_table_session_token')
    window.sessionStorage.removeItem('HDG_pending_table_selection')
    setTableId(null)
    setTableSessionToken(null)
    setServiceModalOpen(false)
    setTableModalOpen(false)
    toast.success('Đã chọn Đặt online.')
  }

  const handleChooseDineIn = () => {
    window.localStorage.setItem('HDG_order_mode', 'dine_in')
    setSelectedTable(null)
    setServiceModalOpen(false)
    setTableModalOpen(true)
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      {/* Category Menu Section */}
      <CategorySection />

      {/* Voucher Section */}
      <VoucherSection />

      {/* Promotion Section */}
      <PromotionSection />

      {/* Best Sellers Section */}
      <BestSellersSection />

      {/* Foodie Assistant Chat */}
      <FoodieAssistantChat />

      {/* Combo Section */}
      <ComboSection />

      {/* News & Blog Section */}
      <BlogSection />

      {/* Social Proof (Reviews) Section */}
      <SocialProofSection />

      {/* Trust Features Bar */}
      <section className="container mx-auto px-4 py-8 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {FEATURES.map((feature, idx) => (
                <m.div 
                   key={idx}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   viewport={{ once: true }}
                   className="flex items-center gap-5 p-6 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                   <div className="w-14 h-14 bg-red-50 text-[#ed2a2a] rounded-2xl flex items-center justify-center group-hover:bg-[#ed2a2a] group-hover:text-white transition-colors duration-500">
                      <feature.icon className="w-7 h-7" />
                   </div>
                   <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">{feature.label}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-1">{feature.desc}</p>
                   </div>
                </m.div>
             ))}
          </div>
      </section>

      {/* Featured Sections (Categories) - Can be added next */}
      <section className="container mx-auto px-4 py-12 text-center">
          <m.div
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             className="inline-block px-10 py-20 bg-slate-900 rounded-[3rem] text-white w-full overflow-hidden relative"
          >
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#ed2a2a]/20 blur-[100px] rounded-full"></div>
             <div className="relative z-10">
                <h2 className="text-4xl lg:text-6xl font-black tracking-tighter mb-6">Bạn đã sẵn sàng để <br/> <span className="text-[#ed2a2a]">Tận hưởng ẩm thực?</span></h2>
                <Link
                  href="/products"
                  className="inline-block px-10 py-4 bg-[#ed2a2a] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-red-600/30"
                >
                  Đặt món ngay
                </Link>
             </div>
          </m.div>
      </section>

      {serviceModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setServiceModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Bạn muốn dùng bữa theo hình thức nào?</h3>
            <p className="mt-1 text-sm text-slate-500">Chọn để hệ thống thiết lập đúng luồng đặt món.</p>
            <div className="mt-5 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleChooseDineIn}
                className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left hover:border-[#ed2a2a] transition-colors"
              >
                <p className="text-sm font-semibold text-slate-900">Ăn tại cửa hàng</p>
                <p className="text-[11px] text-slate-500">Tiếp theo bạn sẽ chọn số bàn đang ngồi.</p>
              </button>
              <button
                type="button"
                onClick={handleChooseOnline}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 transition-colors"
              >
                <p className="text-sm font-semibold text-slate-900">Đặt online</p>
                <p className="text-[11px] text-slate-500">Bỏ qua chọn bàn, tiếp tục dùng web bình thường.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {tableModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleDeferTable} />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Bạn đang ngồi bàn số mấy?</h3>
            <p className="mt-1 text-sm text-slate-500">Chọn đúng bàn để đơn về đúng vị trí phục vụ.</p>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {tableOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTable(t.id)}
                  className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                    selectedTable === t.id
                      ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-[11px] text-slate-400">{t.area || 'Khu chung'}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeferTable}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleConfirmTable}
                disabled={!selectedTable}
                className="px-4 py-2 rounded-xl bg-[#ed2a2a] text-white text-sm font-semibold disabled:opacity-50"
              >
                Xác nhận bàn
              </button>
            </div>
          </div>
        </div>
      )}

      <MarketingModal />

      </div>
    </LazyMotion>
  )
}

function SectionSkeleton() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
    </section>
  )
}
