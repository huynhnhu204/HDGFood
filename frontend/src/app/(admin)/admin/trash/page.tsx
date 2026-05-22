'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Trash2,
  RotateCcw,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { trashService, type TrashItem, type TrashItemType } from '@/services/trash.service'
import { TRASH_MODULE_PATHS, TRASH_TYPE_LABELS } from '@/lib/trashLabels'

function formatDeletedAt(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
}

function TrashPageContent() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') || ''

  const [summary, setSummary] = useState<Record<string, number>>({})
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actingId, setActingId] = useState<string | null>(null)
  const [policiesByType, setPoliciesByType] = useState<Record<string, string>>({})
  const [defaultPolicy, setDefaultPolicy] = useState<string | null>(null)
  const [retentionDays, setRetentionDays] = useState(30)
  const [memberRetentionDays, setMemberRetentionDays] = useState(30)
  const [listPolicy, setListPolicy] = useState<string | null>(null)
  const [listAutoPurge, setListAutoPurge] = useState(false)

  const loadSummary = useCallback(async () => {
    try {
      const res = await trashService.summary()
      setSummary(res.counts)
      setDefaultPolicy(res.policy ?? null)
      setPoliciesByType(res.policies ?? {})
      setRetentionDays(res.retention_days ?? 30)
      setMemberRetentionDays(res.member_retention_days ?? 30)
    } catch {
      /* ignore */
    }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await trashService.list({
        type: typeFilter || undefined,
        q: q || undefined,
        page,
        per_page: 20,
      })
      setItems(res.data)
      setLastPage(res.meta.last_page)
      setTotal(res.meta.total)
      setListPolicy(res.meta.policy ?? null)
      setListAutoPurge(Boolean(res.meta.auto_purge))
    } catch {
      toast.error('Không tải được thùng rác.')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, q, page])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const t = setTimeout(loadItems, 300)
    return () => clearTimeout(t)
  }, [loadItems])

  useEffect(() => {
    setPage(1)
  }, [typeFilter, q])

  useEffect(() => {
    setTypeFilter(initialType)
  }, [initialType])

  const moduleBack =
    typeFilter && typeFilter in TRASH_MODULE_PATHS
      ? TRASH_MODULE_PATHS[typeFilter as TrashItemType]
      : null
  const typeTitle =
    typeFilter && typeFilter in TRASH_TYPE_LABELS
      ? TRASH_TYPE_LABELS[typeFilter as TrashItemType]
      : null

  const handleRestore = async (item: TrashItem) => {
    const key = `${item.type}-${item.id}`
    setActingId(key)
    try {
      await trashService.restore(item.type as TrashItemType, item.id)
      toast.success('Đã khôi phục.')
      loadSummary()
      loadItems()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Khôi phục thất bại.')
    } finally {
      setActingId(null)
    }
  }

  const handlePurge = async (item: TrashItem) => {
    if (item.type === 'member' || item.auto_purge) {
      toast.error(
        item.purge_hint
          ?? `Thành viên đã đóng không xóa vĩnh viễn từ đây. Hệ thống tự xóa sau ${item.retention_days} ngày.`
      )
      return
    }
    if (!confirm(`Xóa vĩnh viễn "${item.title}"? Không thể hoàn tác.`)) return
    const key = `${item.type}-${item.id}`
    setActingId(key)
    try {
      await trashService.purge(item.type as TrashItemType, item.id)
      toast.success('Đã xóa vĩnh viễn.')
      loadSummary()
      loadItems()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Xóa vĩnh viễn thất bại.')
    } finally {
      setActingId(null)
    }
  }

  const typeOptions = Object.entries(summary).filter(([, c]) => c > 0)

  const isMemberTrash = typeFilter === 'member' || listAutoPurge

  const displayPolicy =
    typeFilter && policiesByType[typeFilter]
      ? policiesByType[typeFilter]
      : listPolicy ?? defaultPolicy

  const retentionColumnLabel = isMemberTrash
    ? `Tự xóa (${memberRetentionDays} ngày)`
    : `Nhắc nhở (${retentionDays} ngày)`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          {moduleBack && (
            <Link
              href={moduleBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#ed2a2a] mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại module
            </Link>
          )}
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-slate-700" />
            {typeTitle ? `Thùng rác — ${typeTitle}` : 'Thùng rác'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {isMemberTrash
              ? 'Khôi phục tài khoản đã đóng hoặc chờ hệ thống tự dọn sau thời hạn.'
              : typeFilter
                ? 'Khôi phục hoặc xóa vĩnh viễn — thao tác hoàn toàn do bạn quyết định.'
                : 'Mỗi module có quy tắc thùng rác riêng; chọn loại bên dưới để xem chi tiết.'}
          </p>
          {displayPolicy && (
            <p
              className={`text-xs rounded-lg px-3 py-2 mt-2 font-medium max-w-2xl border ${
                isMemberTrash
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : 'text-slate-600 bg-slate-50 border-slate-200'
              }`}
            >
              {displayPolicy}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            loadSummary()
            loadItems()
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
            !typeFilter ? 'bg-[#ed2a2a] text-white border-[#ed2a2a]' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          Tất cả ({Object.values(summary).reduce((a, b) => a + b, 0)})
        </button>
        {typeOptions.map(([type, count]) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              typeFilter === type
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {(TRASH_TYPE_LABELS[type as TrashItemType] ?? type.replace(/_/g, ' '))} ({count})
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, mã..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#ed2a2a]" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold">Thùng rác trống</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Tên / mô tả</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">{retentionColumnLabel}</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const key = `${item.type}-${item.id}`
                  const busy = actingId === key
                  return (
                    <tr key={key} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          {item.type_label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">{item.subtitle}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {formatDeletedAt(item.deleted_at)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.days_in_trash != null ? (
                          <div className="space-y-1">
                            <span className="text-slate-600 font-medium">
                              Đã {item.days_in_trash} ngày
                            </span>
                            {item.is_overdue ? (
                              <span className="block text-red-600 font-bold">Quá hạn</span>
                            ) : item.days_until_purge != null && item.days_until_purge <= 7 ? (
                              <span className="block text-amber-600 font-bold">
                                Còn {item.days_until_purge} ngày
                              </span>
                            ) : item.days_until_purge != null ? (
                              <span className="block text-slate-400">
                                Còn {item.days_until_purge} ngày
                              </span>
                            ) : null}
                            {item.purge_hint && (
                              <span className="block text-[10px] text-slate-500 leading-snug max-w-[200px]">
                                {item.purge_hint}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Link
                            href={item.admin_path}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Module
                          </Link>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRestore(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Khôi phục
                          </button>
                          {!item.auto_purge && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handlePurge(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Xóa hẳn
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Trang {page}/{lastPage} — {total} mục
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border text-xs font-bold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border text-xs font-bold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminTrashPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#ed2a2a]" />
        </div>
      }
    >
      <TrashPageContent />
    </Suspense>
  )
}
