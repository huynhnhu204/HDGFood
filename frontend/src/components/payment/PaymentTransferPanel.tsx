'use client'

import { useEffect, useState } from 'react'
import { QrCode, Loader2, Download, Copy, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { paymentService, type PaymentQrPayload } from '@/services/payment.service'
import { useAuthStore } from '@/store/authStore'

type Props = {
  orderId: number
  customerPhone?: string
  onClaimed?: () => void
  /** Ẩn bước & nhãn trạng thái khi nhúng trong trang success (tránh trùng UI) */
  embedded?: boolean
}

export default function PaymentTransferPanel({ orderId, customerPhone, onClaimed, embedded }: Props) {
  const { user } = useAuthStore()
  const [qrData, setQrData] = useState<PaymentQrPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)

  const phone = customerPhone || user?.phone || ''

  useEffect(() => {
    setLoading(true)
    paymentService
      .getOrderQr(orderId, phone || undefined)
      .then((data) => {
        setQrData(data)
        setClaimed(Boolean(data.payment_claimed_at) || data.payment_status === 'paid')
      })
      .catch(() => setQrData(null))
      .finally(() => setLoading(false))
  }, [orderId, phone, user])

  const handleClaim = async () => {
    setClaiming(true)
    try {
      const res = await paymentService.claimPayment(orderId, phone || undefined)
      setClaimed(true)
      toast.success(res.message)
      onClaimed?.()
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Không gửi được xác nhận.')
    } finally {
      setClaiming(false)
    }
  }

  const copyInfo = () => {
    if (!qrData) return
    const text = `HDG FOOD\nSố tiền: ${qrData.amount.toLocaleString('vi-VN')}đ\nNội dung: ${qrData.transfer_reference}\nTK: ${qrData.bank.bank_account}`
    navigator.clipboard.writeText(text)
    toast.success('Đã sao chép thông tin chuyển khoản')
  }

  if (qrData?.payment_status === 'paid') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
        <p className="text-sm font-black text-emerald-700 uppercase tracking-wide">Đã thanh toán</p>
        <p className="text-xs text-emerald-600 mt-1">Nhà hàng đã xác nhận. Đơn sẽ được xử lý sớm.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <p className="text-center text-[11px] font-bold text-amber-700 uppercase tracking-wide">
          {claimed ? 'Đã báo CK — chờ nhà hàng đối soát' : 'Chờ chuyển khoản'}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
        </div>
      ) : qrData?.qr_image_url ? (
        <>
          <div className="flex flex-col items-center">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-800 mb-3">
              <QrCode className="w-4 h-4 text-[#ed2a2a]" /> Quét mã VietQR để thanh toán
            </h4>
            <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrData.qr_image_url} alt="VietQR" className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl" />
              <a
                href={qrData.qr_image_url}
                download={`hdgfood-${orderId}.png`}
                className="absolute -bottom-2 -right-2 w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#ed2a2a]"
                aria-label="Tải mã QR"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs space-y-1.5">
            <p><span className="text-slate-500">Ngân hàng:</span> <strong>{qrData.bank.bank_bin?.toUpperCase()}</strong></p>
            <p><span className="text-slate-500">STK:</span> <strong className="font-mono">{qrData.bank.bank_account}</strong></p>
            <p><span className="text-slate-500">Chủ TK:</span> <strong>{qrData.bank.bank_account_name}</strong></p>
            <p><span className="text-slate-500">Số tiền:</span> <strong className="text-[#ed2a2a] text-sm">{qrData.amount.toLocaleString('vi-VN')}đ</strong></p>
            <p className="break-all"><span className="text-slate-500">Nội dung CK:</span> <strong className="font-mono text-[11px]">{qrData.transfer_reference}</strong></p>
          </div>
          <button
            type="button"
            onClick={copyInfo}
            className="w-full py-2 text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 border border-dashed border-slate-200 rounded-lg"
          >
            <Copy className="w-3.5 h-3.5" /> Sao chép thông tin
          </button>
        </>
      ) : (
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          Chưa cấu hình tài khoản ngân hàng. Liên hệ quán hoặc thử lại sau.
        </p>
      )}

      <button
        type="button"
        disabled={claiming || claimed || loading}
        onClick={handleClaim}
        className="w-full py-3.5 rounded-full bg-[#ed2a2a] text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-60 hover:bg-slate-900 transition-colors shadow-lg shadow-red-500/20"
      >
        {claiming ? 'Đang gửi...' : claimed ? 'Đã báo chuyển khoản — chờ đối soát' : 'Tôi đã chuyển khoản'}
      </button>
    </div>
  )
}
