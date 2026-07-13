'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2, ArrowRight } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '')

interface Product {
  id: number
  name: string
  slug: string
  price: number
  sale_price: number | null
  image: string | null
}

interface LiveSearchProps {
  scrolled?: boolean
}

export default function LiveSearch({ scrolled = false }: LiveSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const debouncedQuery = useDebounce(query, 300)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus()
    }
  }, [isExpanded])

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 768)
    updateMobile()
    window.addEventListener('resize', updateMobile)
    return () => window.removeEventListener('resize', updateMobile)
  }, [])

  useEffect(() => {
    if (!debouncedQuery.trim() || !isExpanded) {
      setResults([])
      return
    }

    const fetchResults = async () => {
      setLoading(true)
      try {
        const url = `${BASE}/api/products?search=${encodeURIComponent(debouncedQuery)}&per_page=8`
        const res = await fetch(url)
        const data = await res.json()
        const products = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
        setResults(products)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [debouncedQuery, isExpanded])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
      return
    }

    if (!results.length) {
      if (e.key === 'Enter' && query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
        handleClose()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectProduct(results[selectedIndex])
        } else if (query.trim()) {
          router.push(`/search?q=${encodeURIComponent(query.trim())}`)
          handleClose()
        }
        break
    }
  }

  const handleSelectProduct = (product: Product) => {
    router.push(`/products/${product.slug}`)
    handleClose()
  }

  const handleClose = () => {
    setIsExpanded(false)
    setQuery('')
    setResults([])
    setSelectedIndex(-1)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)

  const getImageUrl = (image: string | null) => {
    if (!image) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'
    if (image.startsWith('http')) return image
    const cleanImage = image.replace(/^\/+/, '')
    return `${BASE}/storage/${cleanImage}`
  }

  const barWidth = isExpanded
    ? isMobile
      ? 'w-full'
      : 'w-[min(78vw,440px)]'
    : isMobile
      ? 'w-10'
      : 'w-[min(42vw,220px)]'

  return (
    <div
      ref={searchRef}
      className={isExpanded && isMobile ? 'fixed inset-x-0 top-[4.25rem] z-[120] px-4' : 'relative'}
    >
      <div
        className={`group flex items-center overflow-hidden rounded-2xl border transition-all duration-300 ${barWidth} ${
          isExpanded
            ? 'border-[#ed2a2a]/25 bg-white shadow-[0_8px_30px_rgba(237,42,42,0.12)] ring-2 ring-[#ed2a2a]/10'
            : scrolled
              ? 'border-slate-200/80 bg-slate-50/90 hover:border-[#ed2a2a]/30 hover:bg-white hover:shadow-sm'
              : 'border-slate-200/60 bg-white/80 hover:border-[#ed2a2a]/25 hover:bg-white hover:shadow-md'
        }`}
      >
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className={`flex w-full items-center gap-2.5 text-left transition-colors ${
              isMobile ? 'justify-center p-2.5' : 'px-3.5 py-2.5'
            }`}
            aria-label="Tìm kiếm món ăn"
            suppressHydrationWarning
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ed2a2a]/10 text-[#ed2a2a] transition-colors group-hover:bg-[#ed2a2a] group-hover:text-white">
              <Search className="h-4 w-4" />
            </span>
            {!isMobile && (
              <span className="truncate text-sm font-medium text-slate-500 group-hover:text-slate-700">
                Tìm món ngon...
              </span>
            )}
          </button>
        ) : (
          <>
            <span className="ml-3.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ed2a2a]/10 text-[#ed2a2a]">
              <Search className="h-4 w-4" />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm phở, cơm, trà sữa..."
              className="h-11 w-full min-w-0 bg-transparent px-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
            />
            <div className="mr-2 flex shrink-0 items-center gap-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-[#ed2a2a]" />}
              {query ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Xóa từ khóa"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Đóng tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] ${
              isMobile ? 'mt-2 w-full' : 'absolute right-0 top-[calc(100%+10px)] z-[110] w-[min(88vw,440px)]'
            }`}
          >
            <div className="border-b border-slate-50 bg-slate-50/80 px-4 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {loading ? 'Đang tìm...' : `${results.length} kết quả`}
              </p>
            </div>

            <div className="max-h-[min(60vh,420px)] overflow-y-auto">
              {results.length > 0 ? (
                <div className="p-2">
                  {results.map((product, index) => (
                    <motion.button
                      key={product.id}
                      type="button"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => handleSelectProduct(product)}
                      className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all ${
                        selectedIndex === index
                          ? 'bg-red-50 ring-1 ring-[#ed2a2a]/30'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-slate-800">{product.name}</h4>
                        <div className="mt-0.5 flex items-center gap-2">
                          {product.sale_price ? (
                            <>
                              <span className="text-sm font-black text-[#ed2a2a]">
                                {formatPrice(product.sale_price)}
                              </span>
                              <span className="text-xs text-slate-400 line-through">
                                {formatPrice(product.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-black text-[#ed2a2a]">
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedIndex === index && (
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#ed2a2a]" />
                      )}
                    </motion.button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
                      handleClose()
                    }}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-widest text-[#ed2a2a] transition-colors hover:bg-red-50"
                  >
                    Xem tất cả kết quả
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : !loading ? (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                    <Search className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Không tìm thấy món phù hợp</p>
                  <p className="mt-1 text-xs text-slate-400">Thử từ khóa khác hoặc xem toàn bộ thực đơn</p>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
