'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, RefreshCw, Pencil, Trash2, Power, PowerOff, Shield } from 'lucide-react'
import { toast } from 'sonner'
import type { Policy } from '@/types'
import { policyService } from '@/services/policy.service'
import AdminTrashLink from '@/components/admin/AdminTrashLink'

const CATEGORIES = ['payment', 'shipping', 'privacy', 'terms', 'refund', 'general']

export default function AdminPoliciesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await policyService.listAdmin({
        search: search || undefined,
        category: category === 'all' ? undefined : category,
      })
      setPolicies(res.data || [])
    } catch {
      toast.error('Không tải được danh sách chính sách.')
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = async (id: number) => {
    try {
      await policyService.toggle(id)
      toast.success('Đã cập nhật trạng thái.')
      load()
    } catch {
      toast.error('Cập nhật thất bại.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa chính sách này?')) return
    try {
      await policyService.delete(id)
      toast.success('Đã xóa chính sách.')
      load()
    } catch {
      toast.error('Xóa thất bại.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#ed2a2a]" />
            Quản lý Chính sách
          </h1>
          <p className="text-sm text-slate-500">Quản trị nội dung Terms, Privacy, Shipping, Payment...</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AdminTrashLink trashType="policy" />
          <button
            onClick={() => router.push('/admin/policies/create')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#ed2a2a] text-white font-bold"
          >
            <Plus className="w-4 h-4" />
            Thêm chính sách
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm chính sách..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
        >
          <option value="all">Tất cả nhóm</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2.5 rounded-xl border border-slate-200">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3">Tiêu đề</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Cập nhật</th>
              <th className="text-center px-4 py-3">Trạng thái</th>
              <th className="text-center px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-800">{p.title}</p>
                  <p className="text-xs text-slate-400">/{p.slug}</p>
                </td>
                <td className="px-4 py-3 uppercase text-xs font-bold text-slate-500">{p.category}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(p.updated_at).toLocaleString('vi-VN')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {p.is_active ? 'Active' : 'Ẩn'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleToggle(p.id)}
                      className="p-2 rounded-lg border border-slate-200"
                      title="Bật tắt"
                    >
                      {p.is_active ? <PowerOff className="w-4 h-4 text-amber-600" /> : <Power className="w-4 h-4 text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => router.push(`/admin/policies/${p.id}/edit`)}
                      className="p-2 rounded-lg border border-blue-200 bg-blue-50"
                      title="Sửa"
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-lg border border-rose-200 bg-rose-50"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && policies.length === 0 && (
          <div className="py-16 text-center text-slate-400">Chưa có chính sách nào.</div>
        )}
      </div>
    </div>
  )
}
