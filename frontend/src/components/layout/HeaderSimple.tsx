'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCartStore } from '@/store/useCartStore'
import UserMenu from './UserMenu'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ShoppingCart, Menu as MenuIcon } from 'lucide-react'
import LiveSearch from '@/components/search/LiveSearch'

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '')

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()

  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [menus, setMenus] = useState<any[]>([])

  const navRef = useRef<HTMLDivElement>(null)

  // Cart
  const getTotalItems = useCartStore(s => s.getTotalItems)
  const setCartOpen = useCartStore(s => s.setCartOpen)
  const cartCount = getTotalItems()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  // Scroll
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => { setScrolled(window.scrollY > 8); ticking = false })
        ticking = true
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fetch menus
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/menus?position=header&status=1`)
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        const sorted = list
          .filter((m: any) => m.status === 1)
          .sort((a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.id - b.id)
        setMenus(sorted)
      } catch {}
    })()
  }, [])

  // Close on route change
  useEffect(() => {
    setActiveMenu(null)
    setMobileOpen(false)
  }, [pathname])

  // Click outside nav
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setActiveMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-md' : 'bg-white/78 backdrop-blur-lg'}`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <button suppressHydrationWarning onClick={() => setMobileOpen(s => !s)} className="lg:hidden p-2 rounded-lg hover:bg-black/10" aria-label="Menu">
            <MenuIcon className="w-5 h-5 text-slate-900" />
          </button>

          <Link href="/" className="flex-shrink-0">
            <img
              src="/images/hdg-logo.png"
              alt="HDG Food"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-1">
            {menus.map(menu => {
              const items = menu.parent_items || menu.parentItems || []
              const isActive = activeMenu === menu.id
              return (
                <div key={menu.id} className="relative">
                  <button
                    suppressHydrationWarning
                    onClick={() => {
                      if (items.length > 0) setActiveMenu(isActive ? null : menu.id)
                      else router.push('/')
                    }}
                    className={`flex items-center gap-1 px-4 py-2 text-sm font-bold uppercase tracking-widest rounded-full border-2 transition-all ${
                      isActive
                        ? 'text-[#ed2a2a] border-red-100 bg-red-50'
                        : 'text-slate-700 border-transparent hover:text-[#ed2a2a] hover:bg-red-50/70'
                    }`}
                  >
                    {menu.name}
                    {items.length > 0 && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActive ? 'rotate-180' : ''}`} />}
                  </button>

                  <AnimatePresence>
                    {isActive && items.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 min-w-[200px] bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50"
                      >
                        {items.map((item: any) => (
                          <Link
                            key={item.id}
                            href={item.url || '/'}
                            className="block px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-[#ed2a2a] transition-colors"
                          >
                            {item.title}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Right: Search + Cart + User */}
        <div className="flex items-center gap-4">

          {/* Live Search */}
          <div className="hidden md:block flex-1 max-w-md">
            <LiveSearch />
          </div>

          {/* Cart */}
          <button onClick={() => setCartOpen(true)} suppressHydrationWarning
            className="relative p-2 rounded-lg text-slate-700 hover:bg-red-50/70">
            <ShoppingCart className="w-5 h-5" />
            {isMounted && cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 px-1 bg-[#ed2a2a] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          <UserMenu />
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-black/60 backdrop-blur">
          <nav className="container mx-auto px-4 py-3 space-y-1">
            {menus.map(menu => {
              const items = menu.parent_items || menu.parentItems || []
              return (
                <div key={menu.id}>
                  <button suppressHydrationWarning onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-white hover:bg-white/10 text-sm font-semibold">
                    {menu.name}
                    {items.length > 0 && <ChevronDown className={`w-4 h-4 transition-transform ${activeMenu === menu.id ? 'rotate-180' : ''}`} />}
                  </button>
                  {activeMenu === menu.id && items.length > 0 && (
                    <div className="pl-4 space-y-1">
                      {items.map((item: any) => (
                        <Link key={item.id} href={item.url || '/'} className="block px-3 py-2 text-sm text-white/80 hover:text-white">
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
