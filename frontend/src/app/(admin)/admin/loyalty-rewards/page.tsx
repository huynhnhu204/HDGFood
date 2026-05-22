'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { LoyaltyReward } from '@/types'
import { loyaltyAdminService } from '@/services/admin/loyalty-admin.service'
import AdminTrashLink from '@/components/admin/AdminTrashLink'

const EMPTY_FORM: Partial<LoyaltyReward> = {
  name: '',
  description: '',
  points_cost: 100,
  voucher_amount: 10000,
  min_order_amount: 0,
  voucher_valid_days: 30,
  monthly_limit: null,
  is_active: true,
}

export default function LoyaltyRewardsAdminPage() {
  const [items, setItems] = useState<LoyaltyReward[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<LoyaltyReward>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [openCreateModal, setOpenCreateModal] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await loyaltyAdminService.getRewards({ per_page: 100 })
      setItems(res.data || [])
    } catch {
      toast.error('Không tải được reward catalog.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createReward = async () => {
    if (!form.name || !form.points_cost || !form.voucher_amount) {
      toast.error('Vui lòng nhập đủ tên, điểm và giá trị voucher.')
      return
    }
    setSaving(true)
    try {
      await loyaltyAdminService.createReward(form)
      toast.success('Đã tạo phần thưởng thành công.')
      setForm(EMPTY_FORM)
      setOpenCreateModal(false)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Tạo reward thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const removeReward = async (id: number) => {
    if (!confirm('Xóa reward này?')) return
    try {
      await loyaltyAdminService.deleteReward(id)
      toast.success('Đã xóa reward.')
      load()
    } catch {
      toast.error('Xóa thất bại.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Quản lý phần thưởng Loyalty</h1>
          <p className="text-sm text-slate-500 mt-1">Thiết lập các mốc điểm để thành viên đổi voucher.</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminTrashLink trashType="loyalty_reward" />
          <button
            onClick={() => setOpenCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ed2a2a] text-white text-sm font-black"
          >
            <Plus className="w-4 h-4" /> Tạo phần thưởng
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-slate-400 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" />Đang tải...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Tên phần thưởng</th>
                <th className="px-4 py-3 text-right">Điểm cần</th>
                <th className="px-4 py-3 text-right">Giá trị voucher</th>
                <th className="px-4 py-3 text-right">Hạn voucher</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-700">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.description || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{r.points_cost}</td>
                  <td className="px-4 py-3 text-right font-semibold">{Number(r.voucher_amount).toLocaleString('vi-VN')}đ</td>
                  <td className="px-4 py-3 text-right">{r.voucher_valid_days} ngày</td>
                  <td className="px-4 py-3 text-center">{r.is_active ? 'Hoạt động' : 'Tắt'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeReward(r.id)} className="p-2 rounded-lg bg-red-50 text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-800 text-lg">Tạo phần thưởng Loyalty</h2>
                <p className="text-sm text-slate-500">Nhập thông tin để tạo mốc đổi quà mới.</p>
              </div>
              <button
                onClick={() => setOpenCreateModal(false)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <input className="px-3 py-2 rounded-xl border border-slate-200" placeholder="Tên phần thưởng" value={form.name || ''} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                <input className="px-3 py-2 rounded-xl border border-slate-200" placeholder="Điểm cần để đổi" type="number" value={form.points_cost || 0} onChange={(e) => setForm((s) => ({ ...s, points_cost: Number(e.target.value) }))} />
                <input className="px-3 py-2 rounded-xl border border-slate-200" placeholder="Giá trị voucher (VND)" type="number" value={form.voucher_amount || 0} onChange={(e) => setForm((s) => ({ ...s, voucher_amount: Number(e.target.value) }))} />
                <input className="px-3 py-2 rounded-xl border border-slate-200" placeholder="Đơn tối thiểu áp dụng" type="number" value={form.min_order_amount || 0} onChange={(e) => setForm((s) => ({ ...s, min_order_amount: Number(e.target.value) }))} />
                <input className="px-3 py-2 rounded-xl border border-slate-200" placeholder="Số ngày voucher có hiệu lực" type="number" value={form.voucher_valid_days || 30} onChange={(e) => setForm((s) => ({ ...s, voucher_valid_days: Number(e.target.value) }))} />
                <input className="px-3 py-2 rounded-xl border border-slate-200" placeholder="Giới hạn số lượt/tháng (tuỳ chọn)" type="number" value={form.monthly_limit ?? ''} onChange={(e) => setForm((s) => ({ ...s, monthly_limit: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <textarea className="w-full px-3 py-2 rounded-xl border border-slate-200" placeholder="Mô tả ngắn cho phần thưởng" value={form.description || ''} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setOpenCreateModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold">
                Hủy
              </button>
              <button disabled={saving} onClick={createReward} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ed2a2a] text-white text-sm font-black">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Lưu phần thưởng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
