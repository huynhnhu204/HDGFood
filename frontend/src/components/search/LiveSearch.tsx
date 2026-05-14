'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
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
    const updateMobile = () => setIsMobile(window.innerWidth < 640)
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
        console.log('🔍 Fetching:', url)
        
        const res = await fetch(url)
        const data = await res.json()
        
        console.log('📦 Response:', data)
        console.log('📦 Data array:', data.data)
        
        // Xử lý cả 2 trường hợp: data.data (paginated) hoặc data (array trực tiếp)
        const products = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
        console.log('✅ Products:', products)
        
        setResults(products)
      } catch (error) {
        console.error('❌ Search error:', error)
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
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectProduct(results[selectedIndex])
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const getImageUrl = (image: string | null) => {
    if (!image) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'
    if (image.startsWith('http')) return image
    // Xử lý cả 2 trường hợp: có /storage hoặc chưa
    const cleanImage = image.replace(/^\/+/, '') // Remove leading slashes
    return `${BASE}/storage/${cleanImage}`
  }

  return (
    <div
      ref={searchRef}
      className={isExpanded && isMobile ? 'fixed inset-x-0 top-16 z-[120] px-3' : 'relative'}
    >
      <div
        className={`flex items-center overflow-hidden rounded-full border transition-all duration-300 ${
          isExpanded
            ? isMobile
              ? 'w-full border-slate-200 bg-white shadow-lg'
              : 'w-[min(72vw,420px)] border-slate-200 bg-white shadow-sm'
            : 'w-10 border-transparent bg-transparent'
        }`}
      >
        {!isExpanded && (
      <>
      <button
        onClick={() => setIsExpanded(true)}
        className="p-2 rounded-full text-slate-600 transition-colors hover:bg-slate-100"
        aria-label="Tìm kiếm"
        suppressHydrationWarning
      >
        <Search className="w-5 h-5" />
      </button>
      </>
        )}

        {isExpanded && (
          <>
            <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm kiếm món ăn..."
              className="h-10 w-full bg-transparent px-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none"
            />
            <div className="mr-2 flex items-center gap-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              {query && (
                <button
                  onClick={handleClear}
                  className="rounded-full p-1 text-slate-400 transition-colors hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-slate-400 transition-colors hover:text-slate-600"
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${
              isMobile
                ? 'mt-2 w-full'
                : 'absolute right-0 top-[calc(100%+8px)] z-[110] w-[min(86vw,420px)]'
            }`}
          >
            <div className="max-h-[420px] overflow-y-auto">
                    {results.length > 0 ? (
                      <div className="p-2">
                        {results.map((product, index) => (
                          <motion.button
                            key={product.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleSelectProduct(product)}
                            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left ${
                              selectedIndex === index
                                ? 'bg-red-50 border-2 border-[#ed2a2a]'
                                : 'hover:bg-slate-50 border-2 border-transparent'
                            }`}
                          >
                            {/* Image */}
                            <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
                              <img
                                src={getImageUrl(product.image)}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'
                                }}
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-800 truncate mb-1">
                                {product.name}
                              </h4>
                              <div className="flex items-center gap-2">
                                {product.sale_price ? (
                                  <>
                                    <span className="text-sm font-black text-[#ed2a2a]">
                                      {formatPrice(product.sale_price)}
                                    </span>
                                    <span className="text-xs font-medium text-slate-400 line-through">
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

                            {/* Arrow hint */}
                            {selectedIndex === index && (
                              <div className="shrink-0 text-[#ed2a2a] text-xs font-black uppercase tracking-widest">
                                Enter
                              </div>
                            )}
                          </motion.button>
                        ))}

                        <button
                          onClick={() => {
                            router.push(`/search?q=${encodeURIComponent(query.trim())}`)
                            handleClose()
                          }}
                          className="w-full mt-2 py-3 text-center text-xs font-black text-[#ed2a2a] uppercase tracking-widest hover:bg-red-50 rounded-xl transition-colors"
                        >
                          Xem tất cả kết quả
                        </button>
                      </div>
                    ) : !loading ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                          <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                          Không tìm thấy sản phẩm nào
                        </p>
                        <p className="text-xs text-slate-300 mt-1">
                          Thử từ khóa khác nhé!
                        </p>
                      </div>
                    ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
