'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CreditCard, FileText, HelpCircle, Printer, RotateCcw, Shield, Truck } from 'lucide-react'
import { policyService } from '@/services/policy.service'
import type { Policy } from '@/types'

export default function PolicyDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [allPolicies, setAllPolicies] = useState<Policy[]>([])

  useEffect(() => {
    const run = async () => {
      try {
        const [detail, all] = await Promise.all([
          policyService.getBySlug(slug),
          policyService.list(),
        ])
        setPolicy(detail.data)
        setAllPolicies(all.data || [])
      } catch {
        setPolicy(null)
      }
    }
    if (slug) run()
  }, [slug])

  if (!policy) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-slate-500">Không tìm thấy chính sách.</div>
  }

  const iconBySlug = (value: string) => {
    if (value.includes('thanh-toan')) return CreditCard
    if (value.includes('giao-hang') || value.includes('van-chuyen')) return Truck
    if (value.includes('hoan-tien') || value.includes('doi-tra')) return RotateCcw
    if (value.includes('bao-mat')) return Shield
    if (value.includes('faq')) return HelpCircle
    return FileText
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <div className="bg-white shadow-xl rounded-[2.5rem] p-6 lg:p-12 flex gap-10">
      <aside className="w-1/4 hidden lg:block sticky top-20 self-start">
        <img src="/images/hdg-logo.png" alt="HDG Food" className="h-14 w-auto object-contain mb-5 opacity-95" />
        <h3 className="font-black text-xl mb-4 text-slate-900">Trung tâm hỗ trợ</h3>
        <div className="space-y-2">
          {allPolicies.map((p) => (
            <Link key={p.id} href={`/policy/${p.slug}`} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all ${p.slug === policy.slug ? 'bg-red-50 text-red-600 font-bold border-r-4 border-red-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              {(() => {
                const Icon = iconBySlug(p.slug)
                return <Icon className="w-[18px] h-[18px]" />
              })()}
              <span>{p.title}</span>
            </Link>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 font-['Inter']">
        <div className="flex justify-between items-start gap-3 mb-6">
          <div>
            <div className="text-xs text-slate-400 mb-2">
              <Link href="/" className="hover:text-[#ed2a2a]">Trang chủ</Link> {'>'} <Link href="/policies" className="hover:text-[#ed2a2a]">Chính sách</Link> {'>'} <span>{policy.title}</span>
            </div>
            <h1 className="text-4xl font-black mb-2 text-slate-900">{policy.title}</h1>
            <p className="text-xs text-slate-400">Cập nhật lần cuối: {new Date(policy.updated_at).toLocaleString('vi-VN')}</p>
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
            <Printer className="w-3.5 h-3.5" />
            In trang này
          </button>
        </div>
        <article
          className="prose prose-red max-w-none text-slate-600 leading-relaxed [&_ul]:list-none [&_ul]:pl-0 [&_li]:relative [&_li]:pl-7 [&_li]:mb-1.5 [&_li::before]:content-['✓'] [&_li::before]:absolute [&_li::before]:left-0 [&_li::before]:text-[#ed2a2a] [&_li::before]:font-bold"
          dangerouslySetInnerHTML={{ __html: policy.content }}
        />
      </main>
      </div>
    </div>
  )
}
