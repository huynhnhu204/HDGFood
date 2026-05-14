'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Printer } from 'lucide-react'
import { policyService } from '@/services/policy.service'
import type { Policy } from '@/types'

export default function PoliciesPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [policies, setPolicies] = useState<Policy[]>([])
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const res = await policyService.list({ search: search || undefined })
        const list = res.data || []
        setPolicies(list)
        if (list.length > 0 && !activeSlug) {
          setActiveSlug(list[0].slug)
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [search])

  const grouped = useMemo(() => {
    return policies.reduce<Record<string, Policy[]>>((acc, p) => {
      acc[p.category] = acc[p.category] || []
      acc[p.category].push(p)
      return acc
    }, {})
  }, [policies])

  const activePolicy = policies.find((p) => p.slug === activeSlug) || null

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 lg:py-14">
      <div className="mb-6">
        <h1 className="text-3xl lg:text-4xl font-black text-slate-900">Trung tâm chính sách</h1>
        <p className="text-slate-500 mt-1">Tìm nhanh các thông tin thanh toán, giao hàng, bảo mật, hoàn tiền.</p>
      </div>

      <div className="relative mb-6">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm chính sách, ví dụ: hoàn tiền..."
          className="w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 py-3.5 text-sm"
        />
      </div>

      <div className="max-w-7xl mx-auto flex gap-8">
        <aside className="w-[290px] hidden lg:block border-r border-slate-100 pr-5 sticky top-20 self-start max-h-[calc(100vh-100px)] overflow-y-auto">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{cat}</p>
              <div className="space-y-1">
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveSlug(p.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeSlug === p.slug ? 'bg-red-50 text-[#ed2a2a] font-bold border-l-2 border-[#ed2a2a]' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl p-5 lg:p-8">
          {loading ? (
            <p className="text-slate-400">Đang tải nội dung...</p>
          ) : activePolicy ? (
            <>
              <div className="flex justify-between items-start gap-3 mb-5">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900">{activePolicy.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">Cập nhật: {new Date(activePolicy.updated_at).toLocaleString('vi-VN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold">
                    <Printer className="w-3.5 h-3.5" />
                    In trang này
                  </button>
                  <Link href={`/policy/${activePolicy.slug}`} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold">
                    Mở trang riêng
                  </Link>
                </div>
              </div>
              <article className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: activePolicy.content }} />
            </>
          ) : (
            <p className="text-slate-400">Không có chính sách phù hợp.</p>
          )}
        </main>
      </div>
    </div>
  )
}
