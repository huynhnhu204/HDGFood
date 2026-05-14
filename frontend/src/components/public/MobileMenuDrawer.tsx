'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu as MenuIcon, X, ChevronDown, Smartphone } from 'lucide-react'
import type { Menu, MenuItem } from '@/types'
import { menuService } from '@/services/menu.service'

/**
 * RECURSIVE MOBILE MENU ITEM
 */
function MobileMenuItem({ item }: { item: MenuItem }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  return (
    <div className="border-b border-slate-100 last:border-none">
      <div className="flex items-center justify-between">
        <Link 
          href={item.url || '#'} 
          className="flex-1 py-4 text-[15px] font-bold text-slate-700 hover:text-[#ed2a2a] transition-colors"
        >
          {item.title}
        </Link>
        {hasChildren && (
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-3 text-slate-400 hover:text-[#ed2a2a] transition-colors active:scale-95"
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#ed2a2a]' : ''}`} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pb-2 border-l-2 border-slate-100 ml-2 space-y-1">
              {item.children!.map((child) => (
                <MobileMenuItem key={child.id} item={child} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * MOBILE DRAWER COMPONENT
 */
export default function MobileMenuDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [menu, setMenu] = useState<Menu | null>(null)

  useEffect(() => {
    // Load Mobile Menu (giả định gọi vị trí mobile)
    menuService.getAll('mobile').then(menus => {
      if (menus.length > 0) {
        // Lấy full chi tiết menu đầu tiên của vị trí mobile
        menuService.getById(menus[0].id).then(res => {
          // Xây dựng cây (Build Tree) từ mảng phẳng
          const buildTree = (items: MenuItem[], parentId: number | string | null = null): MenuItem[] => {
            return items
              .filter(i => i.parent_id === parentId)
              .sort((a,b) => a.sort_order - b.sort_order)
              .map(i => ({ ...i, children: buildTree(items, i.id) }))
          }
          setMenu({ ...res.menu, items: buildTree(res.items as MenuItem[]) })
        })
      }
    })
  }, [])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen])

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all outline-none"
      >
        <MenuIcon className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm lg:hidden pointer-events-auto"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%', transition: { type: 'tween', duration: 0.3 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 z-[101] w-[300px] max-w-[85vw] bg-white shadow-2xl flex flex-col lg:hidden pointer-events-auto"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#ed2a2a]" />
                  <span className="font-black text-slate-800 tracking-tight text-lg">Menu</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {menu?.items?.length ? (
                  <div className="flex flex-col">
                    {menu.items.map(item => <MobileMenuItem key={item.id} item={item} />)}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-10 font-medium text-sm">
                    Đang tải Menu hoặc chưa có dữ liệu...
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
