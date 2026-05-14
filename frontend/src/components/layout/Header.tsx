'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCartStore } from '@/store/useCartStore'
import UserMenu from './UserMenu'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight, ShoppingCart, Menu as MenuIcon } from 'lucide-react'
import LiveSearch from '@/components/search/LiveSearch'
import { menuService } from '@/services/menu.service'
import { categoryService } from '@/services/category.service'
import type { Category } from '@/types'
import MobileAuthLinks from '@/components/layout/MobileAuthLinks'

/** Khi menu không có mục con trong DB — map tên → đường dẫn mặc định */
const HEADER_FALLBACK_HREF: Record<string, string> = {
  'trang chủ': '/',
  'thực đơn': '/products',
  'sản phẩm': '/products',
  'về chúng tôi': '/about',
  'liên hệ': '/about',
  'tin tức': '/blog',
  'khuyến mãi': '/promotions',
}

function normalizeKey(name: string) {
  return name.trim().toLowerCase()
}

function fallbackHrefForMenuName(name: string): string {
  return HEADER_FALLBACK_HREF[normalizeKey(name)] ?? '/'
}

function getParentItems(menu: any): any[] {
  return menu.parent_items || menu.parentItems || []
}

function hasVisibleChildren(item: any): boolean {
  const ch = item.children || item.childrens
  return Array.isArray(ch) && ch.length > 0
}

/** Nhóm menu thực đơn (DB cũ có thể vẫn tên "Sản phẩm") — luôn dropdown + danh mục động */
function isThucDonMenuName(name: string) {
  const k = normalizeKey(name)
  return k === 'thực đơn' || k === 'sản phẩm'
}

function thucDonNavLabel(name: string) {
  return isThucDonMenuName(name) ? 'Thực đơn' : name
}

function buildThucDonDropdownItems(categories: Category[]) {
  const sorted = [...categories]
    .filter(c => c.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
  return [
    { id: 'thuc-don-all', title: 'Tất cả món ăn', url: '/products', children: [] as any[] },
    { id: 'thuc-don-combo', title: 'Combo Đặc Biệt', url: '/products?combo=1', children: [] as any[] },
    ...sorted.map(c => ({
      id: `thuc-don-cat-${c.id}`,
      title: c.name,
      url: `/products?category=${c.id}`,
      children: [] as any[],
    })),
    { id: 'thuc-don-promo', title: 'Khuyến mãi', url: '/promotions', children: [] as any[] },
  ]
}

export default function Header() {
  const pathname = usePathname()

  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [menuCategories, setMenuCategories] = useState<Category[]>([])

  const navRef = useRef<HTMLDivElement>(null)

  const getTotalItems = useCartStore(s => s.getTotalItems)
  const setCartOpen = useCartStore(s => s.setCartOpen)
  const cartCount = getTotalItems()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await menuService.getAll('header')
        if (cancelled) return
        const arr = Array.isArray(list) ? list : []
        const sorted = arr.sort(
          (a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.id - b.id
        )
        setMenus(sorted)
      } catch {
        if (!cancelled) setMenus([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await categoryService.getPublicCategories()
        if (!cancelled) setMenuCategories(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setMenuCategories([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setActiveMenu(null)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setActiveMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navBtnClass = (isActive: boolean) =>
    `group relative flex items-center gap-1 px-3 py-2 text-sm font-semibold tracking-wide rounded-xl transition-all ${
      isActive
        ? 'text-[#ed2a2a] bg-red-50/70'
        : 'text-slate-700 hover:text-[#ed2a2a] hover:bg-white/70'
    }`

  const linkNavClass = 'group relative flex items-center gap-1 px-3 py-2 text-sm font-semibold tracking-wide rounded-xl transition-all text-slate-700 hover:text-[#ed2a2a] hover:bg-white/70'

  return (
    <header className={`fixed inset-x-0 top-0 z-[100] border-b transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-white/30 shadow-[0_8px_30px_rgb(15,23,42,0.08)]' : 'bg-white/70 backdrop-blur-md border-white/20 shadow-sm'}`}>
      <div className="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">

        <div className="flex items-center gap-6">
          <button suppressHydrationWarning onClick={() => setMobileOpen(s => !s)} className="lg:hidden p-2 rounded-full hover:bg-slate-100/80" aria-label="Menu">
            <MenuIcon className="w-5 h-5 text-slate-900" />
          </button>

          <Link href="/" className="flex-shrink-0">
            <img
              src="/images/hdg-logo.png"
              alt="HDG Food"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </Link>

          <nav ref={navRef} className="hidden lg:flex items-center gap-4">
            {menus.map(menu => {
              const items = getParentItems(menu)
              const isActive = activeMenu === menu.id
              const thucDon = isThucDonMenuName(menu.name)
              const dropdownItems = thucDon ? buildThucDonDropdownItems(menuCategories) : items

              if (!thucDon && items.length === 0) {
                return (
                  <Link key={menu.id} href={fallbackHrefForMenuName(menu.name)} className={linkNavClass}>
                    {menu.name}
                    <span className="absolute -bottom-0.5 left-3 h-0.5 w-0 bg-[#ed2a2a] transition-all duration-300 group-hover:w-[calc(100%-1.5rem)]" />
                  </Link>
                )
              }

              if (!thucDon) {
                const single = items.length === 1 ? items[0] : null
                const sameLabelAsMenu =
                  single &&
                  !hasVisibleChildren(single) &&
                  normalizeKey(single.title || '') === normalizeKey(menu.name || '')
                const onlyOne = Boolean(single && sameLabelAsMenu)
                if (onlyOne) {
                  const href = single.url || fallbackHrefForMenuName(menu.name)
                  return (
                    <Link key={menu.id} href={href || '/'} className={linkNavClass}>
                      {menu.name}
                      <span className="absolute -bottom-0.5 left-3 h-0.5 w-0 bg-[#ed2a2a] transition-all duration-300 group-hover:w-[calc(100%-1.5rem)]" />
                    </Link>
                  )
                }
              }

              return (
                <div key={menu.id} className="relative">
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => setActiveMenu(isActive ? null : menu.id)}
                    className={navBtnClass(isActive)}
                  >
                    {thucDonNavLabel(menu.name)}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                    <span className={`absolute -bottom-0.5 left-3 h-0.5 bg-[#ed2a2a] transition-all duration-300 ${isActive ? 'w-[calc(100%-1.5rem)]' : 'w-0 group-hover:w-[calc(100%-1.5rem)]'}`} />
                  </button>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 min-w-[220px] max-h-[min(70vh,420px)] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50"
                      >
                        {dropdownItems.map((item: any) => (
                          <div key={item.id}>
                            <Link
                              href={item.url || '/'}
                              className="block px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-[#ed2a2a] transition-colors"
                            >
                              {item.title}
                            </Link>
                            {(item.children || []).length > 0 && (
                              <div className="border-t border-slate-50 bg-slate-50/50 py-1">
                                {(item.children || []).map((child: any) => (
                                  <Link
                                    key={child.id}
                                    href={child.url || '/'}
                                    className="flex items-center gap-2 pl-8 pr-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#ed2a2a] hover:bg-white"
                                  >
                                    <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />
                                    {child.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-2 py-1 shadow-sm">
          <LiveSearch scrolled={scrolled} />

          {/* Desktop/tablet: hiển thị nút tài khoản trên header */}
          <div className="hidden md:block">
            <UserMenu />
          </div>

          <button onClick={() => setCartOpen(true)} suppressHydrationWarning
            className="group relative rounded-full p-2 text-slate-700 transition-all hover:bg-red-50">
            <ShoppingCart className="w-5 h-5 group-hover:text-[#ed2a2a]" />
            {isMounted && cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 px-1 bg-[#ed2a2a] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200/70 bg-white/95 backdrop-blur">
          <nav className="container mx-auto max-h-[70vh] space-y-2 overflow-y-auto px-4 py-3">
            {/* Mobile: đặt Đăng nhập / Đăng ký ở đầu menu */}
            <MobileAuthLinks onNavigate={() => setMobileOpen(false)} />
            {menus.map(menu => {
              const items = getParentItems(menu)
              const expanded = activeMenu === menu.id
              const thucDon = isThucDonMenuName(menu.name)
              const dropdownItems = thucDon ? buildThucDonDropdownItems(menuCategories) : items

              if (!thucDon && items.length === 0) {
                return (
                  <Link
                    key={menu.id}
                    href={fallbackHrefForMenuName(menu.name)}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                      pathname === fallbackHrefForMenuName(menu.name)
                        ? 'bg-red-50 text-[#ed2a2a]'
                        : 'text-slate-700 hover:bg-red-50/70 hover:text-[#ed2a2a]'
                    }`}
                  >
                    {menu.name}
                  </Link>
                )
              }

              if (!thucDon) {
                const single = items.length === 1 ? items[0] : null
                const sameLabelAsMenu =
                  single &&
                  !hasVisibleChildren(single) &&
                  normalizeKey(single.title || '') === normalizeKey(menu.name || '')
                const onlyOne = Boolean(single && sameLabelAsMenu)
                if (onlyOne) {
                  const href = single.url || fallbackHrefForMenuName(menu.name)
                  return (
                    <Link
                      key={menu.id}
                      href={href || '/'}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                        pathname === (href || '/')
                          ? 'bg-red-50 text-[#ed2a2a]'
                          : 'text-slate-700 hover:bg-red-50/70 hover:text-[#ed2a2a]'
                      }`}
                    >
                      {menu.name}
                    </Link>
                  )
                }
              }

              return (
                <div key={menu.id} className="overflow-hidden rounded-xl">
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => setActiveMenu(expanded ? null : menu.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition-all ${
                      expanded
                        ? 'bg-red-50 text-[#ed2a2a]'
                        : 'text-slate-700 hover:bg-red-50/70 hover:text-[#ed2a2a]'
                    }`}
                  >
                    {thucDonNavLabel(menu.name)}
                    {dropdownItems.length > 0 && (
                      <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {expanded && dropdownItems.length > 0 && (
                    <div className="ml-3 mt-1 max-h-[50vh] space-y-1 overflow-y-auto border-l-2 border-slate-200 pb-2 pl-2">
                      {dropdownItems.map((item: any) => (
                        <div key={item.id}>
                          <Link
                            href={item.url || '/'}
                            onClick={() => setMobileOpen(false)}
                            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                              pathname === (item.url || '/')
                                ? 'bg-red-50 text-[#ed2a2a]'
                                : 'text-slate-600 hover:bg-red-50 hover:text-[#ed2a2a]'
                            }`}
                          >
                            {item.title}
                          </Link>
                          {(item.children || []).map((child: any) => (
                            <Link
                              key={child.id}
                              href={child.url || '/'}
                              onClick={() => setMobileOpen(false)}
                              className={`block rounded-lg py-1.5 pl-6 pr-3 text-xs font-medium transition-all ${
                                pathname === (child.url || '/')
                                  ? 'bg-red-50 text-[#ed2a2a]'
                                  : 'text-slate-500 hover:bg-red-50 hover:text-[#ed2a2a]'
                              }`}
                            >
                              {child.title}
                            </Link>
                          ))}
                        </div>
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
