'use client'

import { Combo } from '@/types/combo'
import ComboCard from '@/components/combos/ComboCard'
import { ChevronRight, Sparkles } from 'lucide-react'

export function comboSavePercent(combo: Combo): number {
  if (combo.discount_type === 'percent' && combo.discount_value > 0) {
    return Math.round(combo.discount_value)
  }
  if (combo.base_price > 0 && combo.final_price < combo.base_price) {
    return Math.round(((combo.base_price - combo.final_price) / combo.base_price) * 100)
  }
  return 0
}

interface Props {
  combos: Combo[]
  onSelectCombo: (combo: Combo) => void
}

export default function ProductsFeaturedCombos({ combos, onSelectCombo }: Props) {
  if (!combos.length) return null

  return (
    <section
      className="mb-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgb(0,0,0,0.06)] md:p-8"
      aria-labelledby="featured-combos-heading"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#ed2a2a]">
            <Sparkles className="h-4 w-4" />
            Nổi bật
          </p>
          <h2
            id="featured-combos-heading"
            className="font-playfair text-2xl font-black italic text-slate-900 md:text-3xl"
          >
            Combo tiết kiệm <span className="text-[#ed2a2a]">cho bạn</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">5 combo giảm giá mạnh nhất — cuộn ngang để xem thêm</p>
        </div>
        <span className="hidden items-center gap-1 text-xs font-bold text-slate-400 sm:flex">
          <ChevronRight className="h-4 w-4 rotate-180" />
          Vuốt
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>

      <div
        className="-mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 pt-1 md:gap-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="list"
        aria-label="Combo nổi bật"
      >
        {combos.map((combo) => (
          <div
            key={combo.id}
            className="w-[min(88vw,400px)] shrink-0 snap-center sm:w-[min(44vw,420px)] lg:w-[min(36vw,440px)]"
            role="listitem"
          >
            <ComboCard
              combo={combo}
              onSelect={onSelectCombo}
              featuredCarousel
              savePercent={comboSavePercent(combo)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
