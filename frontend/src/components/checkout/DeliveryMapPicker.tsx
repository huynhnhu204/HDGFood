'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Navigation, Loader2, AlertCircle, CheckCircle2, ExternalLink, MapPin, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { deliveryService, type DeliveryCheckResult } from '@/services/delivery.service'
import { reverseGeocode, type ReverseGeocodeResult } from '@/lib/reverseGeocode'

const DeliveryMapInner = dynamic(() => import('./DeliveryMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center bg-slate-50">
      <Loader2 className="h-6 w-6 animate-spin text-[#ed2a2a]" />
    </div>
  ),
})

export interface DeliveryLocation {
  latitude: number
  longitude: number
  withinRadius: boolean
  distanceKm: number
  maxRadiusKm: number
  message: string
  resolvedAddress?: string
  confirmed: boolean
  geocode?: ReverseGeocodeResult
}

interface DeliveryMapPickerProps {
  onLocationChange?: (location: DeliveryLocation | null) => void
  onAddressResolved?: (address: string) => void
  savedAddressHint?: string
  autoLocate?: boolean
}

export default function DeliveryMapPicker({
  onLocationChange,
  onAddressResolved,
  savedAddressHint,
  autoLocate = false,
}: DeliveryMapPickerProps) {
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [locating, setLocating] = useState(false)
  const [storeLat, setStoreLat] = useState(10.776889)
  const [storeLng, setStoreLng] = useState(106.700806)
  const [radiusKm, setRadiusKm] = useState(25)
  const [customerLat, setCustomerLat] = useState(10.776889)
  const [customerLng, setCustomerLng] = useState(106.700806)
  const [checkResult, setCheckResult] = useState<DeliveryCheckResult | null>(null)
  const [hasPinned, setHasPinned] = useState(false)
  const [addressDraft, setAddressDraft] = useState('')
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<DeliveryLocation | null>(null)
  const [geocodeResult, setGeocodeResult] = useState<ReverseGeocodeResult | null>(null)

  const notifyUnconfirmed = useCallback((loc: DeliveryLocation | null) => {
    onLocationChange?.(loc?.confirmed ? loc : null)
  }, [onLocationChange])

  const runCheck = useCallback(async (lat: number, lng: number) => {
    setChecking(true)
    try {
      return await deliveryService.checkLocation(lat, lng)
    } catch {
      return null
    } finally {
      setChecking(false)
    }
  }, [])

  const handleLocationPick = useCallback(async (lat: number, lng: number) => {
    setCustomerLat(lat)
    setCustomerLng(lng)
    setHasPinned(true)
    setLocationConfirmed(false)
    setGeocoding(true)

    const [result, geo] = await Promise.all([
      runCheck(lat, lng),
      reverseGeocode(lat, lng),
    ])

    setGeocoding(false)
    setCheckResult(result)
    setGeocodeResult(geo)

    const resolved = geo?.fullAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    setAddressDraft(resolved)
    onAddressResolved?.(resolved)

    if (result) {
      const loc: DeliveryLocation = {
        latitude: lat,
        longitude: lng,
        withinRadius: result.within_radius,
        distanceKm: result.distance_km,
        maxRadiusKm: result.max_radius_km,
        message: result.message,
        resolvedAddress: resolved,
        confirmed: false,
        geocode: geo || undefined,
      }
      setPendingLocation(loc)
      notifyUnconfirmed(loc)
    } else {
      setPendingLocation(null)
      notifyUnconfirmed(null)
    }
  }, [runCheck, onAddressResolved, notifyUnconfirmed])

  const handleConfirmLocation = useCallback(() => {
    if (!pendingLocation || !checkResult?.within_radius) {
      toast.error('Không thể xác nhận', {
        description: 'Vui lòng chọn vị trí trong vùng giao hàng.',
      })
      return
    }
    if (!addressDraft.trim()) {
      toast.error('Thiếu địa chỉ', { description: 'Vui lòng nhập hoặc kiểm tra địa chỉ giao hàng.' })
      return
    }

    const confirmed: DeliveryLocation = {
      ...pendingLocation,
      resolvedAddress: addressDraft.trim(),
      confirmed: true,
      geocode: geocodeResult || pendingLocation.geocode,
    }
    setLocationConfirmed(true)
    onAddressResolved?.(addressDraft.trim())
    onLocationChange?.(confirmed)
    toast.success('Đã lưu vị trí giao hàng', {
      description: 'Đơn hàng sẽ được giao đúng điểm bạn vừa xác nhận.',
    })
  }, [pendingLocation, checkResult, addressDraft, onAddressResolved, onLocationChange])

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị GPS')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handleLocationPick(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
      },
      () => {
        setLocating(false)
        toast.error('Không lấy được vị trí', { description: 'Hãy cho phép truy cập GPS hoặc ghim thủ công trên bản đồ.' })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [handleLocationPick])

  useEffect(() => {
    deliveryService.getConfig().then((config) => {
      setStoreLat(config.store_latitude)
      setStoreLng(config.store_longitude)
      setRadiusKm(config.delivery_radius_km)
      setCustomerLat(config.store_latitude)
      setCustomerLng(config.store_longitude)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && autoLocate) {
      handleUseMyLocation()
    }
  }, [loading, autoLocate, handleUseMyLocation])

  const googleMapsUrl = `https://www.google.com/maps?q=${customerLat},${customerLng}`

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/80">
        <Loader2 className="h-6 w-6 animate-spin text-[#ed2a2a]" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
          Ghim vị trí · bán kính {radiusKm}km
        </p>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating || geocoding}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#ed2a2a] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#d42424] disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
          Vị trí của tôi
        </button>
      </div>

      {savedAddressHint && !locationConfirmed && (
        <p className="border-b border-slate-100 bg-white px-4 py-2 text-xs text-slate-600">
          <span className="font-bold">Đã lưu:</span> {savedAddressHint}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="ml-2 font-bold text-[#ed2a2a] hover:underline disabled:opacity-60"
          >
            Định vị lại
          </button>
        </p>
      )}

      <DeliveryMapInner
        storeLat={storeLat}
        storeLng={storeLng}
        customerLat={customerLat}
        customerLng={customerLng}
        radiusKm={radiusKm}
        onLocationPick={handleLocationPick}
      />

      <div className="space-y-3 border-t border-slate-100 bg-white px-4 py-3">
        {!hasPinned ? (
          <p className="text-center text-xs text-slate-500">
            Bấm &quot;Vị trí của tôi&quot; hoặc kéo ghim xanh, sau đó <strong>xác nhận địa chỉ</strong> bên dưới
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={locationConfirmed ? 'confirmed' : 'pending'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Kết quả kiểm tra bán kính */}
              <div
                className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
                  checking
                    ? 'bg-slate-50 text-slate-600'
                    : checkResult?.within_radius
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-red-50 text-red-800'
                }`}
              >
                {checking ? (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : checkResult?.within_radius ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {checking ? 'Đang kiểm tra khoảng cách...' : checkResult?.message}
                  </p>
                  {checkResult && !checking && (
                    <p className="mt-0.5 opacity-80">
                      {checkResult.distance_km} km
                      {' · '}
                      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#ed2a2a] hover:underline">
                        Google Maps <ExternalLink className="inline h-3 w-3" />
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Địa chỉ tự điền từ GPS */}
              {checkResult?.within_radius && (
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <MapPin className="h-3 w-3" />
                    Địa chỉ giao hàng {geocoding && <Loader2 className="h-3 w-3 animate-spin" />}
                  </label>
                  <input
                    type="text"
                    value={addressDraft}
                    onChange={(e) => {
                      setAddressDraft(e.target.value)
                      setLocationConfirmed(false)
                      notifyUnconfirmed(pendingLocation)
                    }}
                    placeholder="Địa chỉ sẽ tự điền sau khi ghim vị trí..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-[#ed2a2a] focus:bg-white focus:ring-2 focus:ring-red-50"
                  />
                  <p className="text-[10px] text-slate-400">
                    Kiểm tra và chỉnh sửa nếu cần (số nhà, tên đường, tòa nhà...)
                  </p>

                  {locationConfirmed ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Đã xác nhận vị trí giao hàng
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmLocation}
                      disabled={geocoding || checking || !addressDraft.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ed2a2a] py-3 text-xs font-black uppercase tracking-wide text-white shadow-md shadow-red-200/30 hover:bg-[#d42424] disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Xác nhận & lưu vị trí giao hàng
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
