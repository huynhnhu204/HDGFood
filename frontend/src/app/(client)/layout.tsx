'use client'

import dynamic from 'next/dynamic'
import Header from '@/components/layout/Header'

const BannerSlider = dynamic(() => import('@/components/home/BannerSlider'), {
  loading: () => (
    <div className="container mx-auto px-4 mt-20 mb-10" aria-hidden>
      <div className="h-[250px] w-full animate-pulse rounded-[2rem] bg-slate-100 lg:h-[450px]" />
    </div>
  ),
  ssr: false,
})
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { Banner } from '@/types'
import { useCartStore } from '@/store/useCartStore'
import { toast } from 'sonner'
import { MotionConfig } from 'framer-motion'

const Footer = dynamic(() => import('@/components/layout/Footer'), { loading: () => null })
const CartSidebar = dynamic(() => import('@/components/cart/CartSidebar'), { ssr: false, loading: () => null })

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const setTableId = useCartStore((s) => s.setTableId)
  const setTableSessionToken = useCartStore((s) => s.setTableSessionToken)
  const tableId = useCartStore((s) => s.tableId)
  const clearCart = useCartStore((s) => s.clearCart)
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/')

  const resolveBannerPosition = (): Banner['position'] => {
    if (pathname === '/') return 'slider'
    if (pathname.startsWith('/products')) return 'products'
    if (pathname.startsWith('/combos')) return 'combos'
    if (pathname.startsWith('/promotions')) return 'promotions'
    if (pathname.startsWith('/blog')) return 'blog'
    if (pathname.startsWith('/about')) return 'about'
    if (pathname.startsWith('/contact')) return 'contact'
    if (pathname.startsWith('/gioi-thieu')) return 'about'
    if (pathname.startsWith('/lien-he')) return 'contact'
    if (pathname.startsWith('/khuyen-mai')) return 'promotions'
    return 'slider'
  }

  useEffect(() => {
    const tableFromPath = pathname.match(/^\/table\/(\d+)$/)?.[1]
    const tableFromQuery = new URLSearchParams(window.location.search).get('table_id')
    const tableRaw = tableFromPath || tableFromQuery
    if (tableRaw) {
      const parsed = Number(tableRaw)
      if (Number.isFinite(parsed) && parsed > 0) {
        setTableId(parsed)
        const token = window.localStorage.getItem('HDG_table_session_token')
        if (token) setTableSessionToken(token)
        window.localStorage.setItem('HDG_table_id', String(parsed))
      }
      return
    }
    const saved = Number(window.localStorage.getItem('HDG_table_id') || '')
    if (Number.isFinite(saved) && saved > 0) {
      setTableId(saved)
      const token = window.localStorage.getItem('HDG_table_session_token')
      if (token) setTableSessionToken(token)
    }
  }, [pathname, setTableId, setTableSessionToken])

  useEffect(() => {
    if (!tableId) return
    const baseApi = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
    const timer = window.setInterval(async () => {
      if (document.hidden) return
      try {
        const res = await fetch(`${baseApi}/tables/${tableId}/status`)
        const json = await res.json()
        if (json?.data?.status === 'available') {
          clearCart()
          setTableId(null)
          setTableSessionToken(null)
          window.localStorage.removeItem('HDG_table_id')
          window.localStorage.removeItem('HDG_table_session_token')
          toast.success('Phiên bàn đã kết thúc. Vui lòng chọn bàn mới.')
        }
      } catch {
        // silent
      }
    }, 45000)

    return () => window.clearInterval(timer)
  }, [tableId, clearCart, setTableId, setTableSessionToken])

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col min-h-screen bg-slate-50/30">
        <Header />
        <main className="flex-1 overflow-x-hidden">
          {!isAuthPage && <BannerSlider position={resolveBannerPosition()} />}
          <div className={isAuthPage ? '' : 'mx-auto w-full max-w-[90rem] px-2 md:px-4'}>
            {children}
          </div>
        </main>
        
        <CartSidebar />
        <Footer />
      </div>
    </MotionConfig>
  )
}
