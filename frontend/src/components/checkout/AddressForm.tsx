'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, ChevronDown, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import DeliveryMapPicker, { type DeliveryLocation } from './DeliveryMapPicker'
import type { ReverseGeocodeResult } from '@/lib/reverseGeocode'
import {
  matchAdminUnit,
  extractStreetFromAddress,
  type AdminUnit,
} from '@/lib/matchAdminUnits'

interface Province extends AdminUnit {}
interface District extends AdminUnit {}
interface Ward extends AdminUnit {}

interface AddressFormProps {
  onAddressChange?: (address: {
    province: string
    provinceCode: string
    district: string
    districtCode: string
    ward: string
    wardCode: string
    street: string
    fullAddress: string
    deliveryLocation?: DeliveryLocation | null
  }) => void
  onDeliveryLocationChange?: (location: DeliveryLocation | null) => void
  onAddressResolved?: (address: string) => void
  /** Ẩn bản đồ (dùng DeliveryMapPicker riêng ở checkout) */
  hideMap?: boolean
  /** Vị trí đã xác nhận từ bản đồ checkout — tự điền form */
  fillFromLocation?: DeliveryLocation | null
  initialValues?: {
    provinceCode?: string
    districtCode?: string
    wardCode?: string
    street?: string
  }
}

async function fetchProvinceList(): Promise<Province[]> {
  const res = await axios.get('https://provinces.open-api.vn/api/p/')
  return res.data.map((p: { code: number; name: string }) => ({
    code: p.code.toString(),
    name: p.name,
  }))
}

async function fetchDistrictList(provinceCode: string): Promise<District[]> {
  const res = await axios.get(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
  return res.data.districts?.map((d: { code: number; name: string }) => ({
    code: d.code.toString(),
    name: d.name,
  })) || []
}

async function fetchWardList(districtCode: string): Promise<Ward[]> {
  const res = await axios.get(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
  return res.data.wards?.map((w: { code: number; name: string }) => ({
    code: w.code.toString(),
    name: w.name,
  })) || []
}

export default function AddressForm({
  onAddressChange,
  onDeliveryLocationChange,
  onAddressResolved,
  hideMap = false,
  fillFromLocation,
  initialValues,
}: AddressFormProps) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [wards, setWards] = useState<Ward[]>([])

  const [selectedProvince, setSelectedProvince] = useState<string>(initialValues?.provinceCode || '')
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialValues?.districtCode || '')
  const [selectedWard, setSelectedWard] = useState<string>(initialValues?.wardCode || '')
  const [street, setStreet] = useState<string>(initialValues?.street || '')
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null)
  const [autoFilled, setAutoFilled] = useState(false)
  const [fillWarning, setFillWarning] = useState<string | null>(null)

  const applyingGeocodeRef = useRef(false)
  const lastFillKeyRef = useRef('')

  const [loading, setLoading] = useState({
    provinces: false,
    districts: false,
    wards: false,
    geocode: false,
  })

  const activeLocation = hideMap ? fillFromLocation : deliveryLocation
  const showAddressFields = Boolean(activeLocation?.confirmed)

  const notifyParent = useCallback((
    provinceCode: string,
    districtCode: string,
    wardCode: string,
    streetValue: string,
    provList: Province[],
    distList: District[],
    wardList: Ward[],
    loc: DeliveryLocation | null,
  ) => {
    if (!provinceCode || !districtCode || !wardCode) return

    const province = provList.find((p) => p.code === provinceCode)
    const district = distList.find((d) => d.code === districtCode)
    const ward = wardList.find((w) => w.code === wardCode)

    if (!province || !district || !ward) return

    const fullAddress = [streetValue, ward.name, district.name, province.name]
      .filter(Boolean)
      .join(', ')

    onAddressChange?.({
      province: province.name,
      provinceCode: province.code,
      district: district.name,
      districtCode: district.code,
      ward: ward.name,
      wardCode: ward.code,
      street: streetValue,
      fullAddress,
      deliveryLocation: loc,
    })
    onAddressResolved?.(fullAddress)
  }, [onAddressChange, onAddressResolved])

  const applyGeocodeFill = useCallback(async (
    geo: ReverseGeocodeResult,
    resolvedAddress?: string,
    loc?: DeliveryLocation | null,
  ) => {
    const fillKey = `${loc?.latitude}-${loc?.longitude}-${resolvedAddress || geo.fullAddress}`
    if (lastFillKeyRef.current === fillKey) return
    lastFillKeyRef.current = fillKey

    applyingGeocodeRef.current = true
    setLoading((prev) => ({ ...prev, geocode: true }))
    setFillWarning(null)

    try {
      let provList = provinces
      if (!provList.length) {
        setLoading((prev) => ({ ...prev, provinces: true }))
        provList = await fetchProvinceList()
        setProvinces(provList)
        setLoading((prev) => ({ ...prev, provinces: false }))
      }

      const streetValue = extractStreetFromAddress(geo, resolvedAddress)
      setStreet(streetValue)

      const province = matchAdminUnit(provList, geo.province)
      if (!province) {
        setFillWarning('Không khớp được Tỉnh/TP — vui lòng chọn thủ công.')
        setAutoFilled(false)
        return
      }

      setSelectedProvince(province.code)
      setLoading((prev) => ({ ...prev, districts: true }))
      const distList = await fetchDistrictList(province.code)
      setDistricts(distList)
      setLoading((prev) => ({ ...prev, districts: false }))

      const district = matchAdminUnit(distList, geo.district)
      if (!district) {
        setFillWarning('Đã điền Tỉnh/TP — vui lòng chọn Quận/Huyện thủ công.')
        setAutoFilled(true)
        return
      }

      setSelectedDistrict(district.code)
      setLoading((prev) => ({ ...prev, wards: true }))
      const wardList = await fetchWardList(district.code)
      setWards(wardList)
      setLoading((prev) => ({ ...prev, wards: false }))

      const ward = matchAdminUnit(wardList, geo.ward)
      if (!ward) {
        setFillWarning('Đã điền Tỉnh/TP và Quận/Huyện — vui lòng chọn Phường/Xã thủ công.')
        setSelectedWard('')
        setAutoFilled(true)
        notifyParent(province.code, district.code, '', streetValue, provList, distList, wardList, loc || null)
        return
      }

      setSelectedWard(ward.code)
      setAutoFilled(true)
      notifyParent(province.code, district.code, ward.code, streetValue, provList, distList, wardList, loc || null)
    } catch {
      setFillWarning('Không tự điền được — vui lòng nhập địa chỉ thủ công.')
      setAutoFilled(false)
    } finally {
      applyingGeocodeRef.current = false
      setLoading((prev) => ({ ...prev, geocode: false }))
    }
  }, [provinces, notifyParent])

  useEffect(() => {
    fetchProvinceList()
      .then(setProvinces)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (applyingGeocodeRef.current) return
    if (selectedProvince) {
      setLoading((prev) => ({ ...prev, districts: true }))
      fetchDistrictList(selectedProvince)
        .then(setDistricts)
        .catch(() => setDistricts([]))
        .finally(() => setLoading((prev) => ({ ...prev, districts: false })))
      if (!autoFilled) {
        setSelectedDistrict('')
        setSelectedWard('')
        setWards([])
      }
    } else {
      setDistricts([])
      setSelectedDistrict('')
      setSelectedWard('')
      setWards([])
    }
  }, [selectedProvince, autoFilled])

  useEffect(() => {
    if (applyingGeocodeRef.current) return
    if (selectedDistrict) {
      setLoading((prev) => ({ ...prev, wards: true }))
      fetchWardList(selectedDistrict)
        .then(setWards)
        .catch(() => setWards([]))
        .finally(() => setLoading((prev) => ({ ...prev, wards: false })))
      if (!autoFilled) {
        setSelectedWard('')
      }
    } else {
      setWards([])
      setSelectedWard('')
    }
  }, [selectedDistrict, autoFilled])

  useEffect(() => {
    if (!showAddressFields) return
    if (selectedProvince && selectedDistrict && selectedWard) {
      notifyParent(
        selectedProvince,
        selectedDistrict,
        selectedWard,
        street,
        provinces,
        districts,
        wards,
        activeLocation || null,
      )
    }
  }, [
    showAddressFields,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    street,
    provinces,
    districts,
    wards,
    activeLocation,
    notifyParent,
  ])

  useEffect(() => {
    if (!fillFromLocation?.confirmed) return
    const geo = fillFromLocation.geocode
    if (!geo) {
      setStreet(extractStreetFromAddress(
        { fullAddress: fillFromLocation.resolvedAddress || '' },
        fillFromLocation.resolvedAddress,
      ))
      setFillWarning('Chưa phân tích được địa chỉ — vui lòng chọn Tỉnh/Quận/Phường thủ công.')
      return
    }
    applyGeocodeFill(geo, fillFromLocation.resolvedAddress, fillFromLocation)
  }, [fillFromLocation, applyGeocodeFill])

  const handleDeliveryLocationChange = (location: DeliveryLocation | null) => {
    setDeliveryLocation(location)
    onDeliveryLocationChange?.(location)

    if (location?.confirmed && location.geocode) {
      applyGeocodeFill(location.geocode, location.resolvedAddress, location)
    }
  }

  return (
    <div className="space-y-4">
      {!hideMap && (
        <div className="pb-2">
          <DeliveryMapPicker
            onLocationChange={handleDeliveryLocationChange}
            onAddressResolved={(addr) => {
              if (!deliveryLocation?.confirmed) {
                onAddressResolved?.(addr)
              }
            }}
          />
          {!deliveryLocation?.confirmed && (
            <p className="mt-3 text-center text-xs text-slate-500">
              Ghim vị trí trên bản đồ và bấm <strong>Xác nhận & lưu</strong> — địa chỉ bên dưới sẽ tự điền.
            </p>
          )}
        </div>
      )}

      {showAddressFields && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-800">
              Địa chỉ tự điền từ vị trí đã ghim
              {loading.geocode && ' — đang xử lý...'}
            </p>
          </div>

          {activeLocation?.resolvedAddress && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Vị trí trên bản đồ
              </p>
              <p className="text-sm font-medium text-slate-700">{activeLocation.resolvedAddress}</p>
            </div>
          )}

          {fillWarning && (
            <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {fillWarning}
            </p>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Số nhà, đường <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => {
                setAutoFilled(false)
                setStreet(e.target.value)
              }}
              placeholder="Ví dụ: Số 123, Đường Lê Lợi"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Tỉnh/Thành phố <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setAutoFilled(false)
                    setSelectedProvince(e.target.value)
                  }}
                  disabled={loading.provinces || loading.geocode}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none pr-10 disabled:opacity-50"
                  required
                >
                  <option value="">-- Chọn Tỉnh/TP --</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Quận/Huyện <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setAutoFilled(false)
                    setSelectedDistrict(e.target.value)
                  }}
                  disabled={!selectedProvince || loading.districts || loading.geocode}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none pr-10 disabled:opacity-50"
                  required
                >
                  <option value="">-- Chọn Quận/Huyện --</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Phường/Xã <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedWard}
                  onChange={(e) => {
                    setAutoFilled(false)
                    setSelectedWard(e.target.value)
                  }}
                  disabled={!selectedDistrict || loading.wards || loading.geocode}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none pr-10 disabled:opacity-50"
                  required
                >
                  <option value="">-- Chọn Phường/Xã --</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>{w.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {selectedProvince && selectedDistrict && selectedWard && street && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                    Địa chỉ giao hàng
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {street}, {wards.find((w) => w.code === selectedWard)?.name},{' '}
                    {districts.find((d) => d.code === selectedDistrict)?.name},{' '}
                    {provinces.find((p) => p.code === selectedProvince)?.name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
