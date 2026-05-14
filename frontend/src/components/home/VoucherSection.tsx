'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { voucherService } from '@/services/voucher.service'
import type { Voucher } from '@/types'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const VoucherSkeleton = () => (
  <div className="flex space-x-4 overflow-x-hidden pt-2">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex-shrink-0 w-80 h-32 bg-gray-100 rounded-2xl animate-pulse" />
    ))}
  </div>
)

const VoucherSection = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const data = await voucherService.getPublicVouchers({ status: 'active', limit: 4 })
        setVouchers((data || []).slice(0, 4))
      } catch (error) {
        console.error("[VoucherSection] Error:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchVouchers()
  }, [])

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Đã sao chép mã thành công!', {
      description: `Mã: ${code}`,
      icon: '🎫',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <VoucherSkeleton />
      </div>
    )
  }

  if (vouchers.length === 0) return null

  return (
    <section className="py-8 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 border-l-4 border-HDG-600 pl-4">
            Mã giảm giá cho bạn
          </h2>
          <span className="text-sm text-HDG-600 font-medium cursor-pointer hover:underline">
            Xem tất cả
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {vouchers.map((voucher) => {
            const isExpired = voucher.end_date && new Date(voucher.end_date) < new Date()
            
            return (
              <motion.div
                key={voucher.id}
                whileHover={{ y: -5 }}
                className="flex bg-[#fff5f5] rounded-2xl border border-red-100 shadow-sm overflow-hidden snap-start group"
              >
                {/* Left Part: Code */}
                <div className="w-1/3 bg-HDG-600/5 flex flex-col items-center justify-center border-r-2 border-dashed border-red-200 relative">
                  {/* Decorative Half Circles */}
                  <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border border-red-100" />
                  <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-white rounded-full border border-red-100" />
                  
                  <span className="text-[10px] font-bold text-HDG-600/60 uppercase tracking-widest mb-1">Mã</span>
                  <p className="text-lg font-black text-HDG-600 tracking-tighter truncate px-2">
                    {voucher.code}
                  </p>
                </div>

                {/* Right Part: Info */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 line-clamp-1">
                      {voucher.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {voucher.description || `Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(voucher.min_order_amount || 0)}₫`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="text-[10px] text-gray-400">
                      HSD: {voucher.end_date ? format(new Date(voucher.end_date), 'dd/MM/yyyy') : 'Không thời hạn'}
                    </div>
                    <button
                      onClick={() => !isExpired && copyToClipboard(voucher.code)}
                      disabled={isExpired}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all shadow-lg ${
                        isExpired
                          ? 'bg-gray-300 text-white cursor-not-allowed shadow-none'
                          : 'bg-HDG-600 text-white hover:bg-black shadow-red-500/20 active:scale-95'
                      }`}
                    >
                      {isExpired ? 'Hết hạn' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

    </section>
  )
}

export default VoucherSection
