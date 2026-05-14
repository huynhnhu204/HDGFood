'use client'

import { useEffect, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { automationAdminService } from '@/services/admin/automation-admin.service'

interface RuleItem {
  rule: string
  enabled: boolean
}

const RULE_LABELS: Record<string, string> = {
  cart_abandoned: 'Giỏ hàng bị bỏ quên',
  inactive_user: 'Người dùng lâu không quay lại',
  reorder_reminder: 'Nhắc đặt lại đơn cũ',
  loyalty_eligible_reward: 'Đủ điểm đổi quà Loyalty',
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'Đang chờ gửi',
  sent: 'Đã gửi',
  failed: 'Gửi thất bại',
}

export default function AutomationAdminPage() {
  const [rules, setRules] = useState<RuleItem[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [ruleData, logData] = await Promise.all([
        automationAdminService.getRules(),
        automationAdminService.getLogs({ per_page: 50 }),
      ])
      setRules(ruleData)
      setLogs(logData.data || [])
    } catch {
      toast.error('Không tải được dữ liệu automation.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggleRule = async (rule: string, enabled: boolean) => {
    try {
      await automationAdminService.updateRule(rule, enabled)
      setRules((prev) => prev.map((r) => (r.rule === rule ? { ...r, enabled } : r)))
      toast.success('Đã cập nhật rule.')
    } catch {
      toast.error('Cập nhật rule thất bại.')
    }
  }

  const runNow = async () => {
    setRunning(true)
    try {
      const res = await automationAdminService.runNow()
      toast.success(res?.message || 'Đã chạy automation.')
      load()
    } catch {
      toast.error('Chạy automation thất bại.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Tự động gửi email chăm sóc khách hàng</h1>
          <p className="text-sm text-slate-500 mt-1">Bật/tắt từng kịch bản và theo dõi lịch sử gửi email tự động.</p>
        </div>
        <button onClick={runNow} disabled={running} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ed2a2a] text-white text-sm font-black">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Chạy ngay
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-black text-slate-700">Danh sách kịch bản</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
          {rules.map((rule) => (
            <div key={rule.rule} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-bold text-slate-700">{RULE_LABELS[rule.rule] ?? rule.rule}</p>
              <p className="text-xs text-slate-400 mt-1">Bật hoặc tắt gửi email cho kịch bản này.</p>
              <button
                onClick={() => toggleRule(rule.rule, !rule.enabled)}
                className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-black ${rule.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
              >
                {rule.enabled ? 'Đang bật' : 'Đang tắt'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-700">Lịch sử chiến dịch email</h2>
        </div>
        {loading ? (
          <div className="p-8 text-slate-400 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" />Đang tải...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Kịch bản</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-semibold text-slate-700">{RULE_LABELS[log.campaign_type] ?? log.campaign_type}</td>
                  <td className="px-4 py-3 text-slate-600">{log.email || '—'}</td>
                  <td className="px-4 py-3 text-center">{STATUS_LABELS[log.status] ?? log.status}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
