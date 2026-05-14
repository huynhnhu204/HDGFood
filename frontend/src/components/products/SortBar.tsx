'use client'

import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'

interface SortBarProps {
  currentSort: string
  onSortChange: (sort: string) => void
}

const SORT_OPTIONS = [
  { value: 'latest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'price_asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp' },
  { value: 'name_asc', label: 'Tên: A → Z' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
]

export default function SortBar({ currentSort, onSortChange }: SortBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-slate-600 whitespace-nowrap">
          Sắp xếp theo:
        </span>
        
        <div className="relative flex-1 max-w-xs">
          <select
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold appearance-none focus:ring-2 focus:ring-HDG-500/20 transition-all cursor-pointer pr-10"
            suppressHydrationWarning
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" 
            size={16} 
          />
        </div>
      </div>
    </motion.div>
  )
}
