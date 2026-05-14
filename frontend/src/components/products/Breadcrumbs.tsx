'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-xs" aria-label="Breadcrumb">
      <Link 
        href="/" 
        className="flex items-center gap-1 text-slate-400 hover:text-[#ed2a2a] transition-colors"
      >
        <Home size={14} />
        <span className="font-bold">Trang chủ</span>
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight size={14} className="text-slate-300" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-slate-400 hover:text-[#ed2a2a] transition-colors font-bold"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-black">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
