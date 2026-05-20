'use client'

import Link from 'next/link'
import { Trash2 } from 'lucide-react'

type Props = {
  active: 'all' | 'trash'
  onChange: (tab: 'all' | 'trash') => void
  /** Loại entity — link sang thùng rác tập trung có lọc */
  trashType?: string
  className?: string
}

export default function AdminTrashTabs({ active, onChange, trashType, className = '' }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${
          active === 'all'
            ? 'bg-[#ed2a2a] text-white shadow-md shadow-red-500/20'
            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        Danh sách
      </button>
      <button
        type="button"
        onClick={() => onChange('trash')}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${
          active === 'trash'
            ? 'bg-slate-800 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Thùng rác
      </button>
      {trashType && (
        <Link
          href={`/admin/trash?type=${trashType}`}
          className="text-[10px] font-bold text-slate-500 hover:text-[#ed2a2a] underline-offset-2 hover:underline ml-1"
        >
          Mở thùng rác tập trung
        </Link>
      )}
    </div>
  )
}
