'use client'

import { useState, useEffect } from 'react'
import { MapPin, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

interface AvailabilityCheckerProps {
  productId: number
  productName: string
}

export default function AvailabilityChecker({ productId, productName }: AvailabilityCheckerProps) {
  const [province, setProvince] = useState<{ code: string; name: string } | null>(null)
  const [district, setDistrict] = useState<{ code: string; name: string } | null>(null)
  const [ward, setWard] = useState<{ code: string; name: string } | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lấy location từ URL params hoặc localStorage
    const checkAvailability = async () => {
      setLoading(true)
      
      try {
        // Lấy từ URL params
        const urlParams = new URLSearchParams(window.location.search)
        const provinceCode = urlParams.get('province') || localStorage.getItem('selected_province')
        const districtCode = urlParams.get('district') || localStorage.getItem('selected_district')
        const wardCode = urlParams.get('ward') || localStorage.getItem('selected_ward')

        if (provinceCode) {
          // Fetch province name
          const provinceRes = await axios.get(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
          setProvince({ code: provinceCode, name: provinceRes.data.name })

          if (districtCode) {
            const districtData = provinceRes.data.districts?.find((d: any) => d.code.toString() === districtCode)
            if (districtData) {
              setDistrict({ code: districtCode, name: districtData.name })

              if (wardCode) {
                const districtRes = await axios.get(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
                const wardData = districtRes.data.wards?.find((w: any) => w.code.toString() === wardCode)
                if (wardData) {
                  setWard({ code: wardCode, name: wardData.name })
                }
              }
            }
          }

          // Giả lập check availability (trong thực tế gọi API backend)
          // Backend sẽ check xem có cửa hàng/kho nào phục vụ khu vực này không
          const available = Math.random() > 0.2 // 80% có sẵn
          setIsAvailable(available)
        } else {
          setIsAvailable(null)
        }
      } catch (error) {
        console.error('Check availability failed:', error)
        setIsAvailable(null)
      } finally {
        setLoading(false)
      }
    }

    checkAvailability()
  }, [productId])

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center gap-4">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        <span className="text-sm font-bold text-slate-400">Đang kiểm tra khu vực phục vụ...</span>
      </div>
    )
  }

  if (!province) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-sm font-black text-amber-900 uppercase">Chưa chọn khu vực</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              Vui lòng chọn Tỉnh/Thành phố ở trang danh sách để kiểm tra món này có phục vụ tại khu vực của bạn không.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {isAvailable === true ? (
        <motion.div
          key="available"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="space-y-2">
              <h4 className="text-sm font-black text-emerald-900 uppercase flex items-center gap-2">
                Có sẵn tại khu vực của bạn
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </h4>
              <p className="text-xs text-emerald-700 leading-relaxed">
                <span className="font-bold">{productName}</span> đang có sẵn tại{' '}
                {ward && <span className="font-bold">{ward.name}, </span>}
                {district && <span className="font-bold">{district.name}, </span>}
                <span className="font-bold">{province.name}</span>
                . Giao hàng trong vòng 30 phút!
              </p>
            </div>
          </div>
        </motion.div>
      ) : isAvailable === false ? (
        <motion.div
          key="unavailable"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <XCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div className="space-y-2">
              <h4 className="text-sm font-black text-red-900 uppercase">Chưa phục vụ tại khu vực này</h4>
              <p className="text-xs text-red-700 leading-relaxed">
                Rất tiếc, <span className="font-bold">{productName}</span> chưa có sẵn tại{' '}
                {ward && <span>{ward.name}, </span>}
                {district && <span>{district.name}, </span>}
                <span>{province.name}</span>. Vui lòng chọn khu vực khác hoặc xem các món tương tự.
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
