'use client'

import { useEffect, useState } from 'react'
import { Gift, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { LoyaltyReward, LoyaltySummary, LoyaltyTransaction } from '@/types'
import { loyaltyService } from '@/services/loyalty.service'

const fmt = (n: number) => n.toLocaleString('vi-VN')
const money = (n: number) => Number(n || 0).toLocaleString('vi-VN') + 'đ'

export default function LoyaltyTab() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [txs, setTxs] = useState<LoyaltyTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [redeemingId, setRedeemingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sum, rewardData, txData] = await Promise.all([
        loyaltyService.getSummary(),
        loyaltyService.getRewards(),
        loyaltyService.getTransactions(1),
      ])
      setSummary(sum)
      setRewards(rewardData)
      setTxs(txData.data || [])
    } catch {
      toast.error('Không thể tải dữ liệu loyalty.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const redeem = async (rewardId: number) => {
    setRedeemingId(rewardId)
    try {
      const res = await loyaltyService.redeem(rewardId)
      toast.success(res?.message || 'Đổi quà thành công.')
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Đổi quà thất bại.')
    } finally {
      setRedeemingId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải loyalty...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-lg font-black text-slate-800">Điểm thưởng của bạn</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Stat label="Điểm khả dụng" value={fmt(summary?.available || 0)} className="text-[#ed2a2a]" />
          <Stat label="Đã tích lũy" value={fmt(summary?.earned || 0)} />
          <Stat label="Đã đổi" value={fmt(summary?.redeemed || 0)} />
          <Stat label="Điều chỉnh" value={fmt(summary?.adjustment || 0)} />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-lg font-black text-slate-800">Đổi điểm lấy voucher</h3>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {rewards.map((reward) => (
            <div key={reward.id} className="border border-slate-200 rounded-2xl p-4">
              <p className="font-black text-slate-800">{reward.name}</p>
              <p className="text-xs text-slate-500 mt-1">{reward.description || 'Voucher đổi từ điểm thưởng loyalty.'}</p>
              <div className="mt-3 text-sm font-semibold text-slate-700">
                {reward.points_cost} điểm {'->'} {money(Number(reward.voucher_amount))}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Đơn tối thiểu: {money(Number(reward.min_order_amount || 0))} - Hạn dùng: {reward.voucher_valid_days} ngày
              </div>
              <button
                onClick={() => redeem(reward.id)}
                disabled={redeemingId === reward.id || (summary?.available || 0) < reward.points_cost}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ed2a2a] text-white text-xs font-black uppercase tracking-wider disabled:opacity-50"
              >
                {redeemingId === reward.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                Đổi ngay
              </button>
            </div>
          ))}
          {rewards.length === 0 && <p className="text-sm text-slate-500">Hiện chưa có quà đổi điểm.</p>}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-lg font-black text-slate-800">Lịch sử điểm gần đây</h3>
        <div className="divide-y divide-slate-100 mt-3">
          {txs.slice(0, 10).map((tx) => (
            <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">{tx.note || tx.source}</p>
                <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
              </div>
              <span className={`text-sm font-black ${tx.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {tx.points >= 0 ? '+' : ''}{tx.points}
              </span>
            </div>
          ))}
          {txs.length === 0 && <p className="text-sm text-slate-500 py-4">Chưa có giao dịch điểm.</p>}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <p className="text-[11px] uppercase tracking-wider font-black text-slate-400">{label}</p>
      <p className={`text-xl font-black mt-1 text-slate-800 ${className}`}>{value}</p>
    </div>
  )
}
