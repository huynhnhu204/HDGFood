'use client'

import { useState, useEffect, useMemo } from 'react'
import { comboService } from '@/services/combo.service'
import { Combo } from '@/types/combo'
import ComboCard from './ComboCard'
import ComboBuilder from './ComboBuilder'
import { UtensilsCrossed, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function ComboSection() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)

  useEffect(() => {
    fetchCombos()
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

  const handleSelectCombo = (combo: Combo) => {
    setSelectedCombo(combo)
    setIsBuilderOpen(true)
  }

  const featuredCombo = useMemo(
    () => {
      const featured = combos.filter((c) => Boolean(c.show_on_homepage))
      // Chỉ hiển thị combo được admin tích ở create/edit, giới hạn 1.
      return featured.at(0) ?? null
    },
    [combos]
  )

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="font-bold">Đang tải combos...</span>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (combos.length === 0 || !featuredCombo) {
    return null
  }

  return (
    <>
      <section className="py-16 md:py-24 bg-white">
        <div className="mx-auto w-full max-w-7xl px-3 md:px-4">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#ed2a2a] to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                  Combo <span className="text-[#ed2a2a]">Tiết Kiệm</span>
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  1 combo nổi bật do admin chọn hiển thị
                </p>
              </div>
            </div>
            
            <Link 
              href="/combos"
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#ed2a2a] transition-all active:scale-95 shadow-lg"
            >
              Xem tất cả
            </Link>
          </div>

          {/* Single featured combo card */}
          {featuredCombo && (
            <div className="rounded-[3rem] bg-red-50 p-4 md:p-6 ring-1 ring-red-100 shadow-[0_18px_80px_rgba(237,42,42,0.12)]">
              <ComboCard combo={featuredCombo} onSelect={handleSelectCombo} />
            </div>
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