'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, CalendarDays, Percent, Grid3X3, Package, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { comboAdminService } from '@/services/admin/combo-admin.service'
import type { Combo } from '@/types/combo'

const fmt = (n: number) => Number(n || 0).toLocaleString('vi-VN') + 'đ'
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString('vi-VN') : '—')

export default function ComboDetailPage() {
  const router = useRouter()
  const params = useParams()
  const comboId = Number(params.id)

  const [loading, setLoading] = useState(true)
  const [combo, setCombo] = useState<Combo | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await comboAdminService.getById(comboId)
        setCombo(res.data)
      } catch {
        toast.error('Không tải được chi tiết combo.')
        router.push('/admin/combos')
      } finally {
        setLoading(false)
      }
    }
    if (comboId) load()
  }, [comboId, router])

  const groups = combo?.groups || []
  const coreGroup = useMemo(
    () => groups.find((g) => g.name.trim().toLowerCase() === 'món trong combo') || groups[0],
    [groups]
  )
  const optionGroups = useMemo(
    () => groups.filter((g) => g.id !== coreGroup?.id),
    [groups, coreGroup]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-[#ed2a2a]" />
      </div>
    )
  }

  if (!combo) return null

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/combos" className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Chi tiết Combo</h1>
            <p className="text-sm text-slate-400">{combo.name}</p>
          </div>
        </div>
        <Link
          href={`/admin/combos/${combo.id}/edit`}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ed2a2a] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-500/20"
        >
          <Pencil className="w-4 h-4" />
          Chỉnh sửa
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              {combo.image ? <img src={combo.image} alt={combo.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-slate-900">{combo.name}</h2>
              <p className="text-sm text-slate-500 mt-1">{combo.description || '—'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Slug: {combo.slug}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${combo.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {combo.is_active ? 'Đang bật' : 'Đang tắt'}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${combo.show_on_homepage ? 'bg-red-100 text-[#ed2a2a]' : 'bg-slate-100 text-slate-600'}`}>
                  {combo.show_on_homepage ? 'Hiện trang chủ' : 'Ẩn trang chủ'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Thông số</h3>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Giá gốc</span><span className="font-bold">{fmt(combo.base_price)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Giảm</span><span className="font-bold text-[#ed2a2a]">{combo.discount_type === 'percent' ? `${combo.discount_value}%` : fmt(combo.discount_value)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Giá combo</span><span className="font-black text-emerald-600">{fmt(combo.final_price)}</span></div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2"><CalendarDays className="w-4 h-4" />{fmtDate(combo.start_date)} - {fmtDate(combo.end_date)}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4"><Grid3X3 className="w-4 h-4 text-[#ed2a2a]" /> Cấu trúc theo Database</h3>

        {coreGroup && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-red-700">Món trong combo (core group)</p>
              <p className="text-xs font-bold text-red-700">{coreGroup.products.length} sản phẩm</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {coreGroup.products.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-red-100 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-slate-500">product_id: {p.product_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#ed2a2a]">SL: {p.quantity || 1}</p>
                    <p className="text-xs text-slate-500">{fmt(p.effective_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {optionGroups.map((g) => (
            <div key={g.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-800">{g.name}</p>
                  <p className="text-xs text-slate-500">{g.description || 'Không có mô tả'}</p>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                  min {g.min_required} / max {g.max_required}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {g.products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1">{p.name}</p>
                      <p className="text-xs text-slate-500">product_id: {p.product_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-700">SL: {p.quantity || 1}</p>
                      <p className="text-xs text-slate-500">{fmt(p.effective_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
            Combo này chưa có nhóm/sản phẩm theo database.
          </div>
        )}
      </div>
    </div>
  )
}
