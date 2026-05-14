'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Gift, LayoutGrid, List as ListIcon, Search, SlidersHorizontal, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import Breadcrumbs from '@/components/common/Breadcrumbs'
import FoodListCard from '@/components/products/FoodListCard'
import SortBar from '@/components/products/SortBar'
import FilterModal from '@/components/products/FilterModal'
import ProductSidebar from '@/components/products/ProductSidebar'
import ComboCatalogCard from '@/components/combos/ComboCatalogCard'
import ComboBuilder from '@/components/combos/ComboBuilder'
import { productService } from '@/services/product.service'
import { comboService } from '@/services/combo.service'
import { categoryService } from '@/services/category.service'
import api from '@/services/api'
import { useCartStore } from '@/store/useCartStore'
import { useDebounce } from '@/hooks/useDebounce'
import type { Combo } from '@/types/combo'
import type { Category } from '@/types'

// --- Types ---
interface Province {
  code: number | string
  name: string
}

interface District {
  code: number | string
  name: string
}

interface Ward {
  code: number | string
  name: string
}

interface Product {
  id: number
  name: string
  slug: string
  price: number
  final_price: number
  sale_price?: number | null
  image: string
  is_best_seller?: boolean
  fast_delivery?: boolean
  rating_avg?: number | string
  reviews_count?: number
  sold_count?: number
  stock?: number
  description?: string
  category?: {
    name: string
  }
}

type ViewMode = 'grid' | 'table'

export default function ProductsPage() {
   return (
      <Suspense fallback={<ProductsSkeleton />}>
         <ProductsContent />
      </Suspense>
   )
}

function ProductsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const comboOnly = searchParams.get('combo') === '1'

  // -- States --
  const [products, setProducts] = useState<Product[]>([])
  const [comboListFiltered, setComboListFiltered] = useState<Combo[]>([])
  const [loading, setLoading] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null)
  const [comboBuilderOpen, setComboBuilderOpen] = useState(false)
  const [tableModalOpen, setTableModalOpen] = useState(false)
  const [orderMode, setOrderMode] = useState<'online' | 'dine_in' | null>(null)
  const [tableOptions, setTableOptions] = useState<Array<{ id: number; name: string; area?: string; status: string }>>([])
  const [pickedTable, setPickedTable] = useState<number | null>(null)
  const tableId = useCartStore((s) => s.tableId)
  const setTableId = useCartStore((s) => s.setTableId)
  const setTableSessionToken = useCartStore((s) => s.setTableSessionToken)

  // -- Filter States --
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'latest')
  const [activeIngredient, setActiveIngredient] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000])
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filters, setFilters] = useState({
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
    rating: searchParams.get('rating') || '',
  })
  const [categoryId, setCategoryId] = useState<string>(searchParams.get('category') || '')
  const [categories, setCategories] = useState<Category[]>([])

  const debouncedSearch = useDebounce(searchQuery, 300)

  useEffect(() => {
    categoryService.getPublicCategories({ status: 'active' }).then((list) => {
      const active = (list ?? []).filter((c) => c.is_active !== false)
      active.sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'vi')
      )
      setCategories(active)
    })
  }, [])

  useEffect(() => {
    const savedViewMode = window.localStorage.getItem('products-view-mode')
    if (savedViewMode === 'grid' || savedViewMode === 'table') {
      setViewMode(savedViewMode)
    }
  }, [])

  useEffect(() => {
    const mode = window.localStorage.getItem('HDG_order_mode')
    if (mode === 'online' || mode === 'dine_in') {
      setOrderMode(mode)
    } else {
      setOrderMode(null)
    }
  }, [])

  useEffect(() => {
    if (orderMode === 'online') return
    if (tableId) return
    setTableModalOpen(true)
    api.get('/tables/public-list')
      .then((res) => setTableOptions(res.data?.data || []))
      .catch(() => setTableOptions([]))
  }, [tableId, orderMode])

  const handleSelectTable = async () => {
    if (!pickedTable) return
    try {
      const res = await api.post(`/tables/${pickedTable}/claim-session`)
      const token = res.data?.data?.session_token || null
      setTableId(pickedTable)
      setTableSessionToken(token)
      window.localStorage.setItem('HDG_order_mode', 'dine_in')
      window.localStorage.setItem('HDG_table_id', String(pickedTable))
      if (token) window.localStorage.setItem('HDG_table_session_token', token)
      setTableModalOpen(false)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Bàn này đang bận, vui lòng chọn bàn khác.')
    }
  }

  const setComboOnlyInUrl = (next: boolean) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (next) sp.set('combo', '1')
    else sp.delete('combo')
    const qs = sp.toString()
    router.push(qs ? `/products?${qs}` : '/products', { scroll: false })
  }

  const handleCategoryChange = (id: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (id) sp.set('category', id)
    else sp.delete('category')
    const qs = sp.toString()
    router.push(qs ? `/products?${qs}` : '/products', { scroll: false })
  }

  const selectedCategoryLabel = categories.find((c) => String(c.id) === categoryId)?.name

  const handleViewModeChange = (nextMode: ViewMode) => {
    setViewMode(nextMode)
    window.localStorage.setItem('products-view-mode', nextMode)
  }

  // Đồng bộ ?category= từ URL (menu Thực đơn)
  useEffect(() => {
    setCategoryId(searchParams.get('category') || '')
  }, [searchParams])

  // Fetch products hoặc combos
  const fetchProducts = async () => {
    setLoading(true)
    try {
      if (comboOnly) {
        const result = await comboService.getAll()
        let list = result.data || []
        const q = debouncedSearch.trim().toLowerCase()
        if (q) {
          list = list.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.description && c.description.toLowerCase().includes(q))
          )
        }
        if (priceRange[1] < 500000) {
          list = list.filter((c) => c.final_price <= priceRange[1])
        }
        list = [...list].sort((a, b) => {
          switch (sortBy) {
            case 'price_asc':
              return a.final_price - b.final_price
            case 'price_desc':
              return b.final_price - a.final_price
            case 'name_asc':
              return a.name.localeCompare(b.name, 'vi')
            case 'name_desc':
              return b.name.localeCompare(a.name, 'vi')
            case 'best_selling':
            case 'rating':
              return (b as any).sold_count - (a as any).sold_count
            default:
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          }
        })
        setComboListFiltered(list)
        setLastPage(Math.max(1, Math.ceil(list.length / 12)))
        setTotal(list.length)
        setProducts([])
      } else {
        setComboListFiltered([])
        const params: any = { paginate: 12, sort: sortBy, page }
        if (categoryId) {
          const n = Number(categoryId)
          if (Number.isFinite(n) && n > 0) params.category = n
        }
        if (debouncedSearch) params.search = debouncedSearch
        if (activeIngredient) params.search = activeIngredient
        if (priceRange[1] < 500000) params.max_price = priceRange[1]
        if (filters.minPrice) params.min_price = filters.minPrice
        if (filters.rating) params.rating = filters.rating

        const response = await productService.getAll(params)
        const data = response?.data || []
        const processedData = data.map((item: any, idx: number) => ({
          ...item,
          is_best_seller: item.sold_count > 50 || idx % 4 === 0,
          fast_delivery: idx % 3 === 0,
          rating_avg: item.rating_avg || (4.5 + (idx % 5) * 0.1).toFixed(1),
        }))
        setProducts(processedData)
        setLastPage(response?.meta?.last_page ?? 1)
        setTotal(response?.meta?.total ?? data.length)
      }
    } catch {
      setProducts([])
      setComboListFiltered([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [debouncedSearch, sortBy, activeIngredient, priceRange, filters, page, categoryId, comboOnly])

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, sortBy, activeIngredient, priceRange, filters, categoryId, comboOnly])

  const displayedCombos = comboOnly
    ? comboListFiltered.slice((page - 1) * 12, page * 12)
    : []

  const handleSortChange = (newSort: string) => setSortBy(newSort)
  const handleApplyFilters = (newFilters: typeof filters) => setFilters(newFilters)
  const handleResetAll = () => {
    setActiveIngredient('')
    setPriceRange([0, 500000])
    setSearchQuery('')
    setSortBy('latest')
    setFilters({ minPrice: '', maxPrice: '', rating: '' })
    setCategoryId('')
    setPage(1)
    router.push('/products')
  }

  const handleSidebarReset = () => {
    setActiveIngredient('')
    setPriceRange([0, 500000])
    setSearchQuery('')
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete('combo')
    sp.delete('category')
    const qs = sp.toString()
    router.push(qs ? `/products?${qs}` : '/products')
  }

  const breadcrumbItems = comboOnly
    ? [
        { label: 'Thực đơn', href: '/products' },
        { label: 'Combo', href: '/products?combo=1' },
      ]
    : [{ label: 'Thực đơn', href: '/products' }]

  return (
    <div className="min-h-screen bg-slate-50 font-lexend">
      <div className="container mx-auto px-4 pt-8 pb-20">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl px-6 py-2 shadow-sm mb-8 inline-block">
           <Breadcrumbs items={breadcrumbItems} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <ProductSidebar
              categories={categories}
              selectedCategoryId={categoryId}
              onCategoryChange={handleCategoryChange}
              onIngredientFilter={setActiveIngredient}
              onPriceFilter={(min, max) => setPriceRange([min, max])}
              onReset={handleSidebarReset}
              activeIngredient={activeIngredient}
              priceRange={priceRange}
              comboOnly={comboOnly}
              onComboOnlyChange={setComboOnlyInUrl}
              onSelectCombo={(c) => {
                setSelectedCombo(c)
                setComboBuilderOpen(true)
              }}
            />

          {/* Main Content Area */}
          <main className="flex-1">
             {tableId && (
               <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sticky top-20 z-20">
                 <p className="text-sm font-semibold text-slate-700">
                   Bạn đang ngồi: <span className="text-[#ed2a2a] font-bold">Bàn {String(tableId).padStart(2, '0')}</span>
                 </p>
                 <button
                   onClick={() => setTableModalOpen(true)}
                   className="text-xs font-semibold text-slate-500 hover:text-[#ed2a2a]"
                 >
                   Đổi bàn
                 </button>
               </div>
             )}
             {/* Toolbar Section - SEO Optimization H2 */}
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
                <div>
                   <h2 className="font-playfair text-2xl md:text-3xl font-bold text-slate-800">
                      {comboOnly
                        ? 'Combo tiết kiệm'
                        : selectedCategoryLabel
                          ? selectedCategoryLabel
                          : activeIngredient
                            ? `Món ${activeIngredient}`
                            : 'Tất cả thực đơn'}
                   </h2>
                   <p className="text-slate-400 text-sm mt-1 font-medium italic">
                      {comboOnly
                        ? 'Chọn combo, tùy chỉnh món trong gói — tiết kiệm hơn mua lẻ'
                        : selectedCategoryLabel
                          ? `Món trong danh mục · ${selectedCategoryLabel}`
                          : `Duyệt qua danh sách món ngon ${activeIngredient ? `· ${activeIngredient}` : ''}`}
                   </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full md:w-auto">
                   <div className="flex-1 md:flex-none relative">
                      <input 
                         type="text" 
                         placeholder="Tìm món ngon..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full md:w-64 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-HDG-500/20 transition-all"
                         suppressHydrationWarning
                      />
                      <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   </div>
                   <div className="w-px h-8 bg-slate-100 hidden md:block" />
                   <button 
                      type="button"
                      onClick={() => setIsFilterOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-HDG-600 font-bold text-sm transition-colors"
                      suppressHydrationWarning
                   >
                      <SlidersHorizontal size={16} />
                      <span className="hidden sm:inline">Lọc thêm</span>
                   </button>
                </div>
             </div>

             {/* Sort + View Toolbar */}
             <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex-1">
                   <SortBar currentSort={sortBy} onSortChange={handleSortChange} />
                </div>

                {!comboOnly && (
                   <div className="inline-flex items-center self-end rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                      <button
                         type="button"
                         onClick={() => handleViewModeChange('table')}
                         aria-pressed={viewMode === 'table'}
                         className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                            viewMode === 'table'
                              ? 'bg-slate-900 text-white shadow-lg'
                              : 'text-slate-500 hover:text-slate-800'
                         }`}
                      >
                         <ListIcon size={15} />
                         Bảng
                      </button>
                      <button
                         type="button"
                         onClick={() => handleViewModeChange('grid')}
                         aria-pressed={viewMode === 'grid'}
                         className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                            viewMode === 'grid'
                              ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20'
                              : 'text-slate-500 hover:text-slate-800'
                         }`}
                      >
                         <LayoutGrid size={15} />
                         Lưới
                      </button>
                   </div>
                )}
             </div>

             {/* Products View */}
             {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                   {Array(6).fill(0).map((_, i) => (
                      <ProductSkeleton key={i} />
                   ))}
                </div>
             ) : comboOnly && displayedCombos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                   {displayedCombos.map((combo) => (
                      <ComboCatalogCard
                        key={combo.id}
                        combo={combo}
                        onSelect={(c) => {
                          setSelectedCombo(c)
                          setComboBuilderOpen(true)
                        }}
                        detailHref={`/combos/${combo.id}`}
                      />
                   ))}
                </div>
             ) : !comboOnly && products.length > 0 ? (
                viewMode === 'table' ? (
                   <ProductsTableView products={products} />
                ) : (
                   <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8"
                   >
                      {products.map((product, index) => (
                         <FoodListCard key={product.id} product={product} index={index} />
                      ))}
                   </motion.div>
                )
             ) : comboOnly ? (
                <div className="rounded-[2rem] border border-slate-100 bg-gradient-to-b from-white to-red-50/40 p-12 text-center shadow-[0_12px_40px_rgb(0,0,0,0.06)] md:p-16">
                   <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#ed2a2a]/10 text-[#ed2a2a]">
                      <Gift className="h-12 w-12" strokeWidth={1.5} />
                   </div>
                   <h3 className="font-playfair text-2xl font-black text-slate-900 md:text-3xl">
                      Chưa có combo phù hợp
                   </h3>
                   <p className="mx-auto mt-3 max-w-md text-sm font-medium text-slate-500">
                      Thử bỏ bộ lọc giá hoặc từ khóa — hoặc xem toàn bộ thực đơn món lẻ của HDG Food.
                   </p>
                   <button
                      type="button"
                      onClick={() => setComboOnlyInUrl(false)}
                      className="mt-8 rounded-2xl bg-[#ed2a2a] px-10 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/25 transition-all hover:bg-slate-900"
                   >
                      Xem tất cả món ăn
                   </button>
                </div>
             ) : (
                <div className="bg-white rounded-[3rem] p-20 text-center space-y-6 shadow-sm border border-slate-50">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                      <Search size={40} />
                   </div>
                   <div className="max-w-xs mx-auto space-y-2">
                      <h3 className="font-playfair text-2xl font-bold text-slate-800 italic">Hết món rồi nè!</h3>
                      <p className="text-slate-400 text-sm font-medium">Chúng mình chưa có thực đơn tại khu vực này. Bạn thử chọn tỉnh thành khác nhé!</p>
                   </div>
                   <button 
                      onClick={handleResetAll}
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-HDG-600 transition-all shadow-xl shadow-slate-200"
                   >
                      Xem thực đơn tất cả khu vực
                   </button>
                </div>
             )}

             {/* Pagination */}
             {lastPage > 1 && (comboOnly ? displayedCombos.length > 0 : products.length > 0) && (
               <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 px-5 py-4 shadow-sm">
                 <p className="text-sm text-slate-500 font-medium">
                   Trang <span className="font-black text-slate-800">{page}</span> / {lastPage}
                   <span className="ml-2 text-slate-400">· {total} {comboOnly ? 'combo' : 'món'}</span>
                 </p>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                     disabled={page === 1 || loading}
                     className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50 transition-all"
                   >
                     ← Trước
                   </button>

                   {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
                     const p = lastPage <= 5 ? i + 1 : Math.max(1, page - 2) + i
                     if (p > lastPage) return null
                     return (
                       <button key={p} onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                         className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${
                           page === p ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                         }`}>
                         {p}
                       </button>
                     )
                   })}

                   <button
                     onClick={() => { setPage(p => Math.min(lastPage, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                     disabled={page === lastPage || loading}
                     className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-slate-50 transition-all"
                   >
                     Sau →
                   </button>
                 </div>
               </div>
             )}
          </main>
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />

      <ComboBuilder
        combo={selectedCombo}
        isOpen={comboBuilderOpen}
        onClose={() => {
          setComboBuilderOpen(false)
          setSelectedCombo(null)
        }}
      />

      {tableModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/45" onClick={() => tableId && setTableModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Bạn đang ngồi bàn số mấy?</h3>
            <p className="mt-1 text-sm text-slate-500">Chọn đúng bàn để đơn đổ đúng khu vực phục vụ.</p>
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[55vh] overflow-y-auto">
              {tableOptions.map((t) => {
                const disabled = t.status !== 'available'
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPickedTable(t.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200'
                        : pickedTable === t.id
                          ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a]'
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{disabled ? 'Đang có khách' : (t.area || 'Khu chung')}</p>
                  </button>
                )
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              {tableId && (
                <button
                  type="button"
                  onClick={() => setTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  Đóng
                </button>
              )}
              <button
                type="button"
                onClick={handleSelectTable}
                disabled={!pickedTable}
                className="px-4 py-2 rounded-xl bg-[#ed2a2a] text-white text-sm font-semibold disabled:opacity-50"
              >
                Xác nhận bàn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductsTableView({ products }: { products: Product[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50/90">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Sản phẩm</th>
              <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Danh mục</th>
              <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Đánh giá</th>
              <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Đã bán</th>
              <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Giá</th>
              <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Chi tiết</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {products.map((product) => {
              const price = product.final_price ?? product.price
              const hasDiscount = product.price > price
              const rating = Number(product.rating_avg ?? 4.8).toFixed(1)

              return (
                <tr key={product.id} className="group transition-colors hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <Link href={`/products/${product.slug}`} className="flex min-w-[320px] items-center gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        <img
                          src={product.image || '/placeholder.png'}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="line-clamp-2 font-bold text-slate-800 transition-colors group-hover:text-[#ed2a2a]">
                          {product.name}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {product.description || 'Món ngon được chế biến và giao nhanh từ HDG Food.'}
                        </p>
                      </div>
                    </Link>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {product.category?.name || 'Chưa phân loại'}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-slate-700">{rating}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-600">
                    {(product.sold_count ?? 0).toLocaleString('vi-VN')} suất
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex flex-col items-end">
                      {hasDiscount && (
                        <span className="text-xs font-medium text-slate-300 line-through">
                          {product.price.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                      <span className="text-base font-black text-[#ed2a2a]">
                        {price.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-[#ed2a2a]"
                    >
                      Xem món
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

// Skeleton Component cho loading state
function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-50 animate-pulse">
      <div className="h-48 bg-slate-200" />
      <div className="p-6 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="h-6 bg-slate-200 rounded w-1/3 mt-4" />
      </div>
    </div>
  )
}

function ProductsSkeleton() {
   return (
      <div className="min-h-screen bg-slate-50">
         <div className="h-[400px] bg-slate-800 animate-pulse" />
         <div className="container mx-auto px-4 -mt-12">
            <div className="h-20 bg-white rounded-2xl mb-8 animate-pulse" />
            <div className="flex gap-8">
               <div className="hidden lg:block w-80 h-[600px] bg-white rounded-[2rem] animate-pulse" />
               <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
                  {Array(6).fill(0).map((_, i) => (
                     <div key={i} className="h-80 bg-white rounded-2xl animate-pulse" />
                  ))}
               </div>
            </div>
         </div>
      </div>
   )
}
