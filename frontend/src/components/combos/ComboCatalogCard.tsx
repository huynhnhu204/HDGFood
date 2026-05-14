'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Combo } from '@/types/combo'
import { Clock3, ShoppingBag, Tag } from 'lucide-react'

interface ComboCatalogCardProps {
  combo: Combo
  onSelect?: (combo: Combo) => void
  detailHref: string
}

const formatPrice = (value: number) => Math.round(value || 0).toLocaleString('vi-VN')

export default function ComboCatalogCard({ combo, onSelect, detailHref }: ComboCatalogCardProps) {
  const isExpired = combo.end_date && new Date(combo.end_date) < new Date()
  const isAvailable = combo.is_running && !isExpired
  const hasDiscount = combo.base_price > combo.final_price
  const savings = hasDiscount ? Math.max(0, combo.base_price - combo.final_price) : 0

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <Link href={detailHref} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {combo.image ? (
          <Image
            src={combo.image}
            alt={combo.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">Combo</div>
        )}

        <div className="absolute left-3 top-3">
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${isAvailable ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'}`}>
            {isAvailable ? 'Sẵn sàng' : 'Không khả dụng'}
          </span>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-black text-slate-900">{combo.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-[36px] text-xs text-slate-500">
            {combo.description || 'Combo tiết kiệm cho bữa ăn chất lượng.'}
          </p>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-[#ed2a2a]">{formatPrice(combo.final_price)}đ</p>
            {hasDiscount && (
              <p className="text-xs text-slate-400 line-through">{formatPrice(combo.base_price)}đ</p>
            )}
          </div>
          {savings > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
              <Tag className="h-3 w-3" />
              Tiết kiệm {formatPrice(savings)}đ
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSelect?.(combo)}
            disabled={!isAvailable}
            className="flex-1 rounded-xl bg-[#ed2a2a] px-3 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <span className="inline-flex items-center gap-1.5">
              {isAvailable ? <ShoppingBag className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
              {isAvailable ? 'Chọn combo' : 'Hết hạn'}
            </span>
          </button>
          <Link
            href={detailHref}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-600"
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </article>
  )
}
