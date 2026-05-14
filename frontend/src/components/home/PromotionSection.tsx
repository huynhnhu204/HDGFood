'use client'

import { useState, useEffect } from 'react'
import { Flame, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import api from '@/services/api'
import ProductCard from '@/components/products/ProductCard'

interface Product {
  id: number
  name: string
  slug: string
  price: number
  final_price: number
  sale_price: number | null
  image: string
  stock: number
  sold_count: number
  active_promotion?: {
    discount_label: string
    discount_type: 'percent' | 'amount'
    discount_value: number
  }
}

/** Mức giảm so sánh được: % trực tiếp, hoặc quy đổi từ giảm tiền / sale_price. */
function promotionStrength(p: Product): number {
  const promo = p.active_promotion
  if (promo?.discount_type === 'percent') {
    return promo.discount_value
  }
  if (promo?.discount_type === 'amount' && p.price > 0) {
    return (promo.discount_value / p.price) * 100
  }
  const finalPrice = p.final_price ?? p.sale_price
  if (finalPrice != null && finalPrice > 0 && p.price > 0 && finalPrice < p.price) {
    return ((p.price - finalPrice) / p.price) * 100
  }
  return 0
}

const PROMO_FETCH_LIMIT = 100
const TOP_PROMO_COUNT = 5

export default function PromotionSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const maxItems = Math.min(products.length, TOP_PROMO_COUNT)
  const desktopColsClass =
    maxItems >= 5
      ? 'xl:grid-cols-5'
      : maxItems === 4
        ? 'xl:grid-cols-4'
        : maxItems === 3
          ? 'xl:grid-cols-3'
          : maxItems === 2
            ? 'xl:grid-cols-2'
            : 'xl:grid-cols-1'

  useEffect(() => {
    const fetchFeaturedPromos = async () => {
       try {
          const response = await api.get(
            `/products?has_promotion=1&limit=${PROMO_FETCH_LIMIT}`
          )
          const raw = response.data?.data || response.data || []
          const list = Array.isArray(raw) ? raw : []
          const top = [...list]
            .filter((p) => promotionStrength(p as Product) > 0)
            .sort((a, b) => promotionStrength(b as Product) - promotionStrength(a as Product))
            .slice(0, TOP_PROMO_COUNT) as Product[]
          setProducts(top)
       } catch (err) {
          console.error("[PromotionSection] Fetch error:", err)
       } finally {
          setLoading(false)
       }
    }
    fetchFeaturedPromos()
  }, [])

  if (loading) return <PromotionSkeleton />
  if (products.length === 0) return null

  return (
    <section className="py-12 md:py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        
         {/* Header */}
         <div className="flex items-center justify-between mb-8 border-l-4 border-[#ed2a2a] pl-4">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
               Khuyến mãi cực HOT 
               <Flame className="w-6 h-6 text-[#ed2a2a] fill-[#ed2a2a] animate-pulse" />
            </h2>

            <Link 
              href="/promotions" 
              className="group flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#ed2a2a] hover:text-slate-900 transition-colors"
            >
               Xem tất cả
               <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
         </div>

         <div className={`grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${desktopColsClass} gap-4`}>
            {products.slice(0, TOP_PROMO_COUNT).map((product) => (
               <ProductCard key={product.id} product={product as any} variant="compact" />
            ))}
         </div>

      </div>
    </section>
  )
}

function PromotionSkeleton() {
   return (
      <div className="py-16 container mx-auto px-4 space-y-8">
         <div className="flex justify-between items-center"><div className="w-48 h-8 bg-slate-100 rounded-lg"/><div className="w-24 h-4 bg-slate-50 rounded-lg"/></div>
         <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
               <div key={i} className="aspect-[3/4] bg-slate-50 rounded-2xl animate-pulse"/>
            ))}
         </div>
      </div>
   )
}
