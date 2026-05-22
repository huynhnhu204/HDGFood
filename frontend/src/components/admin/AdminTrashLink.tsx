'use client'

import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import type { TrashItemType } from '@/services/trash.service'

type Props = {
  /** Lọc thùng rác theo module */
  trashType?: TrashItemType
  /** Ghi đè URL (vd. đơn đã hủy) */
  href?: string
  label?: string
  className?: string
  variant?: 'button' | 'pill'
}

export default function AdminTrashLink({
  trashType,
  href: hrefOverride,
  label = 'Thùng rác',
  className = '',
  variant = 'button',
}: Props) {
  const href =
    hrefOverride ?? (trashType ? `/admin/trash?type=${trashType}` : '/admin/trash')

  if (variant === 'pill') {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors ${className}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {label}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] ${className}`}
    >
      <Trash2 className="w-4 h-4" />
      {label}
    </Link>
  )
}
