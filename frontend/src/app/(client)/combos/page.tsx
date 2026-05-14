'use client'

import { useState, useEffect } from 'react'
import { comboService } from '@/services/combo.service'
import { Combo } from '@/types/combo'
import ComboCatalogCard from '@/components/combos/ComboCatalogCard'
import ComboBuilder from '@/components/combos/ComboBuilder'
import Link from 'next/link'
import { Sparkles, Search, X, Users, User, Building2, Tag, LayoutGrid, List as ListIcon } from 'lucide-react'
import Head from 'next/head'
import Image from 'next/image'

// Filter categories
const FILTERS = [
  { id: 'all', label: 'Tất cả', icon: Sparkles },
  { id: 'solo', label: 'Combo 1 người', icon: User },
  { id: 'family', label: 'Combo gia đình', icon: Users },
  { id: 'office', label: 'Combo văn phòng', icon: Building2 },
]

// Map keywords for each filter
const FILTER_KEYWORDS: Record<string, string[]> = {
  solo: ['1 người', 'cá nhân', 'solo', 'đơn', 'mini'],
  family: ['gia đình', 'family', '2 người', '3 người', '4 người', 'bàn'],
  office: ['văn phòng', 'office', 'công ty', 'lunch', 'trưa', 'buffet'],
}

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchCombos()
    const savedViewMode = window.localStorage.getItem('combos-view-mode')
    if (savedViewMode === 'grid' || savedViewMode === 'table') {
      setViewMode(savedViewMode)
    }
  }, [])

  const fetchCombos = async () => {
    try {
      setLoading(true)
      const result = await comboService.getAll()
      setCombos(result.data)
    } catch (error) {
      console.error('Failed to fetch combos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter combos based on search and category
  const filteredCombos = combos.filter(combo => {
    const matchesSearch = combo.name.toLowerCase().includes(search.toLowerCase()) ||
      combo.description?.toLowerCase().includes(search.toLowerCase())

    let matchesFilter = true
    if (activeFilter !== 'all' && FILTER_KEYWORDS[activeFilter]) {
      const keywords = FILTER_KEYWORDS[activeFilter]
      const comboNameLower = combo.name.toLowerCase()
      matchesFilter = keywords.some(keyword => comboNameLower.includes(keyword.toLowerCase()))
    }

    return matchesSearch && matchesFilter
  })

  const handleSelectCombo = (combo: Combo) => {
    setSelectedCombo(combo)
    setIsBuilderOpen(true)
  }

  const handleViewModeChange = (nextMode: 'grid' | 'table') => {
    setViewMode(nextMode)
    window.localStorage.setItem('combos-view-mode', nextMode)
  }

  // Generate comprehensive JSON-LD Schema
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Combo Siêu Ưu Đãi - Thưởng Thức Mỹ Vị HDG Food',
    description: 'Danh sách các combo ưu đãi từ HDG Food - Tiết kiệm đến 25% khi mua combo thay vì mua lẻ. Combo 1 người, gia đình, văn phòng.',
    url: 'https://hdgfood.vn/products/combos',
    numberOfItems: filteredCombos.length,
    itemListElement: filteredCombos.map((combo, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Offer',
        '@id': `https://hdgfood.vn/products/combos#combo-${combo.id}`,
        name: combo.name,
        description: combo.description || `Combo ${combo.name} bao gồm các món ăn ngon từ HDG Food`,
        image: combo.image || 'https://hdgfood.vn/images/default-combo.jpg',
        url: `https://hdgfood.vn/products/combos#combo-${combo.id}`,
        price: combo.final_price,
        priceCurrency: 'VND',
        priceValidUntil: combo.end_date || undefined,
        availability: combo.is_running 
          ? 'https://schema.org/InStock' 
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'HDG Food',
          url: 'https://hdgfood.vn'
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Các món trong combo',
          itemListElement: combo.groups?.flatMap(group => 
            (group.products || []).map((product: any) => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Product',
                name: product.name,
                image: product.image
              },
              price: product.effective_price || product.price_override || 0,
              priceCurrency: 'VND'
            }))
          ) || []
        },
        ...(combo.discount_value > 0 && {
          discount: {
            '@type': 'Discount',
            discountAmount: combo.discount_type === 'percent' 
              ? `${combo.discount_value}%` 
              : combo.discount_value,
            discountCurrency: combo.discount_type === 'percent' ? '%' : 'VND'
          },
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: combo.base_price,
            priceCurrency: 'VND',
            name: 'Giá gốc'
          }
        })
      }
    })),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Trang chủ',
          item: 'https://hdgfood.vn'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Thực đơn',
          item: 'https://hdgfood.vn/products'
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Combo',
          item: 'https://hdgfood.vn/products/combos'
        }
      ]
    }
  }

  // SEO WebPage schema
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://hdgfood.vn/products/combos#webpage',
    url: 'https://hdgfood.vn/products/combos',
    name: 'Combo Siêu Ưu Đãi - Thưởng Thức Mỹ Vị HDG Food',
    description: 'Khám phá các combo hấp dẫn từ HDG Food. Tiết kiệm đến 25% khi mua combo thay vì mua lẻ. Combo 1 người, gia đình, văn phòng.',
    isPartOf: {
      '@type': 'WebSite',
      name: 'HDG Food',
      url: 'https://hdgfood.vn'
    },
    about: {
      '@type': 'Thing',
      name: 'Combo HDG Food',
      description: 'Các gói combo ưu đãi từ HDG Food'
    }
  }

  return (
    <>
      <Head>
        <title>Combo Siêu Ưu Đãi - Thưởng Thức Mỹ Vị HDG Food</title>
        <meta name="description" content="Danh sách combo HDG Food giảm đến 25%. Combo 1 người, gia đình, văn phòng. Tiết kiệm hơn, ăn ngon hơn với HDG Food." />
        <meta name="keywords" content="combo HDG Food, combo tiết kiệm, combo 1 người, combo gia đình, combo văn phòng, combo giảm giá, ưu đãi HDG Food" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="HDG Food" />
        <link rel="canonical" href="https://hdgfood.vn/products/combos" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hdgfood.vn/products/combos" />
        <meta property="og:title" content="Combo Siêu Ưu Đãi - Thưởng Thức Mỹ Vị HDG Food" />
        <meta property="og:description" content="Khám phá các combo hấp dẫn từ HDG Food. Tiết kiệm đến 25% khi mua combo thay vì mua lẻ." />
        <meta property="og:image" content="https://hdgfood.vn/images/og-combos.jpg" />
        <meta property="og:locale" content="vi_VN" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://hdgfood.vn/products/combos" />
        <meta name="twitter:title" content="Combo Siêu Ưu Đãi - Thưởng Thức Mỹ Vị HDG Food" />
        <meta name="twitter:description" content="Khám phá các combo hấp dẫn từ HDG Food. Tiết kiệm đến 25%." />
        
        {/* JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
        />
      </Head>

      {/* Content Section */}
      <section className="pt-8 pb-12 lg:pt-10 lg:pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          {/* Filter Bar - Glassmorphism Style */}
          <div className="flex flex-col lg:flex-row gap-4 mb-10">
            {/* Filter Pills with Glassmorphism */}
            <div className="flex flex-wrap gap-3">
              {FILTERS.map((filter) => {
                const Icon = filter.icon
                const isActive = activeFilter === filter.id
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    aria-label={`Lọc combo ${filter.label}`}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-[#ed2a2a] text-white shadow-xl shadow-red-500/30 scale-105 ring-2 ring-[#ed2a2a]/50'
                        : 'bg-white/80 backdrop-blur-sm text-slate-600 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                    {filter.label}
                  </button>
                )
              })}
            </div>

            {/* Search with Glassmorphism */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="search"
                placeholder="Tìm kiếm combo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tìm kiếm combo"
                className="w-full pl-12 pr-10 py-3.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-[#ed2a2a] focus:ring-2 focus:ring-red-100 transition-all shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center gap-2 mb-8">
            <Tag className="w-4 h-4 text-[#ed2a2a]" />
            <span className="text-sm text-slate-500">
              <span className="font-bold text-slate-800">{filteredCombos.length}</span> combo được tìm thấy
            </span>

            <div className="ml-auto inline-flex items-center rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => handleViewModeChange('table')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-all ${
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
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={15} />
                Lưới
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-[#ed2a2a] rounded-full animate-spin" />
                <span className="font-bold">Đang tải combos...</span>
              </div>
            </div>
          ) : filteredCombos.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-32 h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-8">
                <Sparkles className="w-16 h-16 text-slate-400" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">Không có combo nào</h2>
              <p className="text-slate-500 max-w-md mx-auto text-lg">
                {search 
                  ? `Không tìm thấy combo nào với từ khóa "${search}"`
                  : 'Hiện tại chưa có combo nào trong danh mục này'
                }
              </p>
              {(search || activeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('')
                    setActiveFilter('all')
                  }}
                  className="mt-6 px-8 py-3 bg-[#ed2a2a] text-white rounded-full text-sm font-bold hover:bg-slate-900 transition-colors shadow-xl"
                >
                  Xem tất cả combo
                </button>
              )}
            </div>
          ) : (
            <main>
              {viewMode === 'table' ? (
                <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead className="bg-slate-50/90">
                        <tr className="border-b border-slate-100">
                          <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Combo</th>
                          <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Nhóm món</th>
                          <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Trạng thái</th>
                          <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Giảm giá</th>
                          <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Giá</th>
                          <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCombos.map((combo) => {
                          const isExpired = combo.end_date && new Date(combo.end_date) < new Date()
                          const isAvailable = combo.is_running && !isExpired
                          const groupNames = combo.groups?.map(g => g.name).join(', ') || 'Chưa cấu hình'
                          const discountLabel = combo.discount_type === 'percent'
                            ? `-${combo.discount_value}%`
                            : `-${Math.round(combo.discount_value).toLocaleString('vi-VN')}đ`

                          return (
                            <tr key={combo.id} id={`combo-${combo.id}`} className="group transition-colors hover:bg-slate-50/80">
                              <td className="px-5 py-4">
                                <div className="flex min-w-[320px] items-center gap-4">
                                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                                    {combo.image ? (
                                      <Image src={combo.image} alt={combo.name} width={64} height={64} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">Combo</div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="line-clamp-1 font-bold text-slate-800">{combo.name}</p>
                                    <p className="mt-1 line-clamp-1 text-xs text-slate-400">{combo.description || 'Combo tiết kiệm từ HDG Food.'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <p className="line-clamp-2 max-w-[260px] text-xs font-semibold text-slate-500">{groupNames}</p>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                  isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isAvailable ? 'Đang chạy' : 'Không khả dụng'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right text-sm font-black text-emerald-600">
                                {combo.discount_value > 0 ? discountLabel : '—'}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex flex-col items-end">
                                  {combo.base_price > combo.final_price && (
                                    <span className="text-xs font-medium text-slate-300 line-through">
                                      {Math.round(combo.base_price).toLocaleString('vi-VN')}đ
                                    </span>
                                  )}
                                  <span className="text-base font-black text-[#ed2a2a]">
                                    {Math.round(combo.final_price).toLocaleString('vi-VN')}đ
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectCombo(combo)}
                                    disabled={!isAvailable}
                                    className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-[#ed2a2a] disabled:cursor-not-allowed disabled:bg-slate-300"
                                  >
                                    Chọn combo
                                  </button>
                                  <Link
                                    href={`/combos/${combo.id}`}
                                    className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition-all hover:border-slate-300 hover:text-slate-800"
                                  >
                                    Chi tiết
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10"
                  role="list"
                  aria-label="Danh sách combo HDG Food"
                >
                  {filteredCombos.map((combo, index) => (
                    <div
                      key={combo.id}
                      id={`combo-${combo.id}`}
                      className={`${mounted ? 'animate-fadeInUp' : ''}`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      role="listitem"
                    >
                      <ComboCatalogCard
                        combo={combo}
                        onSelect={handleSelectCombo}
                        detailHref={`/combos/${combo.id}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </main>
          )}
        </div>
      </section>

      {/* Combo Builder Modal */}
      <ComboBuilder
        combo={selectedCombo}
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false)
          setSelectedCombo(null)
        }}
      />
    </>
  )
}