'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, ShoppingBag, Package, Tag, Warehouse, Users, Percent, Ticket,
  BookOpen, FileText, Settings, Image as ImageIcon, ListTree, LayoutGrid, Mail, MessageSquare, Sparkles, Shield, Gift, Workflow, Trash2
} from 'lucide-react'

interface SidebarProps {
  pathname: string
  pendingOrdersCount: number
}

interface SidebarItemConfig {
  href: string
  icon: LucideIcon
  label: string
}

interface SidebarGroupConfig {
  id: string
  label: string
  items: SidebarItemConfig[]
}

const GROUPS: SidebarGroupConfig[] = [
  {
    id: 'core',
    label: 'TONG QUAN',
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/tables', icon: LayoutGrid, label: 'Quản lý Bàn' },
      { href: '/admin/orders', icon: ShoppingBag, label: 'Đơn hàng' },
      { href: '/admin/inventory/imports', icon: Warehouse, label: 'Nhập kho' },
    ],
  },
  {
    id: 'catalog',
    label: 'THUC DON',
    items: [
      { href: '/admin/products', icon: Package, label: 'Sản phẩm' },
      { href: '/admin/product-images', icon: ImageIcon, label: 'Hình ảnh sản phẩm' },
      { href: '/admin/combos', icon: Sparkles, label: 'Combo' },
      { href: '/admin/categories', icon: Tag, label: 'Danh mục' },
      { href: '/admin/menus', icon: ListTree, label: 'Quản lý Menu' },
    ],
  },
  {
    id: 'marketing',
    label: 'CHIEN DICH & BAI VIET',
    items: [
      { href: '/admin/promotions', icon: Percent, label: 'Khuyến mãi' },
      { href: '/admin/vouchers', icon: Ticket, label: 'Voucher' },
      { href: '/admin/loyalty-rewards', icon: Gift, label: 'Loyalty Rewards' },
      { href: '/admin/automation', icon: Workflow, label: 'Automation Email' },
      { href: '/admin/banners', icon: ImageIcon, label: 'Banner' },
      { href: '/admin/posts', icon: FileText, label: 'Bài Viết' },
      { href: '/admin/post-topics', icon: BookOpen, label: 'Chủ đề bài viết' },
    ],
  },
  {
    id: 'customer',
    label: 'CHAM SOC & HO TRO',
    items: [
      { href: '/admin/contacts', icon: Mail, label: 'Liên hệ' },
      { href: '/admin/reviews', icon: MessageSquare, label: 'Quản lý Đánh giá' },
      { href: '/admin/policies', icon: Shield, label: 'Chính sách & Hỗ Trợ' },
    ],
  },
  {
    id: 'system',
    label: 'HE THONG',
    items: [
      { href: '/admin/members', icon: Users, label: 'Thành viên' },
      { href: '/admin/trash', icon: Trash2, label: 'Thùng rác' },
      { href: '/admin/settings', icon: Settings, label: 'Cài đặt' },
    ],
  },
]

function SidebarItem({
  item,
  pathname,
  pendingOrdersCount,
}: {
  item: SidebarItemConfig
  pathname: string
  pendingOrdersCount: number
}) {
  const Icon = item.icon
  const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
      className={`
        group relative flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] tracking-tight transition-all
        ${active
          ? 'bg-red-50 text-[#ed2a2a] font-semibold border-r-4 border-[#ed2a2a]'
          : 'text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-900'
        }
      `}
    >
      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#ed2a2a]' : 'group-hover:text-[#ed2a2a]'}`} />
      <span className="truncate">{item.label}</span>
      {item.href === '/admin/orders' && pendingOrdersCount > 0 && (
        <span className="ml-auto rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5">
          +{pendingOrdersCount}
        </span>
      )}
    </Link>
  )
}

function SidebarGroup({
  group,
  pathname,
  pendingOrdersCount,
}: {
  group: SidebarGroupConfig
  pathname: string
  pendingOrdersCount: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-1.5"
    >
      <p className="text-slate-400 font-bold text-[11px] tracking-widest mb-2 mt-6 px-4">
        {group.label}
      </p>
      {group.items.map((item) => (
        <SidebarItem
          key={`${group.id}-${item.href}-${item.label}`}
          item={item}
          pathname={pathname}
          pendingOrdersCount={pendingOrdersCount}
        />
      ))}
    </motion.div>
  )
}

export default function Sidebar({ pathname, pendingOrdersCount }: SidebarProps) {
  return (
    <nav className="flex-1 overflow-y-auto pt-2 pb-4 px-3 space-y-2 custom-scrollbar">
      {GROUPS.map((group) => (
        <SidebarGroup
          key={group.id}
          group={group}
          pathname={pathname}
          pendingOrdersCount={pendingOrdersCount}
        />
      ))}
    </nav>
  )
}
