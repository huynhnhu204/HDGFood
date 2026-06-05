'use client'

import Image from 'next/image'
import { Combo } from '@/types/combo'
import { Clock, Minus, Plus, Sparkles, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/format'

interface ComboCardProps {
  combo: Combo
  onSelect?: (combo: Combo) => void
  featuredCarousel?: boolean
  savePercent?: number
  detailHref?: string
}

export default function ComboCard({ combo, onSelect, featuredCarousel, savePercent, detailHref }: ComboCardProps) {
  const [imageError, setImageError] = useState(false)
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState(1)

  const savingsAmount = combo.base_price > combo.final_price ? combo.base_price - combo.final_price : 0

  const isExpired = combo.end_date && new Date(combo.end_date) < new Date()

  // Generate product names summary for SEO
  const productSummary = combo.groups
    ?.map(g => g.products?.map(p => p.name).join(', '))
    .filter(Boolean)
    .join('; ') || ''

  const handleSelect = () => {
    if (isExpired || !combo.is_running) return
    onSelect?.(combo)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
      aria-label={`Combo ${combo.name} - HDG Food`}
      itemScope
      itemType="https://schema.org/Offer"
    >
      {/* Hidden meta for SEO */}
      <meta itemProp="name" content={combo.name} />
      <meta itemProp="description" content={combo.description || `Combo ${combo.name} từ HDG Food`} />
      <meta itemProp="price" content={String(combo.final_price)} />
      <meta itemProp="priceCurrency" content="VND" />
      <meta itemProp="availability" content={combo.is_running ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'} />
      {combo.image && <meta itemProp="image" content={combo.image} />}

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="relative min-h-[280px] bg-slate-100 lg:min-h-[420px]">
          {combo.image && !imageError ? (
            <Image
              src={combo.image}
              alt={`Combo ${combo.name} HDG Food - ${productSummary}`}
              fill
              className="object-contain p-8"
              onError={() => setImageError(true)}
              sizes="(max-width: 1024px) 100vw, 50vw"
              itemProp="image"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <UtensilsCrossed className="h-16 w-16 text-slate-400" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6 lg:p-8">
          <div>
            <h3 className="text-2xl font-black leading-tight text-slate-900">
              {combo.name}
            </h3>
            <div className="mt-2 flex items-center gap-2 text-amber-400">
              {'★★★★★'.split('').map((star, idx) => (
                <span key={idx} className="text-sm">{star}</span>
              ))}
              <span className="text-[11px] font-bold text-slate-400">So sánh</span>
            </div>
            <p className="mt-2 text-xs text-slate-600 line-clamp-2">
              {combo.description || 'Combo tối ưu cho bữa ăn tiết kiệm và tiện lợi.'}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">
              Trạng thái: {isExpired || !combo.is_running ? 'Không khả dụng' : 'Sẵn trong kho'}
            </p>
          </div>

          <div>
            <p className="text-[34px] font-black leading-none text-[#ed2a2a]">
              {formatPrice(combo.final_price)}đ
            </p>
            {combo.base_price > combo.final_price && (
              <p className="mt-1 text-sm text-slate-400 line-through">
                {formatPrice(combo.base_price)}đ
              </p>
            )}
            {savingsAmount > 0 && (
              <p className="mt-1 text-xs font-bold text-emerald-600">
                Tiết kiệm {formatPrice(savingsAmount)}đ
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Ghi chú cho món ăn</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: ít cay, không hành..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#ed2a2a]"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Số lượng</span>
            <div className="inline-flex items-center rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center text-sm font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSelect}
              disabled={isExpired || !combo.is_running}
              className="rounded-md bg-[#ff4a00] py-3 text-sm font-bold text-white transition-colors hover:bg-[#ed2a2a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Thêm vào giỏ
            </button>
            <motion.button
              type="button"
              onClick={handleSelect}
              disabled={isExpired || !combo.is_running}
              className="rounded-md border border-[#ed2a2a]/40 bg-white py-3 text-sm font-bold text-[#ed2a2a] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExpired || !combo.is_running ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Không khả dụng
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Mua ngay
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}