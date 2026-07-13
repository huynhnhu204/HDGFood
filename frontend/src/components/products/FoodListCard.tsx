'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingCart, Star, Clock, Zap, Heart, Check, Plus } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { triggerFlyToCartAnimation } from '@/lib/flyToCart'

export interface FoodProduct {
  id: number
  name: string
  slug: string
  price: number
  final_price: number
  image: string
  description?: string
  is_best_seller?: boolean
  fast_delivery?: boolean
  rating_avg?: number | string
  reviews_count?: number | string
  sold_count?: number
  category?: { name: string }
}

interface Props {
  product: FoodProduct
  index: number
}

export default function FoodListCard({ product, index }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)
  const [liked, setLiked] = useState(false)

  const price = product.final_price ?? product.price
  const hasDiscount = product.price > price
  const rating = Number(product.rating_avg ?? 4.8).toFixed(1)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      productId: product.id,
      name: product.name,
      price,
      image: product.image,
      slug: product.slug,
      quantity: 1,
    })
    triggerFlyToCartAnimation(product.image || '/placeholder.png', e.currentTarget as HTMLElement)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLiked(l => !l)
  }

  // JSON-LD Product Schema
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description ?? `${product.name} - Món ăn ngon tại HDG Food`,
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'VND',
      availability: 'https://schema.org/InStock',
      url: `https://hdgfood.vn/products/${product.slug}`,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount: product.reviews_count ?? product.sold_count ?? 10,
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <article
        itemScope
        itemType="https://schema.org/Product"
        className="group relative bg-white border border-slate-100 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-500 flex flex-col h-full"
      >
        {/* ── Image ── */}
        <Link
          href={`/products/${product.slug}`}
          className="block relative aspect-square overflow-hidden rounded-[2rem] m-2"
          title={`Xem chi tiết ${product.name}`}
        >
          <img
            src={product.image || '/placeholder.png'}
            alt={`${product.name} - Món ăn ngon tại HDG Food`}
            title={product.name}
            loading="lazy"
            itemProp="image"
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:saturate-[1.15]"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />

          {/* Glassmorphism badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.is_best_seller && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-amber-700 bg-amber-400/80 backdrop-blur-md border border-amber-300/50 shadow-sm uppercase tracking-wide">
                <Zap size={10} fill="currentColor" /> Bán chạy
              </span>
            )}
            {product.fast_delivery && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-700 bg-emerald-400/80 backdrop-blur-md border border-emerald-300/50 shadow-sm uppercase tracking-wide">
                <Clock size={10} /> 20 phút
              </span>
            )}
          </div>

          {/* Heart button */}
          <button
            onClick={handleLike}
            aria-label={liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
            suppressHydrationWarning
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-all duration-300 hover:scale-110"
          >
            <Heart
              size={15}
              className={`transition-colors duration-300 ${liked ? 'fill-[#ed2a2a] text-[#ed2a2a]' : 'text-slate-400'}`}
            />
          </button>

          {/* Quick Add button — hiện khi hover */}
          <motion.button
            onClick={handleAddToCart}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            suppressHydrationWarning
            initial={{ y: 16, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            className={`absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-black shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ${
              added
                ? 'bg-emerald-500 text-white'
                : 'bg-white/90 backdrop-blur-md text-slate-800 hover:bg-[#ed2a2a] hover:text-white border border-white/50'
            }`}
          >
            {added ? <Check size={13} /> : <ShoppingCart size={13} />}
            {added ? 'Đã thêm!' : 'Thêm nhanh'}
          </motion.button>
        </Link>

        {/* ── Info ── */}
        <div className="flex flex-col flex-1 px-4 pb-4 pt-2 space-y-2.5">
          {/* Category */}
          {product.category?.name && (
            <span className="text-[10px] font-black text-[#ed2a2a] uppercase tracking-[0.15em]">
              {product.category.name}
            </span>
          )}

          {/* Name */}
          <Link href={`/products/${product.slug}`}>
            <h3
              itemProp="name"
              className="font-bold text-slate-800 text-sm md:text-[15px] leading-snug line-clamp-2 hover:text-[#ed2a2a] transition-colors duration-200"
            >
              {product.name}
            </h3>
          </Link>

          {/* Rating + Sold */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star size={12} fill="currentColor" />
              <span itemProp="ratingValue">{rating}</span>
            </div>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 font-medium">
              Đã bán <span className="font-bold text-slate-600">{(product.sold_count ?? 0).toLocaleString()}</span>
            </span>
          </div>

          {/* Price + Add button */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-50 mt-auto">
            <div className="flex flex-col">
              {hasDiscount && (
                <span className="text-[10px] text-slate-300 line-through font-medium">
                  {product.price.toLocaleString('vi-VN')}đ
                </span>
              )}
              <span
                itemProp="price"
                content={String(price)}
                className="text-[#ed2a2a] font-lexend font-black text-base leading-none"
              >
                {price.toLocaleString('vi-VN')}đ
              </span>
              <meta itemProp="priceCurrency" content="VND" />
            </div>

            <button
              onClick={handleAddToCart}
              aria-label={`Thêm ${product.name} vào giỏ hàng`}
              suppressHydrationWarning
              className={`h-9 w-9 flex items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                added
                  ? 'bg-emerald-500 text-white scale-95'
                  : 'bg-slate-100 text-slate-700 hover:bg-[#ed2a2a] hover:text-white hover:scale-105'
              }`}
            >
              {added ? <Check size={13} /> : <Plus size={15} />}
            </button>
          </div>
        </div>
      </article>
    </motion.div>
  )
}
