'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, Sparkles, SlidersHorizontal } from 'lucide-react'
import FoodListCard from '@/components/products/FoodListCard'
import ComboMiniCard from '@/components/combos/ComboMiniCard'
import { productService } from '@/services/product.service'
import { comboService } from '@/services/combo.service'
import type { Combo } from '@/types/combo'
import type { Product } from '@/types'

type QuickFilter = 'price_asc' | 'low_cal' | 'popular'
type MoodFilter = 'cooling' | null

type SearchItem =
  | { type: 'product'; product: Product }
  | { type: 'combo'; combo: Combo }

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: 'price_asc', label: 'Giá thấp đến cao' },
  { key: 'low_cal', label: 'Calo thấp' },
  { key: 'popular', label: 'Phổ biến' },
]

const KEYWORD_SUGGESTIONS: Array<{ key: string; suggest: string[] }> = [
  { key: 'd', suggest: ['Dưa hấu', 'Dừa tươi', 'Dinh dưỡng'] },
  { key: 'do uong mat', suggest: ['Nước ép', 'Sinh tố', 'Trà trái cây'] },
  { key: 'duoi 500 calo', suggest: ['Salad', 'Ức gà', 'Nước ép ít đường'] },
]

const coolingKeywords = ['nước', 'sinh tố', 'trà', 'dừa', 'dưa', 'giải nhiệt', 'mát', 'ice', 'cold']

const getKcal = (p: Product): number => {
  const raw = p.nutrition?.kcal || p.nutrition?.calo || ''
  const parsed = Number(String(raw).replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function highlightText(text: string, keyword: string) {
  if (!keyword.trim()) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'ig')
  const parts = text.split(regex)
  return parts.map((part, idx) =>
    regex.test(part) ? (
      <span key={`${part}-${idx}`} className="font-black text-[#ed2a2a]">
        {part}
      </span>
    ) : (
      part
    )
  )
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = (searchParams.get('q') || '').trim()
  const filter = searchParams.get('filter') as QuickFilter | null

  const [input, setInput] = useState(query)
  const [products, setProducts] = useState<Product[]>([])
  const [combos, setCombos] = useState<Combo[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)

  const parsedCalorieLimit = useMemo(() => {
    const lower = query.toLowerCase()
    const m = lower.match(/duoi\s*(\d+)\s*(calo|kcal)/)
    if (!m) return null
    const n = Number(m[1])
    return Number.isFinite(n) ? n : null
  }, [query])

  const inferredQuickFilter: QuickFilter | null = useMemo(() => {
    if (filter) return filter
    const lower = query.toLowerCase()
    if (/(duoi\s*\d+\s*(calo|kcal)|low cal|it calo|calo thap)/.test(lower)) return 'low_cal'
    return null
  }, [filter, query])

  const moodFilter: MoodFilter = useMemo(() => {
    const lower = query.toLowerCase()
    if (/(do uong mat|giai nhiet|mat lanh|nang nong)/.test(lower)) return 'cooling'
    return null
  }, [query])

  useEffect(() => {
    setInput(query)
  }, [query])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!query) {
        setProducts([])
        setCombos([])
        return
      }
      setLoading(true)
      try {
        const [productRes, comboRes] = await Promise.all([
          productService.getAll({ search: query, paginate: 24 } as any),
          comboService.getAll({ search: query }),
        ])
        if (cancelled) return
        setProducts(Array.isArray(productRes?.data) ? productRes.data : [])
        setCombos(Array.isArray(comboRes?.data) ? comboRes.data : [])
      } catch {
        if (!cancelled) {
          setProducts([])
          setCombos([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [query])

  const results = useMemo(() => {
    let p = [...products]
    let c = [...combos]

    const activeQuick = inferredQuickFilter

    if (activeQuick === 'low_cal') {
      const max = parsedCalorieLimit ?? 500
      p = p.filter((item) => getKcal(item) > 0 && getKcal(item) < max)
    }

    if (moodFilter === 'cooling') {
      p = p.filter((item) => {
        const source = `${item.name} ${item.description || ''}`.toLowerCase()
        return coolingKeywords.some((k) => source.includes(k))
      })
      c = c.filter((item) => {
        const source = `${item.name} ${item.description || ''}`.toLowerCase()
        return coolingKeywords.some((k) => source.includes(k))
      })
    }

    if (activeQuick === 'price_asc') {
      p.sort((a, b) => (a.final_price || a.price) - (b.final_price || b.price))
      c.sort((a, b) => a.final_price - b.final_price)
    }

    if (activeQuick === 'popular') {
      p.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
      c.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
    }

    const merged: SearchItem[] = []
    p.forEach((item) => merged.push({ type: 'product', product: item }))
    c.forEach((item) => merged.push({ type: 'combo', combo: item }))
    return merged
  }, [products, combos, inferredQuickFilter, parsedCalorieLimit, moodFilter])

  const aiSuggestion = useMemo(() => {
    const lower = query.toLowerCase()
    if (!lower) return 'Hãy nhập từ khóa để AI phân tích sâu hơn về dinh dưỡng và hương vị.'
    if (/(duoi\s*\d+\s*(calo|kcal)|low cal|it calo|calo thap)/.test(lower)) {
      return 'Dựa trên từ khóa của bạn, AI ưu tiên nhóm món dưới 500 kcal, nhiều rau và protein nạc để no lâu nhưng vẫn nhẹ bụng.'
    }
    if (/(do uong mat|giai nhiet|mat lanh|nang nong)/.test(lower)) {
      return 'AI nhận diện nhu cầu giải nhiệt, nên ưu tiên sinh tố ít đường, nước ép tươi và món có thành phần mát.'
    }
    if (lower.length === 1 && lower === 'd') {
      return 'Bạn đang tìm theo chữ cái đầu "D". AI gợi ý thử Dừa tươi, Dưa hấu và nhóm món Dinh dưỡng.'
    }
    return `AI đang ưu tiên các món phù hợp nhất với "${query}", cân bằng giữa độ phổ biến, giá và mức calo.`
  }, [query])

  const suggestionOptions = useMemo(() => {
    const lower = input.trim().toLowerCase()
    if (!lower) return []
    const hard = KEYWORD_SUGGESTIONS.find((x) => x.key === lower)
    if (hard) return hard.suggest
    if (lower.length === 1) {
      const source = [...products.map((p) => p.name), ...combos.map((c) => c.name)]
      return source.filter((name) => name.toLowerCase().startsWith(lower)).slice(0, 5)
    }
    return []
  }, [input, products, combos])

  const submitSearch = (nextQuery?: string) => {
    const q = (nextQuery ?? input).trim()
    const sp = new URLSearchParams(searchParams.toString())
    if (q) sp.set('q', q)
    else sp.delete('q')
    router.push(`/search?${sp.toString()}`)
    setShowSuggest(false)
  }

  const setQuickFilter = (next: QuickFilter) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('filter', next)
    if (query) sp.set('q', query)
    router.push(`/search?${sp.toString()}`)
  }

  return (
    <div className="container mx-auto px-4 py-10 lg:py-14">
      <section className="rounded-[2rem] bg-gradient-to-b from-white to-red-50/40 p-6 shadow-sm border border-slate-100 lg:p-10">
        <div className="relative mx-auto max-w-4xl">
          <div className="relative flex items-center rounded-full border border-slate-200 bg-white p-2 shadow-sm">
            <Search className="ml-4 mr-2 h-5 w-5 text-slate-400" />
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setShowSuggest(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch()
              }}
              placeholder="Tìm món, combo, nhu cầu dinh dưỡng..."
              className="h-12 flex-1 bg-transparent pr-4 text-sm font-semibold text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={() => submitSearch()}
              className="rounded-full bg-[#ed2a2a] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-slate-900"
            >
              Tìm kiếm
            </button>
          </div>

          {showSuggest && suggestionOptions.length > 0 && (
            <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
              {suggestionOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => submitSearch(item)}
                  className="block w-full rounded-xl px-4 py-2 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-[#ed2a2a]"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <h1 className="font-playfair text-3xl font-bold text-slate-900 lg:text-4xl">
            Kết quả tìm kiếm cho: <span className="text-[#ed2a2a]">{query || '...'}</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-400">
            Chúng mình tìm thấy những mỹ vị phù hợp với yêu cầu của bạn.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          {QUICK_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setQuickFilter(item.key)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all ${
                inferredQuickFilter === item.key
                  ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20'
                  : 'border border-slate-200 bg-white text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white">
                  <div className="aspect-square animate-pulse bg-slate-200" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center">
              <p className="text-lg font-bold text-slate-700">Không tìm thấy kết quả phù hợp</p>
              <p className="mt-2 text-sm text-slate-400">Thử từ khóa khác hoặc chọn bộ lọc khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((item, idx) => (
                <motion.div
                  key={item.type === 'product' ? `p-${item.product.id}` : `c-${item.combo.id}`}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, delay: idx * 0.04 }}
                >
                  {item.type === 'product' ? (
                    <div>
                      <FoodListCard product={item.product as any} index={idx} />
                      <p className="mt-2 line-clamp-2 px-1 text-xs font-medium text-slate-500">
                        {highlightText(item.product.description || item.product.name, query)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <ComboMiniCard combo={item.combo} onSelect={() => router.push('/combos')} />
                      <p className="mt-2 line-clamp-2 px-1 text-xs font-medium text-slate-500">
                        {highlightText(item.combo.description || item.combo.name, query)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[2rem] border border-red-100 bg-red-50 p-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-red-600">
              <Sparkles size={18} /> AI Phân tích
            </h3>
            <p className="text-xs leading-relaxed text-red-900">{aiSuggestion}</p>
          </div>
        </aside>
      </section>
    </div>
  )
}
