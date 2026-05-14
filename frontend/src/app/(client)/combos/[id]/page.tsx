'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Sparkles, Tag } from 'lucide-react'
import { comboService } from '@/services/combo.service'
import type { Combo } from '@/types/combo'
import ComboBuilder from '@/components/combos/ComboBuilder'

export default function ComboDetailPage() {
  const params = useParams()
  const comboId = Number(params?.id)

  const [loading, setLoading] = useState(true)
  const [combo, setCombo] = useState<Combo | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(comboId) || comboId <= 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await comboService.getById(comboId)
        if (!cancelled) setCombo(res.data || null)
      } catch {
        if (!cancelled) setCombo(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [comboId])

  const isAvailable = useMemo(() => {
    if (!combo) return false
    const expired = combo.end_date ? new Date(combo.end_date) < new Date() : false
    return !!combo.is_running && !expired
  }, [combo])

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-24">
        <div className="h-80 rounded-[2rem] bg-slate-100 animate-pulse" />
      </section>
    )
  }

  if (!combo) {
    return (
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-slate-800">Không tìm thấy combo</h1>
        <Link href="/combos" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách combo
        </Link>
      </section>
    )
  }

  const saveAmount = Math.max(0, Math.round((combo.base_price || 0) - (combo.final_price || 0)))

  return (
    <section className="container mx-auto px-4 py-10 md:py-14">
      <Link href="/combos" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#ed2a2a]">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách combo
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="relative aspect-[16/10] bg-slate-100">
            {combo.image ? (
              <Image src={combo.image} alt={combo.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">Không có ảnh combo</div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#ed2a2a]">
            <Sparkles className="w-3.5 h-3.5" /> Combo đặc biệt
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{combo.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{combo.description || 'Combo tiết kiệm được thiết kế cho trải nghiệm trọn vẹn.'}</p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-end justify-between gap-3">
              <div className="text-3xl font-black text-[#ed2a2a]">{Math.round(combo.final_price).toLocaleString('vi-VN')}đ</div>
              {combo.base_price > combo.final_price && (
                <div className="text-sm font-semibold text-slate-400 line-through">{Math.round(combo.base_price).toLocaleString('vi-VN')}đ</div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-600">
              <Tag className="w-3.5 h-3.5" />
              Tiết kiệm {saveAmount.toLocaleString('vi-VN')}đ
            </div>
          </div>

          <button
            onClick={() => setBuilderOpen(true)}
            disabled={!isAvailable}
            className="mt-6 w-full rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.15em] text-white transition-all hover:bg-[#ed2a2a] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isAvailable ? 'Chọn combo ngay' : 'Combo không khả dụng'}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Chi tiết nhóm món trong combo</h2>
        <div className="mt-4 space-y-4">
          {combo.groups?.map((group) => (
            <div key={group.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-800">{group.name}</p>
                <span className="text-xs font-semibold text-slate-500">
                  Chọn {group.min_required} - {group.max_required} món
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {group.products?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-700">{p.name}</span>
                    <span className="text-slate-500">{Math.round(p.effective_price).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="w-4 h-4" /> Giá đã tối ưu so với mua lẻ từng món.
        </div>
      </div>

      <ComboBuilder
        combo={combo}
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
      />
    </section>
  )
}
