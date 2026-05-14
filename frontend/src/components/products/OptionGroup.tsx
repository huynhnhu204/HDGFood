'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react'
import type { OptionDraft } from './types'

interface Props {
  opt: OptionDraft
  oi: number
  onUpdate: (i: number, patch: Partial<OptionDraft>) => void
  onRemove: (i: number) => void
  onAddValue: (oi: number) => void
  onRemoveValue: (oi: number, vi: number) => void
  onUpdateValue: (oi: number, vi: number, patch: Partial<{ label: string; price_extra: number }>) => void
}

export default function OptionGroup({ opt, oi, onUpdate, onRemove, onAddValue, onRemoveValue, onUpdateValue }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white mb-4">
      {/* Group Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex-1 flex items-center gap-2 w-full">
          <input
            value={opt.name}
            onChange={e => onUpdate(oi, { name: e.target.value })}
            placeholder="Tên phân loại (VD: Size, Topping...)"
            className="flex-1 w-full bg-white sm:bg-transparent border sm:border-transparent border-slate-200 rounded-lg px-3 py-2 sm:py-1.5 focus:border-[#ed2a2a] focus:ring-1 focus:ring-[#ed2a2a]/30 text-sm font-bold focus:outline-none transition-all shadow-sm sm:shadow-none"
          />
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors bg-white sm:bg-transparent px-3 py-2 sm:p-0 border sm:border-transparent border-slate-200 rounded-lg shadow-sm sm:shadow-none">
            <input
              type="checkbox"
              checked={opt.is_required}
              onChange={e => onUpdate(oi, { is_required: e.target.checked })}
              className="rounded w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a] cursor-pointer"
            />
            <span className="font-semibold text-[13px] sm:text-sm">Bắt buộc chọn</span>
          </label>
          <div className="flex items-center gap-1 sm:border-l pl-0 sm:pl-3 border-slate-300">
            <button type="button" onClick={() => setOpen(v => !v)} className="p-2 sm:p-1.5 text-slate-500 bg-white sm:bg-transparent border sm:border-transparent border-slate-200 rounded-lg hover:bg-slate-200 transition-colors shadow-sm sm:shadow-none">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => onRemove(oi)} className="p-2 sm:p-1.5 text-red-500 bg-white sm:bg-transparent border sm:border-transparent border-red-100 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm sm:shadow-none">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Group Values */}
      {open && (
        <div className="p-4 sm:p-5 space-y-3 bg-white">
          {opt.values.map((val, vi) => (
            <div key={vi} className="flex flex-col sm:flex-row items-center gap-2.5 p-3.5 sm:p-0 border border-slate-100 sm:border-transparent rounded-xl bg-slate-50/50 sm:bg-transparent relative">
              <input
                value={val.label}
                onChange={e => onUpdateValue(oi, vi, { label: e.target.value })}
                placeholder="Nhập tên lựa chọn (VD: Size L, Trân châu đen...)"
                className="w-full sm:flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/30 focus:border-[#ed2a2a] transition-all"
              />
              <div className="relative w-full sm:w-40 shrink-0 mt-1 sm:mt-0">
                <input
                  type="number" min={0} value={val.price_extra || ''}
                  onChange={e => onUpdateValue(oi, vi, { price_extra: Number(e.target.value) })}
                  placeholder="Giá cộng thêm"
                  className="w-full border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/30 focus:border-[#ed2a2a] transition-all font-medium"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none uppercase">VNĐ</span>
              </div>
              
              <button type="button" onClick={() => onRemoveValue(oi, vi)} className="absolute sm:relative top-2 right-2 sm:top-auto sm:right-auto p-1.5 sm:p-2 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onAddValue(oi)} className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-100 bg-blue-50 px-4 py-2.5 rounded-lg mt-3 sm:mt-2 transition-colors w-full sm:w-auto justify-center">
            + Thêm dòng phân loại
          </button>
        </div>
      )}
    </div>
  )
}
