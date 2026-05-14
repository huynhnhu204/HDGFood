'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronRight, Save, Move, Trash2, ArrowRight, Loader2, ListTree } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { menuService } from '@/services/menu.service'
import type { Menu, MenuItem, MenuResources } from '@/types'
import {
  BLOG_UNCATEGORIZED_SLUG,
  blogPostPathFromSlugs,
  blogTopicListingPath,
  categoryPublicPath,
  productPublicPath,
} from '@/lib/client-paths'

const generateTempId = () => `temp_${Math.random().toString(36).substring(2, 9)}`

function slugify(s = '') {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s\/-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function toInt(v: unknown, d = 0): number {
  return Number.isFinite(Number(v)) ? Number(v) : d
}

function canonicalUrlForSource(
  type: string,
  referenceId: number | null,
  src: MenuResources | null
): string | null {
  if (!src || referenceId == null || referenceId === 0) return null
  if (type === 'custom' || type === 'group') return null
  const ref = referenceId
  if (type === 'post' || type === 'page') {
    const p = src.posts.find((x) => x.id === ref)
    if (!p) return null
    const topicSlug = p.topic_slug ?? BLOG_UNCATEGORIZED_SLUG
    const slug = p.slug || slugify(p.title || '')
    return blogPostPathFromSlugs(slug, topicSlug)
  }
  if (type === 'category') {
    const c = src.categories.find((x) => x.id === ref)
    return c ? categoryPublicPath(c.slug || slugify(c.name)) : null
  }
  if (type === 'topic') {
    const t = src.topics.find((x) => x.id === ref)
    return t ? blogTopicListingPath(t.slug || slugify(t.name)) : null
  }
  if (type === 'product') {
    const pr = src.products.find((x) => x.id === ref)
    return pr ? productPublicPath(pr.slug || slugify(pr.name)) : null
  }
  return null
}

function menuIsActive(status: unknown): boolean {
  return status === true || status === 1 || status === '1' || status === 'active'
}

/* ── DND ROW ── */
function SortableMenuItem({
  item,
  depth,
  onRemove,
  onIndent,
  onOutdent,
  canIndent,
}: {
  item: MenuItem
  depth: number
  onRemove: () => void
  onIndent: () => void
  onOutdent: () => void
  canIndent: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${depth * 1.5}rem`,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  }

  const getTypeLabel = () => {
    switch (item.type) {
      case 'category':
        return 'Danh mục'
      case 'topic':
        return 'Chủ đề'
      case 'page':
        return 'Trang'
      case 'post':
        return 'Bài viết'
      case 'product':
        return 'Sản phẩm'
      case 'group':
        return 'Nhóm'
      default:
        return 'Tùy chỉnh'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative mb-2 flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex cursor-grab items-center border-r border-slate-200 bg-slate-50 px-3 active:cursor-grabbing"
      >
        <Move className="h-5 w-5 text-slate-400" />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-slate-900">{item.title}</span>
            <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              {getTypeLabel()}
            </span>
          </div>
          <p className="truncate text-xs text-slate-500">
            {item.reference_id != null ? `ID: ${item.reference_id}` : ''}
            {item.url ? ` · ${item.url}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onOutdent}
            disabled={depth === 0}
            title="Ra ngoài"
            className={`rounded-lg p-2 ${depth === 0 ? 'text-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={onIndent}
            disabled={!canIndent}
            title="Vào trong (menu con)"
            className={`rounded-lg p-2 ${!canIndent ? 'text-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Xóa"
            className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

const TYPE_OPTIONS = [
  { v: 'custom' as const, label: 'Tự nhập', icon: '✏️' },
  { v: 'product' as const, label: 'Sản phẩm', icon: '🍜' },
  { v: 'category' as const, label: 'Danh mục', icon: '📁' },
  { v: 'post' as const, label: 'Bài viết', icon: '📰' },
  { v: 'topic' as const, label: 'Chủ đề', icon: '🏷️' },
  { v: 'group' as const, label: 'Nhóm', icon: '📂' },
]

const inputClass =
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all'
const labelClass = 'block text-[12px] font-bold text-slate-600 uppercase tracking-wide mb-1.5'
const sectionTitleClass = 'block text-[12px] font-black text-slate-500 uppercase tracking-widest mb-4'

export default function EditMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const menuId = Number(resolvedParams.id)

  const [menu, setMenu] = useState<Menu | null>(null)
  const [flatItems, setFlatItems] = useState<(MenuItem & { _depth?: number })[]>([])
  const [resources, setResources] = useState<MenuResources | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [menuForm, setMenuForm] = useState({
    name: '',
    position: 'header',
    statusActive: true,
  })

  const [addType, setAddType] = useState<(typeof TYPE_OPTIONS)[number]['v']>('post')
  const [filter, setFilter] = useState('')
  const [draftName, setDraftName] = useState('')
  const [draftLink, setDraftLink] = useState('')
  const [draftRef, setDraftRef] = useState<number | ''>('')
  const [autoLink, setAutoLink] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([menuService.getById(menuId), menuService.getResources()])
      .then(([menuData, resData]) => {
        if (!alive) return
        const m = menuData.menu
        setMenu(m)
        setMenuForm({
          name: m?.name ?? '',
          position: m?.position ?? 'header',
          statusActive: menuIsActive(m?.status),
        })
        const raw = (menuData.items as MenuItem[]) || []
        const treeToFlat = (parentId: string | number | null, depth: number): (MenuItem & { _depth?: number })[] => {
          const children = raw
            .filter((x) => x.parent_id == parentId)
            .sort((a, b) => toInt(a.sort_order, 0) - toInt(b.sort_order, 0))
          return children.flatMap((child) => [
            { ...child, _depth: depth },
            ...treeToFlat(child.id, depth + 1),
          ])
        }
        setFlatItems(treeToFlat(null, 0))
        setResources(resData)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        toast.error('Lỗi khi tải dữ liệu menu')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [menuId])

  const filteredSource = useMemo(() => {
    if (!resources) return []
    const q = (filter || '').toLowerCase().trim()
    const match = (s: string) => s.toLowerCase().includes(q)
    if (addType === 'category') return resources.categories.filter((x) => match(x.name))
    if (addType === 'topic') return resources.topics.filter((x) => match(x.name))
    if (addType === 'product') return resources.products.filter((x) => match(x.name))
    if (addType === 'post') return resources.posts.filter((x) => match(x.title || ''))
    return []
  }, [addType, filter, resources])

  function pickSourceItem(item: { id: number; name?: string; title?: string; slug?: string }) {
    const name = item.name || item.title || ''
    const slug = item.slug || slugify(name)
    let link = '/'
    if (addType === 'category') link = categoryPublicPath(slug)
    else if (addType === 'topic') link = blogTopicListingPath(slug)
    else if (addType === 'product') link = productPublicPath(slug)
    else if (addType === 'post') {
      const topicSlug = (item as { topic_slug?: string }).topic_slug ?? BLOG_UNCATEGORIZED_SLUG
      link = blogPostPathFromSlugs(slug, topicSlug)
    }
    setDraftName(name)
    setDraftLink(link)
    setDraftRef(item.id)
    setAutoLink(false)
  }

  function appendItemToStructure() {
    const isGroup = addType === 'group'
    const isCustom = addType === 'custom'

    if (isGroup) {
      const t = draftName.trim()
      if (!t) {
        toast.error('Nhập tên nhóm')
        return
      }
      setFlatItems((prev) => [
        ...prev,
        {
          id: generateTempId(),
          title: t,
          type: 'group',
          reference_id: null,
          url: null,
          sort_order: 9999,
          _depth: 0,
        },
      ])
      setDraftName('')
      toast.success('Đã thêm nhóm')
      return
    }

    if (isCustom) {
      const t = draftName.trim()
      const u = draftLink.trim()
      if (!t || !u) {
        toast.error('Nhập tiêu đề và đường dẫn')
        return
      }
      setFlatItems((prev) => [
        ...prev,
        {
          id: generateTempId(),
          title: t,
          type: 'custom',
          url: u,
          reference_id: null,
          sort_order: 9999,
          _depth: 0,
        },
      ])
      setDraftName('')
      setDraftLink('')
      setAutoLink(true)
      toast.success('Đã thêm link')
      return
    }

    if (draftRef === '' || !draftName.trim()) {
      toast.error('Chọn một mục trong danh sách')
      return
    }

    setFlatItems((prev) => [
      ...prev,
      {
        id: generateTempId(),
        title: draftName.trim(),
        type: addType,
        reference_id: Number(draftRef),
        url: draftLink.trim() || null,
        sort_order: 9999,
        _depth: 0,
      },
    ])
    setDraftName('')
    setDraftLink('')
    setDraftRef('')
    setFilter('')
    toast.success('Đã thêm mục vào menu')
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id && over) {
      setFlatItems((items) => {
        const oldIndex = items.findIndex((x) => x.id === active.id)
        const newIndex = items.findIndex((x) => x.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleIndent = (id: string | number) => {
    setFlatItems((items) => {
      const idx = items.findIndex((x) => x.id === id)
      if (idx <= 0) return items
      const prev = items[idx - 1]
      const current = items[idx]
      if ((current._depth || 0) <= (prev._depth || 0)) {
        const copy = [...items]
        const prevDepth = current._depth || 0
        copy[idx] = { ...current, _depth: prevDepth + 1 }
        for (let i = idx + 1; i < copy.length; i++) {
          if ((copy[i]._depth || 0) > prevDepth) {
            copy[i] = { ...copy[i], _depth: (copy[i]._depth || 0) + 1 }
          } else break
        }
        return copy
      }
      return items
    })
  }

  const handleOutdent = (id: string | number) => {
    setFlatItems((items) => {
      const idx = items.findIndex((x) => x.id === id)
      if (idx < 0) return items
      const current = items[idx]
      if ((current._depth || 0) > 0) {
        const copy = [...items]
        const prevDepth = current._depth || 0
        copy[idx] = { ...current, _depth: prevDepth - 1 }
        for (let i = idx + 1; i < copy.length; i++) {
          if ((copy[i]._depth || 0) > prevDepth) {
            copy[i] = { ...copy[i], _depth: (copy[i]._depth || 0) - 1 }
          } else break
        }
        return copy
      }
      return items
    })
  }

  const handleSave = async () => {
    setErr('')
    if (!menuForm.name.trim()) {
      setErr('Vui lòng nhập tên menu.')
      return
    }

    const finalItemsToSync: (MenuItem & { _depth?: number })[] = []
    const stack: { id: string | number; depth: number }[] = []

    for (let i = 0; i < flatItems.length; i++) {
      const item = flatItems[i]
      const depth = item._depth || 0
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop()
      }
      const parentId = depth === 0 ? null : stack.length > 0 ? stack[stack.length - 1].id : null
      finalItemsToSync.push({ ...item, parent_id: parentId, sort_order: i })
      stack.push({ id: item.id, depth })
    }

    const MAX_TITLE = 255
    const payload = finalItemsToSync.map((it) => {
      const rawTitle = String(it.title ?? '').trim()
      const title = rawTitle.length > 0 ? rawTitle.slice(0, MAX_TITLE) : 'Mục menu'
      const ref = it.reference_id
      const reference_id =
        typeof ref === 'number' && Number.isFinite(ref) ? ref : null
      const trimmedUrl = it.url != null && String(it.url).trim() !== '' ? String(it.url).trim() : null
      const canonical =
        reference_id != null ? canonicalUrlForSource(it.type, reference_id, resources) : null
      return {
        id: it.id,
        title,
        type: it.type,
        reference_id,
        url: canonical ?? trimmedUrl,
        parent_id: it.parent_id ?? null,
        sort_order: it.sort_order,
        is_active: it.is_active !== false && it.is_active !== 0,
      }
    })

    setSaving(true)
    try {
      await menuService.update(menuId, {
        name: menuForm.name.trim(),
        position: menuForm.position,
        status: menuForm.statusActive ? 'active' : 'inactive',
      })
      await menuService.syncItems(menuId, payload)
      toast.success('Đã lưu menu thành công!')
      router.push('/admin/menus')
      router.refresh()
    } catch (e: unknown) {
      const ax = e as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } }
      }
      const data = ax.response?.data
      let msg = data?.message || 'Có lỗi xảy ra khi lưu'
      if (data?.errors && typeof data.errors === 'object') {
        const first = Object.values(data.errors).flat()[0]
        if (first) msg = `${msg}: ${first}`
      }
      setErr(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#ed2a2a]" />
      </div>
    )
  }

  const isGroup = addType === 'group'
  const isCustom = addType === 'custom'
  const sourceLabel =
    addType === 'category'
      ? 'danh mục'
      : addType === 'topic'
        ? 'chủ đề'
        : addType === 'product'
          ? 'sản phẩm'
          : addType === 'post'
            ? 'bài viết'
            : ''

  const typeTileActive = (active: boolean) =>
    `rounded-xl border-2 p-3 text-left transition-all ${
      active
        ? 'border-[#ed2a2a] bg-red-50/80 shadow-md shadow-red-500/10'
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
    }`

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-28 animate-in fade-in duration-300 lg:pb-10">
      <div className="sticky top-0 z-40 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between lg:p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/menus')}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <span>Admin</span>
              <ChevronRight className="h-3 w-3" />
              <button type="button" onClick={() => router.push('/admin/menus')} className="hover:text-slate-600">
                Menu
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#ed2a2a]">Sửa</span>
            </div>
            <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-800">
              <ListTree className="h-5 w-5 text-[#ed2a2a]" />
              Sửa menu
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {menu?.name ?? 'Cấu trúc và mục điều hướng'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 sm:flex"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ed2a2a] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(237,42,42,0.35)] transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu menu
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      <div className="divide-y divide-slate-100 rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-100 ring-1 ring-slate-100">
        <div className="p-6 lg:p-8">
          <span className={sectionTitleClass}>Thông tin menu</span>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Tên menu <span className="text-[#ed2a2a]">*</span>
              </label>
              <input
                value={menuForm.name}
                onChange={(e) => setMenuForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                placeholder="Ví dụ: Blog, Thực đơn..."
              />
            </div>
            <div>
              <label className={labelClass}>Vị trí</label>
              <select
                value={menuForm.position}
                onChange={(e) => setMenuForm((f) => ({ ...f, position: e.target.value }))}
                className={inputClass}
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="mobile">Mobile</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between text-left text-sm font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
          >
            <span>Tùy chọn nâng cao</span>
            <ChevronDown className={`h-5 w-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          {showAdvanced && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <label className={labelClass}>Trạng thái</label>
              <div className="flex h-11 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMenuForm((f) => ({ ...f, statusActive: !f.statusActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    menuForm.statusActive ? 'bg-[#ed2a2a]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      menuForm.statusActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-semibold text-slate-600">
                  {menuForm.statusActive ? 'Hiển thị' : 'Ẩn'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 lg:p-8">
          <span className={sectionTitleClass}>1. Chọn loại mục thêm</span>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => {
                  setAddType(o.v)
                  setFilter('')
                  setDraftName('')
                  setDraftLink('')
                  setDraftRef('')
                  setAutoLink(o.v === 'custom')
                }}
                className={typeTileActive(addType === o.v)}
              >
                <div className="mb-1 text-xl">{o.icon}</div>
                <div className={`text-xs font-bold ${addType === o.v ? 'text-[#ed2a2a]' : 'text-slate-700'}`}>
                  {o.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {!isCustom && !isGroup && (
          <div className="p-6 lg:p-8">
            <span className={sectionTitleClass}>2. Chọn {sourceLabel}</span>
            <div className="space-y-3">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Tìm ${sourceLabel}...`}
                className={inputClass}
              />
              <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200">
                {!resources ? (
                  <div className="p-4 text-center text-sm font-semibold text-slate-500">Đang tải...</div>
                ) : filteredSource.length === 0 ? (
                  <div className="p-4 text-center text-sm font-semibold text-slate-500">Không tìm thấy</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSource.map((it: { id: number; name?: string; title?: string; slug?: string }) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => pickSourceItem(it)}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-red-50/80 ${
                          String(draftRef) === String(it.id) ? 'bg-red-50' : ''
                        }`}
                      >
                        <div className="font-semibold text-slate-900">{it.name || it.title}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500">/{it.slug}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-6 lg:p-8">
          <span className={sectionTitleClass}>
            {isCustom || isGroup ? '2.' : '3.'} Chi tiết — thêm vào cấu trúc
          </span>
          <div className="space-y-4">
            {!isGroup && (
              <div>
                <label className={labelClass.replace('mb-1.5', 'mb-0')}>
                  Tiêu đề hiển thị {!isCustom && <span className="text-[#ed2a2a]">*</span>}
                </label>
                <input
                  value={draftName}
                  onChange={(e) => {
                    const v = e.target.value
                    setDraftName(v)
                    if (autoLink && isCustom && v.trim()) {
                      setDraftLink(`/${slugify(v)}`)
                    }
                  }}
                  disabled={!isCustom && !isGroup && draftRef === ''}
                  placeholder={
                    isCustom ? 'Ví dụ: Khuyến mãi' : 'Chọn mục ở bước 2 hoặc nhập để sửa'
                  }
                  className={`${inputClass} disabled:bg-slate-100`}
                />
              </div>
            )}

            {isGroup && (
              <div>
                <label className={labelClass}>
                  Tên nhóm <span className="text-[#ed2a2a]">*</span>
                </label>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Thư mục cha (không có link)"
                  className={inputClass}
                />
              </div>
            )}

            {isCustom && (
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label className={labelClass.replace('mb-1.5', 'mb-0')}>Đường dẫn (Link)</label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={autoLink}
                      onChange={(e) => {
                        const al = e.target.checked
                        setAutoLink(al)
                        if (al && draftName.trim()) setDraftLink(`/${slugify(draftName)}`)
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-[#ed2a2a] focus:ring-[#ed2a2a]"
                    />
                    Tự động từ tên
                  </label>
                </div>
                <input
                  value={draftLink}
                  onChange={(e) => {
                    setDraftLink(e.target.value)
                    setAutoLink(false)
                  }}
                  disabled={autoLink}
                  placeholder="/duong-dan"
                  className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                />
              </div>
            )}

            {!isCustom && !isGroup && draftRef !== '' && (
              <p className="text-xs font-semibold text-emerald-600">
                ✓ Đã chọn nguồn — có thể sửa tiêu đề trước khi thêm
              </p>
            )}

            <button
              type="button"
              onClick={appendItemToStructure}
              className="h-11 w-full rounded-xl bg-slate-900 text-sm font-bold text-white transition-all hover:bg-slate-800 md:w-auto md:px-8"
            >
              Thêm vào cấu trúc menu
            </button>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <span className={sectionTitleClass}>Cấu trúc menu ({flatItems.length} mục)</span>
          <p className="mb-3 text-xs font-medium text-slate-500">
            Kéo thả đổi thứ tự. Mũi tên phải: menu con; trái: cùng cấp.
          </p>
          <div className="min-h-[280px] rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            {flatItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <ListTree className="mb-3 h-14 w-14 opacity-40" />
                <span className="font-bold text-slate-500">Chưa có mục</span>
                <span className="mt-1 max-w-sm text-sm font-medium">Thêm mục ở các bước trên.</span>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={flatItems.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                  {flatItems.map((item, index) => {
                    const prev = flatItems[index - 1]
                    const canIndent = prev ? (item._depth || 0) <= (prev._depth || 0) : false
                    return (
                      <SortableMenuItem
                        key={item.id}
                        item={item}
                        depth={item._depth || 0}
                        canIndent={canIndent}
                        onIndent={() => handleIndent(item.id)}
                        onOutdent={() => handleOutdent(item.id)}
                        onRemove={() => setFlatItems((p) => p.filter((x) => x.id !== item.id))}
                      />
                    )
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
