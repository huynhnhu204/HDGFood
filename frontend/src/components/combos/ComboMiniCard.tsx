'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Zap, ArrowRight, Gift, Sparkles } from 'lucide-react'
import { Combo } from '@/types/combo'
import { formatPrice } from '@/lib/format'

interface ComboMiniCardProps {
  combo: Combo
  onSelect?: (combo: Combo) => void
}

export default function ComboMiniCard({ combo, onSelect }: ComboMiniCardProps) {
  const isExpired = combo.end_date && new Date(combo.end_date) < new Date()

  const discountPercent = combo.discount_type === 'percent' && combo.discount_value > 0
    ? Math.round(combo.discount_value)
    : combo.base_price > 0 && combo.final_price < combo.base_price
      ? Math.round(((combo.base_price - combo.final_price) / combo.base_price) * 100)
      : 0

  return (
    <motion.article
      whileHover={{ y: -5 }}
      className={`group relative bg-white rounded-[2rem] p-3 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 mb-4 ${
        isExpired || !combo.is_running ? 'opacity-60' : ''
      }`}
      onClick={() => !isExpired && combo.is_running && onSelect?.(combo)}
      aria-label={`Combo ${combo.name}`}
      itemScope
      itemType="https://schema.org/Offer"
    >
      {/* Badge Giảm giá */}
      {discountPercent > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-[#ed2a2a] text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
            <Zap size={10} fill="white" /> -{discountPercent}%
          </span>
        </div>
      )}

      {/* Badge kích thích click */}
      {discountPercent > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-amber-300 text-amber-900 text-[10px] font-black px-2 py-1 rounded-lg shadow-md">
            {discountPercent >= 15 ? `Tiết kiệm ${discountPercent}%` : 'Best Seller'}
          </span>
        </div>
      )}

      {/* Ảnh Combo - Square Aspect */}
      <Link
        href={`/combos/${combo.id}`}
        className="block relative aspect-square overflow-hidden rounded-[1.5rem] bg-slate-50"
        onClick={(e) => e.stopPropagation()}
      >
        {combo.image ? (
          <Image
            src={combo.image}
            alt={combo.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="120px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
            <Gift className="w-10 h-10 text-orange-400" />
          </div>
        )}

        {/* Combo Badge */}
        <div className="absolute bottom-2 right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase shadow flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          Combo
        </div>

        {/* Overlay khi hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="text-white text-xs font-bold flex items-center gap-1">
            Xem chi tiết <ArrowRight size={14} />
          </span>
        </div>

        {/* Expired Overlay */}
        {(isExpired || !combo.is_running) && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <span className="text-[9px] font-black text-white bg-slate-800/80 px-2 py-1 rounded-full">
              {isExpired ? 'Hết hạn' : 'Hết hàng'}
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="mt-3 px-1">
        <h4 className="font-lexend font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-[#ed2a2a] transition-colors">
          {combo.name}
        </h4>

        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            {combo.base_price > combo.final_price && (
              <span className="text-[10px] text-slate-300 line-through">
                {formatPrice(combo.base_price)}đ
              </span>
            )}
            <span className="text-[#ed2a2a] font-lexend font-black text-base">
              {formatPrice(combo.final_price)}đ
            </span>
          </div>

          <Link
            href={`/combos/${combo.id}`}
            onClick={(e) => e.stopPropagation()}
            className="h-8 w-8 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-[#ed2a2a] transition-colors shadow-lg"
            aria-label={`Xem chi tiết combo ${combo.name}`}
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Bottom Hover Line */}
      <div className="h-0.5 bg-gradient-to-r from-[#ed2a2a] to-amber-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left mt-3" />
    </motion.article>
  )
}
