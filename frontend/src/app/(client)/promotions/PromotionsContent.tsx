'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X, ChevronDown, Search, Tag, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import { Dialog, Transition } from '@headlessui/react'
import Link from 'next/link'
import api from '@/services/api'
import ProductCard from '@/components/products/ProductCard'
import Breadcrumbs from '@/components/common/Breadcrumbs'

// --- Types ---
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
  is_active: boolean
  active_promotion?: {
    id: number
    name: string
    discount_label: string
    discount_type: 'percent' | 'amount'
    discount_value: number
    end_date: string
  }
  category?: {
    id: number
    name: string
  }
}

interface Category {
  id: number
  name: string
  slug: string
}

// --- Constants ---

const DISCOUNT_FILTERS = [
  { label: 'Tất cả ưu đãi', value: '' },
  { label: 'Giảm trên 50%', value: 'over_50' },
  { label: 'Giảm từ 20-50%', value: '20_50' },
  { label: 'Đồng giá 9k/19k/29k', value: 'same_price_9_29' },
]

const SORT_OPTIONS = [
  { label: 'Giảm giá nhiều nhất', value: 'discount_desc' },
  { label: 'Sản phẩm mới nhất', value: 'latest' },
  { label: 'Bán chạy hàng đầu', value: 'best_selling' },
]

// --- Components ---

// ProductSquareCard is replaced by the unified ProductCard component

function PromotionsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-white rounded-3xl border border-slate-100 p-4 md:p-5 space-y-4 animate-pulse">
           <div className="aspect-square bg-slate-100 rounded-2xl" />
           <div className="space-y-3">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-5 bg-slate-100 rounded w-3/4" />
           </div>
           <div className="h-10 bg-slate-100 rounded-xl w-full" />
           <div className="h-11 bg-slate-100 rounded-2xl w-full" />
        </div>
      ))}
    </div>
  )
}

// --- Main Content Component ---

export default function PromotionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    discount_range: searchParams.get('discount_range') || '',
    sort: searchParams.get('sort') || 'discount_desc',
    page: 1
  })

  // Synchronize filters with URL changes
  useEffect(() => {
    setFilters({
      category: searchParams.get('category') || '',
      discount_range: searchParams.get('discount_range') || '',
      sort: searchParams.get('sort') || 'discount_desc',
      page: parseInt(searchParams.get('page') || '1')
    })
  }, [searchParams])

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    fetchProducts(filters.page, filters.page === 1)
  }, [filters.category, filters.discount_range, filters.sort])

  // Handle pagination
  useEffect(() => {
    if (filters.page > 1) {
      fetchProducts(filters.page, false)
    }
  }, [filters.page])

  const fetchInitialData = async () => {
    try {
      const res = await api.get('/categories?has_promotion=1&status=active')
      const data = res.data?.data || res.data || []
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("[Promotions] Fetch init error:", err)
    }
  }

  const fetchProducts = async (pageNum: number, reset: boolean = false) => {
    const params: Record<string, string | number> = {
      paginate: 12,
      page: pageNum,
      category: filters.category,
      discount_range: filters.discount_range,
      sort: filters.sort,
    }

    if (reset) setLoading(true)
    else setLoadingMore(true)

    try {
      const res = await api.get('/products/promotions', { params })
      const data = res.data?.data || []
      const meta = res.data?.meta

      if (reset) setProducts(data)
      else setProducts(prev => [...prev, ...data])

      setHasMore(meta?.current_page < meta?.last_page)
    } catch (err) {
      console.error("[Promotions] Fetch products error:", err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleFilterChange = (name: string, value: string | null) => {
    const newFilters = { ...filters, [name]: value || '', page: 1 }
    setFilters(newFilters)

    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val) params.set(key, val.toString())
    })
    router.push(`/promotions?${params.toString()}`, { scroll: false })
  }

  const selectedCategoryLabel = categories.find((c) => String(c.id) === filters.category)?.name

  return (
    <div className="min-h-screen bg-slate-50 font-lexend">
      <div className="container mx-auto max-w-[1400px] px-4 md:px-6 py-8 md:py-10">
         <div className="bg-white/80 backdrop-blur-md rounded-2xl px-6 py-2 shadow-sm mb-8 inline-block">
            <Breadcrumbs items={[{ label: 'Khuyến mãi', href: '/promotions' }]} />
         </div>

         <section className="mb-8 rounded-[2.5rem] border border-white/70 bg-gradient-to-r from-[#fff1f0] via-white to-[#f8fafc] p-6 md:p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden relative">
            <div className="pointer-events-none absolute -top-10 -right-10 h-56 w-56 rounded-full bg-[#ed2a2a]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 left-4 h-44 w-44 rounded-full bg-[#fb7185]/10 blur-3xl" />
            <div className="relative grid gap-5 md:gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-center">
               <div className="space-y-3">
                  <p className="text-xs md:text-sm font-black uppercase tracking-[0.28em] text-[#dc2626]">Deal hot mỗi ngày</p>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight text-slate-900">
                     Khuyến mãi món ngon, chốt đơn nhanh gọn.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-500">
                     Lọc theo mức giảm và danh mục để tìm món giảm giá đúng gu, giá tốt trong hôm nay.
                  </p>
               </div>
               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                     <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Đang hiển thị</p>
                     <p className="mt-2 text-3xl md:text-4xl font-black text-[#ed2a2a]">{products.length}</p>
                     <p className="text-sm text-slate-500 mt-1">món đang có ưu đãi</p>
                  </div>
                  <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                     <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Bộ lọc hiện tại</p>
                     <p className="mt-2 text-2xl md:text-3xl font-black text-slate-900">
                        {selectedCategoryLabel || 'Tất cả món'}
                     </p>
                     <p className="text-sm text-slate-500 mt-1">
                        {filters.discount_range ? 'Đang lọc theo mức giảm' : 'Chưa áp dụng lọc sâu'}
                     </p>
                  </div>
               </div>
            </div>
         </section>

         <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
            
            {/* Sidebar (Desktop Filter) */}
            <aside className="hidden lg:block lg:w-[280px] xl:w-[300px] shrink-0 space-y-10">
               
               {/* Selection filter */}
               <div className="space-y-5">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 flex items-center gap-4">
                     <span className="shrink-0 text-slate-900">Săn Deal Hời</span>
                     <div className="flex-1 h-[2px] bg-slate-50" />
                  </h4>
                  <div className="flex flex-col gap-2.5">
                     {DISCOUNT_FILTERS.map((item) => (
                        <button 
                           key={item.value}
                           onClick={() => handleFilterChange('discount_range', item.value)}
                           className={`group flex items-center justify-between px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300
                             ${filters.discount_range === item.value 
                               ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20' 
                               : 'bg-white border border-slate-100 text-slate-400 hover:border-red-200 hover:text-slate-900'
                             }
                           `}
                        >
                           {item.label}
                           <ChevronDown className={`w-4 h-4 transition-transform ${filters.discount_range === item.value ? '-rotate-90' : 'opacity-0 group-hover:opacity-100'}`} />
                        </button>
                     ))}
                  </div>
               </div>

               {/* Categories filter */}
               <div className="space-y-5">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 flex items-center gap-4">
                     <span className="shrink-0 text-slate-900">Thực đơn deal</span>
                     <div className="flex-1 h-[2px] bg-slate-50" />
                  </h4>
                  <div className="space-y-2">
                     <button 
                        onClick={() => handleFilterChange('category', null)}
                        className={`w-full text-left px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!filters.category ? 'text-[#ed2a2a] bg-red-50 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                     >
                        Tất cả món ngon
                     </button>
                     {categories.map((cat) => (
                        <button 
                           key={cat.id}
                           onClick={() => handleFilterChange('category', cat.id.toString())}
                          className={`w-full text-left px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filters.category === cat.id.toString() ? 'text-[#ed2a2a] bg-red-50 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                        >
                           {cat.name}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Promotional Banner Widget */}
               <div className="relative p-7 bg-slate-900 rounded-3xl overflow-hidden group shadow-xl">
                  <img src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600" className="absolute inset-0 w-full h-full object-cover opacity-20 transition-transform duration-[2000ms] group-hover:scale-125" />
                  <div className="relative z-10 space-y-6">
                     <h5 className="text-white text-xl font-black italic uppercase leading-none tracking-tighter">Freeship tận cửa từ 200k</h5>
                     <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Săn deal hời, lại còn không lo phí vận chuyển. Đặt ngay!</p>
                     <Link href="/products" className="flex items-center justify-center h-12 bg-[#ed2a2a] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all">Đặt món ngay</Link>
                  </div>
               </div>
            </aside>

            {/* Product Grid Area */}
            <main className="flex-1 min-w-0 space-y-7 md:space-y-8">
               
               {/* Controls Bar */}
               <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                     <button 
                        onClick={() => setIsFilterOpen(true)}
                        className="lg:hidden flex-1 sm:flex-none flex items-center justify-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm"
                     >
                        <Filter size={16} />
                        Bộ lọc ngay
                     </button>
                     <div className="hidden sm:flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl shadow-sm">
                        <Tag className="w-5 h-5 text-[#ed2a2a]" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                           {products.length} Ưu đãi HOT
                        </span>
                     </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 shrink-0">Sắp xếp:</span>
                     <select 
                        value={filters.sort}
                        onChange={(e) => handleFilterChange('sort', e.target.value)}
                        className="flex-1 sm:flex-none bg-transparent py-2 text-[11px] font-black uppercase tracking-widest focus:text-[#ed2a2a] transition-colors outline-none cursor-pointer border-b border-slate-100 min-w-[180px]"
                     >
                        {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                     </select>
                  </div>
               </div>

               {/* Products Grid */}
               {loading ? (
                  <PromotionsSkeleton />
               ) : products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5">
                     {products.map(product => (
                        <ProductCard key={product.id} product={product as any} variant="compact" />
                     ))}
                  </div>
               ) : (
                  <div className="py-20 md:py-24 text-center space-y-7 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                     <div className="relative inline-flex flex-col items-center">
                        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-[#ed2a2a] shadow-xl relative z-10 rotate-6">
                           <Search size={36} />
                        </div>
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute -top-4 -right-4 w-12 h-12 bg-[#ed2a2a] rounded-2xl flex items-center justify-center text-white z-20 shadow-xl"
                        >
                           <Flame size={20} fill="currentColor" />
                        </motion.div>
                     </div>
                     <div className="space-y-4 px-6">
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Tạm hết deal ở bộ lọc này</h3>
                        <p className="text-slate-400 text-sm font-bold max-w-sm mx-auto leading-relaxed">Đại tiệc này tạm thời đã hết món, Như hãy thử chọn danh mục khác nhé.</p>
                     </div>
                     <button 
                        onClick={() => {
                           handleFilterChange('category', null)
                           handleFilterChange('discount_range', null)
                        }}
                        className="px-8 py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-[#ed2a2a] transition-all active:scale-95 hover:shadow-red-500/20"
                     >
                        Xem tất cả món ngon
                     </button>
                  </div>
               )}

               {/* Load More Button */}
               {hasMore && (
                  <div className="flex justify-center pt-8 pb-2">
                     <button 
                        disabled={loadingMore}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="group relative px-8 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] overflow-hidden shadow-sm hover:shadow-xl transition-all disabled:opacity-50 active:scale-95"
                     >
                        <span className="relative z-10 flex items-center gap-5">
                           {loadingMore ? 'Đang soạn món...' : 'Xem thêm đại tiệc'}
                           <ChevronDown className={`w-5 h-5 transition-transform ${loadingMore ? 'animate-bounce' : 'group-hover:translate-y-1'}`} />
                        </span>
                        <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <span className="absolute inset-0 z-20 flex items-center justify-center text-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 pointer-events-none">
                           {loadingMore ? 'Đang chuẩn bị...' : 'Xem thêm đại tiệc'}
                        </span>
                     </button>
                  </div>
               )}
            </main>
         </div>
      </div>

      {/* Mobile Sidebar (Drawer) */}
      <Transition show={isFilterOpen} as={Suspense}>
        <Dialog as="div" className="relative z-[100] lg:hidden" onClose={setIsFilterOpen}>
          <Transition.Child
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
          </Transition.Child>

          <div className="fixed inset-0 flex justify-end">
            <Transition.Child
              enter="transition ease-in-out duration-500 transform"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-500 transform"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="relative ml-auto flex h-full w-full max-w-[340px] flex-col overflow-y-auto bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-6 border-b border-slate-50 mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#ed2a2a] rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-red-500/20 rotate-[-8deg]">
                         <Filter size={20} />
                      </div>
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Lọc ưu đãi</h2>
                   </div>
                   <button onClick={() => setIsFilterOpen(false)} className="p-3 text-slate-300 hover:text-[#ed2a2a] transition-all">
                      <X size={28} />
                   </button>
                </div>

                <div className="space-y-8">
                   {/* Deal Filter */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Ưu đãi nổi bật</h4>
                      <div className="flex flex-col gap-3">
                         {DISCOUNT_FILTERS.map(item => (
                            <button 
                               key={item.value} 
                               onClick={() => { handleFilterChange('discount_range', item.value); setIsFilterOpen(false); }}
                               className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-left transition-all ${filters.discount_range === item.value ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            >
                               {item.label}
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* Categories */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Theo danh mục</h4>
                      <div className="grid grid-cols-1 gap-3">
                         <button 
                           onClick={() => { handleFilterChange('category', null); setIsFilterOpen(false); }}
                           className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!filters.category ? 'bg-slate-900 text-white shadow-xl' : 'border border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                         >
                            Tất cả món ngon
                         </button>
                         {categories.map(cat => (
                            <button 
                               key={cat.id} 
                               onClick={() => { handleFilterChange('category', cat.id.toString()); setIsFilterOpen(false); }}
                               className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filters.category === cat.id.toString() ? 'bg-slate-900 text-white shadow-xl' : 'border border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                            >
                               {cat.name}
                            </button>
                         ))}
                      </div>
                   </div>

                   <button 
                      onClick={() => {
                        setFilters({ category: '', discount_range: '', sort: 'discount_desc', page: 1 })
                        router.push('/promotions')
                        setIsFilterOpen(false)
                      }}
                      className="w-full py-3.5 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-black/5"
                   >
                      Cài đặt lại
                   </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
