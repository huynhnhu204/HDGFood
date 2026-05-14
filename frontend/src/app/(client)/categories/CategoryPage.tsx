'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Beef,
  CupSoda,
  Flame,
  Heart,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Soup,
  Tag,
  Utensils,
  X,
} from 'lucide-react'
import api from '@/services/api'
import { categoryService } from '@/services/category.service'
import { profileService } from '@/services/profile.service'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/useCartStore'
import { toast } from 'sonner'

type SortValue = 'latest' | 'price_asc' | 'price_desc' | 'popular'
type TasteTag = 'spicy' | 'vegetarian' | 'best_seller'
type ViewMode = 'grid' | 'table'

interface CategoryItem {
  id: number
  name: string
  slug: string
}

interface ProductItem {
  id: number
  name: string
  slug: string
  description?: string
  price: number
  final_price?: number
  image?: string
  sold_count?: number
  is_best_seller?: boolean
  stock?: number
  is_available?: boolean
  category_id?: number
  category?: { id?: number; name?: string }
}

const PRICE_MIN = 20000
const PRICE_MAX = 200000
const LOAD_MORE_STEP = 8

const TASTE_TAGS: Array<{ id: TasteTag; label: string }> = [
  { id: 'spicy', label: 'Mon cay' },
  { id: 'vegetarian', label: 'Mon chay' },
  { id: 'best_seller', label: 'Best Seller' },
]

function iconForCategory(name: string) {
  const n = name.toLowerCase()
  if (n.includes('com')) return Beef
  if (n.includes('bun') || n.includes('pho') || n.includes('mien')) return Soup
  if (n.includes('nuoc') || n.includes('tra') || n.includes('drink')) return CupSoda
  if (n.includes('combo')) return Tag
  return Utensils
}

function matchesTasteTag(product: ProductItem, tag: TasteTag) {
  const text = `${product.name} ${product.description || ''}`.toLowerCase()
  if (tag === 'spicy') return text.includes('cay') || text.includes('spicy')
  if (tag === 'vegetarian') return text.includes('chay') || text.includes('vegan')
  if (tag === 'best_seller') return (product.is_best_seller ?? false) || (product.sold_count ?? 0) > 30
  return true
}

function isKitchenClosed(product: Pick<ProductItem, 'is_available' | 'stock'>) {
  return product.is_available === false || (typeof product.stock === 'number' && product.stock <= 0)
}

function ProductCard({
  product,
  isFavorite,
  isTogglingFavorite,
  onToggleFavorite,
}: {
  product: ProductItem
  isFavorite: boolean
  isTogglingFavorite: boolean
  onToggleFavorite: (productId: number, nextFavorite: boolean) => void
}) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const price = product.final_price ?? product.price
  const hasDiscount = product.price > price
  const kitchenClosed = isKitchenClosed(product)

  const badge = hasDiscount
    ? 'Khuyen mai'
    : (product.is_best_seller || (product.sold_count ?? 0) > 30)
      ? 'Hot'
      : 'New'

  const handleQuickAdd = () => {
    if (kitchenClosed) return
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image || '/placeholder.png',
      price,
      quantity: 1,
    })
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/products/${product.slug}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/products/${product.slug}`)
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-200/20"
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <img
            src={product.image || '/placeholder.png'}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#ed2a2a] shadow">
            {badge}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(product.id, !isFavorite)
            }}
            disabled={isTogglingFavorite}
            aria-label={isFavorite ? 'Bo yeu thich' : 'Them vao yeu thich'}
            className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full shadow transition-all ${
              isFavorite
                ? 'bg-red-50 text-[#ed2a2a]'
                : 'bg-white/90 text-slate-500 hover:text-[#ed2a2a]'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-[#ed2a2a]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleQuickAdd()
            }}
            disabled={kitchenClosed}
            className={`absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-bold shadow-lg transition-all duration-300 ${
              kitchenClosed
                ? 'bg-slate-300 text-slate-600 cursor-not-allowed opacity-100'
                : 'bg-[#ed2a2a] text-white opacity-0 group-hover:opacity-100'
            }`}
          >
            {kitchenClosed ? 'Đóng bếp' : <><Plus className="h-3.5 w-3.5" /> Them nhanh</>}
          </button>
        </div>
      </Link>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-[15px] font-semibold text-slate-900">{product.name}</h3>
        <p className="line-clamp-2 min-h-[36px] text-xs leading-relaxed text-slate-400">
          {product.description || 'Mon ngon duoc che bien moi ngay tai HDG Food.'}
        </p>
        <div className="flex items-end justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-[#ed2a2a]">{Math.round(price).toLocaleString('vi-VN')}đ</span>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through">{Math.round(product.price).toLocaleString('vi-VN')}đ</span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleQuickAdd()
            }}
            disabled={kitchenClosed}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 transition-colors ${
              kitchenClosed
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-slate-100 text-slate-700 hover:bg-[#ed2a2a] hover:text-white'
            }`}
            aria-label={kitchenClosed ? `${product.name} dang dong bep` : `Them ${product.name} vao gio`}
          >
            {kitchenClosed ? <span className="text-[10px] font-bold uppercase">Đóng bếp</span> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  )
}

function SidebarContent({
  categories,
  selectedCategory,
  onSelectCategory,
  maxPrice,
  onMaxPriceChange,
  selectedTags,
  onToggleTag,
}: {
  categories: CategoryItem[]
  selectedCategory: number | 'all'
  onSelectCategory: (value: number | 'all') => void
  maxPrice: number
  onMaxPriceChange: (value: number) => void
  selectedTags: TasteTag[]
  onToggleTag: (tag: TasteTag) => void
}) {
  return (
    <div className="space-y-7">
      <section>
        <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Danh muc</h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#ed2a2a] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Utensils className="h-4 w-4" /> Tat ca
          </button>
          {categories.map((cat) => {
            const Icon = iconForCategory(cat.name)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#ed2a2a] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" /> {cat.name}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Loc theo gia</h3>
        <div className="rounded-2xl bg-white p-4">
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={5000}
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#ed2a2a]"
          />
          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{PRICE_MIN.toLocaleString('vi-VN')}đ</span>
            <span className="text-[#ed2a2a]">Den {maxPrice.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Theo so thich</h3>
        <div className="flex flex-wrap gap-2">
          {TASTE_TAGS.map((tag) => {
            const active = selectedTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggleTag(tag.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  active ? 'bg-[#ed2a2a] text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function CategoryPage() {
  const user = useAuthStore((s) => s.user)
  const [mounted, setMounted] = useState(false)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [allProducts, setAllProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [togglingFavoriteIds, setTogglingFavoriteIds] = useState<Set<number>>(new Set())

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX)
  const [sortBy, setSortBy] = useState<SortValue>('latest')
  const [selectedTags, setSelectedTags] = useState<TasteTag[]>([])
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [cats, productRes] = await Promise.all([
          categoryService.getPublicCategories({ status: 'active' }),
          api.get('/products', { params: { paginate: 300, sort: 'latest' } }),
        ])

        setCategories((Array.isArray(cats) ? cats : []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })))

        const raw = (productRes.data?.data || productRes.data || []) as ProductItem[]
        setAllProducts(Array.isArray(raw) ? raw : [])
      } catch {
        setCategories([])
        setAllProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    setVisibleCount(LOAD_MORE_STEP)
  }, [search, selectedCategory, maxPrice, sortBy, selectedTags])

  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) {
        setFavoriteIds(new Set())
        return
      }
      try {
        const res = await profileService.getWishlist()
        const list = Array.isArray(res?.data) ? res.data : []
        setFavoriteIds(new Set(list.map((item: any) => Number(item.product_id)).filter(Boolean)))
      } catch {
        setFavoriteIds(new Set())
      }
    }
    loadWishlist()
  }, [user])

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    const list = allProducts.filter((p) => {
      const price = p.final_price ?? p.price
      const categoryId = p.category_id ?? p.category?.id

      const passCategory = selectedCategory === 'all' ? true : categoryId === selectedCategory
      const passSearch =
        keyword.length === 0
          ? true
          : `${p.name} ${p.description || ''}`.toLowerCase().includes(keyword)
      const passPrice = price >= PRICE_MIN && price <= maxPrice
      const passTags = selectedTags.every((tag) => matchesTasteTag(p, tag))

      return passCategory && passSearch && passPrice && passTags
    })

    const sorted = [...list].sort((a, b) => {
      const pa = a.final_price ?? a.price
      const pb = b.final_price ?? b.price
      if (sortBy === 'price_asc') return pa - pb
      if (sortBy === 'price_desc') return pb - pa
      if (sortBy === 'popular') return (b.sold_count ?? 0) - (a.sold_count ?? 0)
      return b.id - a.id
    })

    return sorted
  }, [allProducts, search, selectedCategory, maxPrice, sortBy, selectedTags])

  const visibleProducts = filteredProducts.slice(0, visibleCount)
  const canLoadMore = visibleCount < filteredProducts.length

  const toggleTag = (tag: TasteTag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))
  }

  const handleToggleFavorite = async (productId: number, nextFavorite: boolean) => {
    if (!user) {
      toast.error('Vui long dang nhap de su dung yeu thich')
      return
    }

    setTogglingFavoriteIds((prev) => new Set([...prev, productId]))
    try {
      if (nextFavorite) {
        await profileService.addToWishlist(productId)
        setFavoriteIds((prev) => new Set([...prev, productId]))
        toast.success('Da them vao yeu thich')
      } else {
        await profileService.removeFromWishlist(productId)
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          next.delete(productId)
          return next
        })
        toast.success('Da bo yeu thich')
      }
    } catch {
      toast.error('Khong the cap nhat yeu thich')
    } finally {
      setTogglingFavoriteIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 font-lexend">
        <div className="container mx-auto px-4 py-10 lg:py-12">
          <div className="mb-8">
            <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="rounded-[2rem] border border-slate-100 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#ed2a2a]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-lexend">
      <div className="container mx-auto px-4 py-10 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">Thuc don theo danh muc</h1>
          <p className="mt-1 text-sm text-slate-500">Sidebar loc nhanh + card sang trong, toi uu cho F&B.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[2rem] border border-slate-100 bg-slate-50 p-5 shadow-sm">
              <SidebarContent
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                maxPrice={maxPrice}
                onMaxPriceChange={setMaxPrice}
                selectedTags={selectedTags}
                onToggleTag={toggleTag}
              />
            </div>
          </aside>

          <main>
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tim mon an..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-medium text-slate-700"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortValue)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                >
                  <option value="latest">Moi nhat</option>
                  <option value="price_asc">Gia tang dan</option>
                  <option value="price_desc">Gia giam dan</option>
                  <option value="popular">Pho bien</option>
                </select>
                <div className="hidden items-center rounded-xl border border-slate-200 p-1 md:inline-flex">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                      viewMode === 'grid' ? 'bg-[#ed2a2a] text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Luoi
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                      viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ListIcon className="h-3.5 w-3.5" /> Bang
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#ed2a2a]" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-[2rem] border border-slate-100 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-[#ed2a2a]">
                  <Flame className="h-9 w-9" />
                </div>
                <h2 className="text-xl font-black text-slate-900">Rat tiec, HDG chua co mon nay</h2>
                <p className="mt-2 text-sm text-slate-500">Ban thu doi danh muc hoac tu khoa khac nhe.</p>
              </div>
            ) : viewMode === 'table' ? (
              <ProductsTableView products={filteredProducts} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isFavorite={favoriteIds.has(product.id)}
                      isTogglingFavorite={togglingFavoriteIds.has(product.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>

                {canLoadMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
                      className="rounded-full bg-[#ed2a2a] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-200 transition-transform hover:scale-105"
                    >
                      Xem them
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMobileFilterOpen(true)}
        className="fixed bottom-6 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#ed2a2a] px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-red-200 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" /> Loc
      </button>

      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setMobileFilterOpen(false)} aria-label="Close filter" />
          <div className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-[2rem] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Bo loc</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              maxPrice={maxPrice}
              onMaxPriceChange={setMaxPrice}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
            />
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="mt-5 w-full rounded-xl bg-[#ed2a2a] py-3 text-sm font-bold text-white"
            >
              Ap dung
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductsTableView({ products }: { products: ProductItem[] }) {
  const addItem = useCartStore((s) => s.addItem)

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Mon an</th>
              <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Danh muc</th>
              <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Da ban</th>
              <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Gia</th>
              <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Them</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => {
              const price = p.final_price ?? p.price
              const hasDiscount = p.price > price
              const kitchenClosed = isKitchenClosed(p)
              return (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.slug}`} className="flex items-center gap-3">
                      <img
                        src={p.image || '/placeholder.png'}
                        alt={p.name}
                        className="h-12 w-12 rounded-xl object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-bold text-slate-800">{p.name}</p>
                        <p className="line-clamp-1 text-xs text-slate-400">{p.description || 'Mon ngon moi ngay'}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-600">{p.category?.name || 'Chua phan loai'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-600">{(p.sold_count ?? 0).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      {hasDiscount && <span className="text-xs text-slate-400 line-through">{Math.round(p.price).toLocaleString('vi-VN')}đ</span>}
                      <span className="text-sm font-black text-[#ed2a2a]">{Math.round(price).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        addItem({
                          productId: p.id,
                          name: p.name,
                          slug: p.slug,
                          image: p.image || '/placeholder.png',
                          price,
                          quantity: 1,
                        })
                      }
                      disabled={kitchenClosed}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                        kitchenClosed
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-[#ed2a2a] text-white'
                      }`}
                    >
                      {kitchenClosed ? 'Đóng bếp' : 'Them'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
