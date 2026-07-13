'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Star, Flame, Sparkles } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/authStore'
import { profileService } from '@/services/profile.service'
import { triggerFlyToCartAnimation } from '@/lib/flyToCart'
import { toast } from 'sonner'

// --- Common Product Type ---
export interface Product {
  id: number
  name: string
  slug: string
  price: number
  final_price: number
  sale_price: number | null
  image: string
  stock: number
  sold_count: number
  rating_avg?: number
  reviews_count?: number
  active_promotion?: {
    discount_label: string
    discount_type: 'percent' | 'amount'
    discount_value: number
  }
  category?: {
    name: string
  }
}

interface ProductCardProps {
  product: Product
  variant?: 'grid' | 'compact' | 'featured'
  showBadge?: boolean
  className?: string
}

let wishlistCache: Set<number> | null = null
let wishlistLoadingPromise: Promise<Set<number>> | null = null

async function getWishlistIds(): Promise<Set<number>> {
  if (wishlistCache) return wishlistCache
  if (wishlistLoadingPromise) return wishlistLoadingPromise
  wishlistLoadingPromise = profileService
    .getWishlist()
    .then((res) => {
      const data = Array.isArray(res?.data) ? res.data : []
      const ids = new Set<number>(
        data
          .map((item: any) => Number(item.product_id))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      )
      wishlistCache = ids
      return ids
    })
    .catch(() => new Set<number>())
    .finally(() => {
      wishlistLoadingPromise = null
    })
  return wishlistLoadingPromise
}

export default function ProductCard({ 
  product, 
  variant = 'grid', 
  showBadge = true, 
  className = '' 
}: ProductCardProps) {
  const user = useAuthStore((s) => s.user)
  const [liked, setLiked] = useState(false)
  const [toggling, setToggling] = useState(false)
  
  const discountLabel = product.active_promotion?.discount_label || 
                        (product.sale_price ? `-${Math.round((1 - product.sale_price / product.price) * 100)}%` : '')
  
  const discountPercent = product.active_promotion?.discount_type === 'percent' 
    ? product.active_promotion.discount_value 
    : (product.sale_price ? (1 - product.sale_price / product.price) * 100 : 0)

  const isDeepDiscount = discountPercent >= 50
  const isOutOfStock = product.stock <= 0
  const canUseWishlist = useMemo(() => Boolean(user), [user])
  
  // Logic for sold bar
  const soldPercent = Math.min(Math.round((product.sold_count / (product.sold_count + product.stock + 1)) * 100), 100)

  useEffect(() => {
    if (!canUseWishlist) {
      setLiked(false)
      return
    }
    let ignore = false
    getWishlistIds().then((ids) => {
      if (!ignore) setLiked(ids.has(product.id))
    })
    return () => {
      ignore = true
    }
  }, [canUseWishlist, product.id])

  // Quick Action Handler
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault() 
    e.stopPropagation()

    // 1. Add to Cart Store
    useCartStore.getState().addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.final_price || product.price,
      image: product.image,
      quantity: 1
    })

    // 2. Flying image animation → icon giỏ hàng trên header
    triggerFlyToCartAnimation(
      product.image || '/placeholder.png',
      e.currentTarget as HTMLElement
    )
  }

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!canUseWishlist) {
      toast.error('Vui lòng đăng nhập để dùng yêu thích')
      return
    }
    if (toggling) return

    const nextLiked = !liked
    setToggling(true)
    try {
      if (nextLiked) {
        await profileService.addToWishlist(product.id)
        if (!wishlistCache) wishlistCache = new Set()
        wishlistCache.add(product.id)
      } else {
        await profileService.removeFromWishlist(product.id)
        wishlistCache?.delete(product.id)
      }
      setLiked(nextLiked)
      toast.success(nextLiked ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích')
    } catch {
      toast.error('Không thể cập nhật yêu thích')
    } finally {
      setToggling(false)
    }
  }

  // --- Variant Render Selection ---

  return (
    <Link 
      href={`/products/${product.slug}`} 
      prefetch={false}
      title={product.name}
      className={`group block w-full outline-none select-none h-full focus:ring-0 ${className}`}
    >
      <motion.div 
        whileHover={{ y: -8 }}
        whileTap={{ opacity: 0.8 }}
        className={`relative bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden transition-all duration-500 flex flex-col h-full
          ${isOutOfStock ? 'opacity-80 grayscale-[0.3]' : 'hover:shadow-2xl hover:border-red-100/50'}
        `}
      >
        {/* Media section */}
        <div className="relative aspect-square overflow-hidden bg-slate-50 shrink-0">
          <img 
            src={product.image || '/placeholder.png'} 
            alt={product.name} 
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />

          {/* Badge */}
          {showBadge && discountLabel && (
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
               <motion.div 
                 animate={isDeepDiscount ? { scale: [1, 1.1, 1] } : {}}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className={`px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5
                   ${isDeepDiscount ? 'bg-[#ed2a2a] text-white' : 'bg-amber-400 text-slate-900'}
                 `}
               >
                 {isDeepDiscount && <Sparkles className="w-3 h-3 fill-white" />}
                 {discountLabel}
               </motion.div>
            </div>
          )}

          {/* Wishlist button */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            disabled={toggling}
            aria-label={liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
            className={`absolute top-4 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border shadow-xl transition-all ${
              liked
                ? 'bg-red-50 border-red-100 text-[#ed2a2a]'
                : 'bg-white/95 border-white/40 text-slate-500 hover:text-[#ed2a2a]'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-[#ed2a2a]' : ''}`} />
          </button>

          {/* Quick Action Floating Button */}
          {!isOutOfStock && (
            <div 
              onClick={handleAddToCart}
              className="absolute bottom-4 right-4 w-12 h-12 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-900 border border-white/20 translate-y-20 lg:group-hover:translate-y-0 transition-all duration-500 shadow-2xl hover:bg-[#ed2a2a] hover:text-white"
            >
               <ShoppingCart size={18} />
            </div>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center">
               <div className="bg-white/95 text-slate-900 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl">
                  Tạm hết món
               </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className={`flex flex-col flex-1 ${variant === 'compact' ? 'p-4 space-y-2' : 'p-6 lg:p-7 space-y-4 lg:space-y-5'}`}>
          <div className="space-y-1.5">
            {product.category?.name && (
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {product.category.name}
               </span>
            )}
            <h3 className={`font-semibold text-slate-900 tracking-tight line-clamp-1 group-hover:text-[#ed2a2a] transition-colors leading-tight
               ${variant === 'compact' ? 'text-[15px]' : 'text-base lg:text-[17px]'}
            `}>
              {product.name}
            </h3>
            
            <div className="flex items-center justify-between gap-1 mt-1">
               <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-black text-slate-900 mt-0.5">{product.rating_avg || 5.0}</span>
               </div>
               <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter shrink-0">
                  Đã bán {product.sold_count}+ suất
               </div>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            {/* Prices */}
            <div className="flex items-center gap-2.5">
              <span className={`font-black text-[#ed2a2a] ${variant === 'compact' ? 'text-lg' : 'text-2xl'} tracking-tight`}>
                {product.final_price?.toLocaleString()}đ
              </span>
              {product.price > product.final_price && (
                <span className="text-[12px] font-semibold text-slate-400 line-through mt-1">
                  {product.price.toLocaleString()}đ
                </span>
              )}
            </div>

            {/* Micro progress bar for FOMO (only for grid/featured) */}
            {variant !== 'compact' && (
               <div className="space-y-1">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${soldPercent}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className={`h-full rounded-full ${soldPercent > 80 ? 'bg-gradient-to-r from-[#ed2a2a] to-orange-500' : 'bg-[#ed2a2a]/60'}`}
                     />
                  </div>
               </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
