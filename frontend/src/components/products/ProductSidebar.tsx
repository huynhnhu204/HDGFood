'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, SlidersHorizontal, Gift, UtensilsCrossed, ChevronRight } from 'lucide-react'
import { productService } from '@/services/product.service'
import { comboService } from '@/services/combo.service'
import type { Category } from '@/types'
import { Combo } from '@/types/combo'
import ComboMiniCard from '@/components/combos/ComboMiniCard'
import { formatPrice } from '@/lib/format'

const INGREDIENTS = [
  { id: 'seafood', label: 'Hải sản', icon: '🦐', keyword: 'hải sản' },
  { id: 'beef', label: 'Thịt bò', icon: '🥩', keyword: 'bò' },
  { id: 'chicken', label: 'Thịt gà', icon: '🍗', keyword: 'gà' },
  { id: 'vegan', label: 'Món chay', icon: '🥗', keyword: 'chay' },
]

interface Props {
  onIngredientFilter: (keyword: string) => void
  onPriceFilter: (min: number, max: number) => void
  onReset: () => void
  activeIngredient?: string
  priceRange: [number, number]
  comboOnly?: boolean
  onComboOnlyChange?: (value: boolean) => void
  onSelectCombo?: (combo: Combo) => void
  /** Danh mục từ API — truyền từ trang /products */
  categories?: Category[]
  /** ID danh mục (chuỗi số) hoặc rỗng = tất cả */
  selectedCategoryId?: string
  onCategoryChange?: (categoryId: string) => void
}

export default function ProductSidebar({
  onIngredientFilter,
  onPriceFilter,
  onReset,
  activeIngredient,
  priceRange,
  comboOnly = false,
  onComboOnlyChange,
  onSelectCombo,
  categories = [],
  selectedCategoryId = '',
  onCategoryChange,
}: Props) {
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [maxPrice, setMaxPrice] = useState(priceRange[1])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarCombos, setSidebarCombos] = useState<Combo[]>([])

  useEffect(() => {
    productService.getAll({ sort: 'rating', limit: 3 } as any)
      .then(res => {
        const sorted = [...(res.data ?? [])].sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0)).slice(0, 3)
        setTopProducts(sorted)
      }).catch(() => {})
  }, [])

  // Fetch combos for sidebar - random 2-3 combos
  useEffect(() => {
    comboService.getAll({ per_page: 10 } as any)
      .then(res => {
        const activeCombos = (res.data ?? []).filter((c: Combo) => c.is_running)
        const shuffled = [...activeCombos].sort(() => Math.random() - 0.5)
        setSidebarCombos(shuffled.slice(0, 3))
      }).catch(() => {})
  }, [])

  const handlePriceChange = (val: number) => {
    setMaxPrice(val)
    onPriceFilter(0, val)
  }

  // Calculate save percent
  const getSavePercent = (combo: Combo) => {
    if (combo.discount_type === 'percent' && combo.discount_value > 0) {
      return Math.round(combo.discount_value)
    }
    if (combo.base_price > 0 && combo.final_price < combo.base_price) {
      return Math.round(((combo.base_price - combo.final_price) / combo.base_price) * 100)
    }
    return 0
  }

  const content = (
    <div className="space-y-5" suppressHydrationWarning>
      {/* Danh mục món */}
      {!comboOnly && onCategoryChange && categories.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <h3
            className="font-black text-slate-800 mb-4 text-sm uppercase tracking-wider"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Danh mục
          </h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onCategoryChange('')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                !selectedCategoryId
                  ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a]'
                  : 'border-slate-100 hover:border-slate-200 text-slate-700'
              }`}
            >
              <span className="text-lg">🍽️</span>
              <span className="text-sm font-bold">Tất cả món</span>
              {!selectedCategoryId && (
                <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ed2a2a]">
                  <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </button>
            {categories.map((cat) => {
              const active = selectedCategoryId === String(cat.id)
              const count = typeof cat.products_count === 'number' ? cat.products_count : undefined
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategoryChange(active ? '' : String(cat.id))}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                    active
                      ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a]'
                      : 'border-slate-100 hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold line-clamp-2">{cat.name}</span>
                    {count != null && (
                      <span className="text-[11px] font-medium text-slate-400">{count} món</span>
                    )}
                  </span>
                  {active && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ed2a2a]">
                      <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Phân loại */}
      {onComboOnlyChange && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <h3
            className="font-black text-slate-800 mb-4 text-sm uppercase tracking-wider"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Phân loại
          </h3>
          <button
            type="button"
            onClick={() => onComboOnlyChange(!comboOnly)}
            suppressHydrationWarning
            aria-pressed={comboOnly}
            aria-label="Lọc chỉ hiển thị combo tiết kiệm"
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${
              comboOnly
                ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a]'
                : 'border-slate-100 hover:border-slate-200 text-slate-700'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ed2a2a]/10 text-[#ed2a2a]">
              <Gift className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-black">Combo tiết kiệm</span>
              <span className="text-[11px] font-medium text-slate-500">Gói ưu đãi, chọn món linh hoạt</span>
            </div>
            {comboOnly && (
              <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ed2a2a]">
                <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </button>
        </div>
      )}

      {/* Thành phần chính */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-black text-slate-800 mb-4 text-sm uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
          Thành phần chính
        </h3>
        <div className="space-y-2.5">
          {INGREDIENTS.map(item => {
            const active = activeIngredient === item.keyword
            return (
              <button
                key={item.id}
                onClick={() => onIngredientFilter(active ? '' : item.keyword)}
                suppressHydrationWarning
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                  active
                    ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a]'
                    : 'border-slate-100 hover:border-slate-200 text-slate-700'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-bold">{item.label}</span>
                {active && (
                  <span className="ml-auto w-4 h-4 rounded-full bg-[#ed2a2a] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mức giá */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-black text-slate-800 mb-4 text-sm uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
          Mức giá
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>0đ</span>
            <span className="text-[#ed2a2a] font-black">{maxPrice.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={0}
              max={500000}
              step={10000}
              value={maxPrice}
              onChange={e => handlePriceChange(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ed2a2a 0%, #ed2a2a ${(maxPrice / 500000) * 100}%, #e2e8f0 ${(maxPrice / 500000) * 100}%, #e2e8f0 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Tối thiểu</span>
            <span>500.000đ</span>
          </div>
          {maxPrice < 500000 && (
            <div className="text-xs text-center text-slate-500 bg-slate-50 rounded-xl py-2 font-medium">
              Hiển thị món dưới <span className="font-black text-[#ed2a2a]">{maxPrice.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
        </div>
      </div>

      {/* Đừng bỏ lỡ */}
      {topProducts.length > 0 && (
        <div className="bg-slate-900 rounded-3xl p-6 text-white">
          <h3 className="font-black text-sm uppercase tracking-wider mb-5 text-slate-300" style={{ fontFamily: 'Georgia, serif' }}>
            ✨ Đừng bỏ lỡ
          </h3>
          <div className="space-y-4">
            {topProducts.map(p => (
              <Link key={p.id} href={`/products/${p.slug}`}
                className="group flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-700 shrink-0">
                  {p.image
                    ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#ed2a2a] transition-colors">
                    {p.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-yellow-400">★ {Number(p.rating_avg ?? 4.8).toFixed(1)}</span>
                    <span className="text-xs font-black text-[#ed2a2a]">
                      {(p.final_price ?? p.price).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Combo Tiết Kiệm - Sticky Mini Cards */}
      {sidebarCombos.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          {/* Section Header */}
          <div className="px-5 pt-5 pb-3 bg-gradient-to-r from-[#0f172a] to-slate-800">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              <h3 className="font-lexend text-sm font-black uppercase tracking-wider text-white">
                Combo Tiết Kiệm
              </h3>
            </div>
            <p className="font-lexend text-[11px] text-slate-400 mt-1">Ưu đãi hấp dẫn mỗi ngày</p>
          </div>

          {/* Mini Combo Cards - Sticky */}
          <div className="sticky top-24 space-y-0 p-4">
            {sidebarCombos.slice(0, 3).map((combo) => (
              <ComboMiniCard
                key={combo.id}
                combo={combo}
                onSelect={onSelectCombo}
              />
            ))}

            {/* Xem tất cả Combo */}
            <Link
              href="/combos"
              className="flex items-center justify-center gap-1.5 py-3 font-lexend text-[11px] font-bold text-[#ed2a2a] hover:text-[#0f172a] transition-colors group"
            >
              <span>Xem tất cả combo ưu đãi</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Banner quảng cáo phụ */}
            <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-[11px] text-red-600 font-medium leading-relaxed flex items-start gap-2">
                <span className="text-sm">🔥</span>
                Đặt đơn trên 500k để nhận ngay mã giảm giá 50k cho lần sau!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset */}
      <button onClick={onReset}
        suppressHydrationWarning
        className="w-full py-3 font-lexend text-xs font-black text-slate-400 hover:text-[#ed2a2a] uppercase tracking-widest transition-colors">
        ↺ Xóa tất cả bộ lọc
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24">
          {content}
        </div>
      </aside>

      {/* Mobile: Filter button */}
      <div className="lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          suppressHydrationWarning
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 shadow-sm"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Bộ lọc
          {(activeIngredient || maxPrice < 500000 || comboOnly || !!selectedCategoryId) && (
            <span className="w-5 h-5 bg-[#ed2a2a] text-white text-[10px] font-black rounded-full flex items-center justify-center">!</span>
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-50 overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-slate-800">Bộ lọc</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  )
}
