'use client'

import React from 'react'
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
    <nav className="flex mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide py-1" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <Link 
            href="/" 
            className="flex items-center text-slate-400 hover:text-HDG-600 transition-colors"
          >
            <Home size={16} className="mr-1" />
            <span className="font-lexend font-medium">Trang chủ</span>
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight size={14} className="text-slate-300 mx-1 shrink-0" />
            {item.href ? (
              <Link
                href={item.href}
                className="text-slate-400 hover:text-HDG-600 transition-colors font-lexend font-medium"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900 font-lexend font-bold truncate max-w-[200px]">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
