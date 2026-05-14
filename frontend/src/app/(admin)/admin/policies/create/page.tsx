'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { policyService } from '@/services/policy.service'

const ICONS = ['Shield', 'Truck', 'CreditCard', 'RotateCcw', 'FileText']
const CATEGORIES = ['payment', 'shipping', 'privacy', 'terms', 'refund', 'general']

export default function CreatePolicyPage() {
  const router = useRouter()
  const editorRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    icon: 'Shield',
    category: 'general',
    order: 0,
    is_active: true,
  })

  const makeSlug = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')

  const submit = async () => {
    const content = editorRef.current?.innerHTML || ''
    if (!form.title.trim()) return toast.error('Nhập tiêu đề chính sách.')
    if (!content.trim()) return toast.error('Nhập nội dung chính sách.')
    setSaving(true)
    try {
      await policyService.create({
        ...form,
        slug: form.slug || undefined,
        content,
      })
      toast.success('Đã tạo chính sách.')
      router.push('/admin/policies')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Tạo chính sách thất bại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/policies" className="p-2 rounded-xl border border-slate-200 bg-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#ed2a2a]" />
            Tạo Chính sách
          </h1>
        </div>
        <button onClick={submit} disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#ed2a2a] text-white font-bold inline-flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600">Tiêu đề</label>
            <input
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200"
              value={form.title}
              onChange={(e) => {
                const nextTitle = e.target.value
                setForm((s) => ({ ...s, title: nextTitle, slug: slugTouched ? s.slug : makeSlug(nextTitle) }))
              }}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600">Slug</label>
            <input
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                setForm((s) => ({ ...s, slug: e.target.value }))
              }}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600">Category</label>
            <select className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600">Icon</label>
            <select className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white" value={form.icon} onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value }))}>
              {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600">Thứ tự</label>
            <input type="number" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200" value={form.order} onChange={(e) => setForm((s) => ({ ...s, order: Number(e.target.value || 0) }))} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex gap-1">
            {[
              ['bold', 'B'],
              ['italic', 'I'],
              ['underline', 'U'],
              ['insertUnorderedList', '• List'],
              ['insertOrderedList', '1. List'],
              ['formatBlock', 'H2', 'h2'],
            ].map(([cmd, label, arg]) => (
              <button
                key={label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  document.execCommand(cmd, false, arg ?? '')
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-transparent hover:border-slate-300"
              >
                {label}
              </button>
            ))}
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[420px] p-4 prose max-w-none focus:outline-none"
            data-placeholder="Soạn nội dung chính sách tại đây..."
          />
        </div>
      </div>
    </div>
  )
}
