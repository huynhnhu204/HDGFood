'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, SlidersHorizontal, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import api from '@/services/api'

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
  rating_avg: number
  reviews_count: number
  active_promotion?: {
    discount_label: string
    discount_type: 'percent' | 'amount'
    discount_value: number
  }
  category?: {
    id: number
    name: string
  }
}

export default function BestSellersSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        const productRes = await api.get('/products?sort=best_selling&limit=30')
        const data = productRes.data?.data || productRes.data || []
        setProducts(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('[BestSellers] Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBestSellers()
  }, [])

  const categories = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>()
    products.forEach((p) => {
      const label = p.category?.name?.trim()
      if (!label) return
      const key = label.toLowerCase()
      map.set(key, { key, label, count: (map.get(key)?.count || 0) + 1 })
    })
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [products])

  const visibleProducts = useMemo(() => {
    const filtered =
      activeCategory === 'all'
        ? products
        : products.filter((p) => p.category?.name?.toLowerCase() === activeCategory)
    return filtered.slice(0, 8)
  }, [activeCategory, products])

  const leftColumn = visibleProducts.filter((_, idx) => idx % 2 === 0)
  const rightColumn = visibleProducts.filter((_, idx) => idx % 2 !== 0)

  if (loading) return <BestSellerSkeleton />
  if (products.length === 0) return null

  // JSON-LD for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/products/${p.slug}`,
      name: p.name,
      image: p.image,
    })),
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      {/* SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4">
        
        <div className="rounded-[2.25rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 pt-8 pb-5 text-center">
            <h2 className="text-3xl font-black text-slate-900">Gợi ý cho bạn</h2>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-2 py-1 text-2xl font-black transition-colors ${
                  activeCategory === 'all' ? 'text-[#ed2a2a]' : 'text-pink-300 hover:text-slate-700'
                }`}
              >
                Tất cả
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-2 py-1 text-2xl font-black transition-colors ${
                    activeCategory === cat.key ? 'text-[#ed2a2a]' : 'text-pink-300 hover:text-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-6 md:grid-cols-2 md:gap-6">
            <div className="space-y-2">
              {leftColumn.map((product) => (
                <BestSellerRow key={product.id} product={product} />
              ))}
            </div>
            <div className="space-y-2">
              {rightColumn.map((product) => (
                <BestSellerRow key={product.id} product={product} />
              ))}
            </div>
          </div>

          <div className="pb-7 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-[#ed2a2a] transition-colors"
            >
              Xem tất cả
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}

function BestSellerRow({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-slate-50 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          <img
            src={product.image || '/placeholder.png'}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-[17px] font-black text-slate-900 group-hover:text-[#ed2a2a]">
            {product.name}
          </p>
          <p className="text-sm text-amber-400">★★★★★</p>
          <p className="text-[30px] font-black text-[#ed2a2a] leading-none">
            {Math.round(product.final_price || product.price).toLocaleString('vi-VN')}đ
          </p>
        </div>
      </div>
      <span className="ml-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#ed2a2a]">
        <SlidersHorizontal className="h-4 w-4" />
      </span>
    </Link>
  )
}

function BestSellerSkeleton() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        <div className="rounded-[2.25rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mx-auto mb-6 h-10 w-60 rounded-xl bg-slate-100" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl p-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl bg-slate-100" />
                  <div className="space-y-2">
                    <div className="h-4 w-44 rounded bg-slate-100" />
                    <div className="h-3 w-20 rounded bg-slate-100" />
                    <div className="h-5 w-24 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-9 w-9 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
