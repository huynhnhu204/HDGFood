'use client'

import { useState, useEffect } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'

interface Province {
  code: string
  name: string
}

interface District {
  code: string
  name: string
}

interface Ward {
  code: string
  name: string
}

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
  }) => void
  initialValues?: {
    provinceCode?: string
    districtCode?: string
    wardCode?: string
    street?: string
  }
}

export default function AddressForm({ onAddressChange, initialValues }: AddressFormProps) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  
  const [selectedProvince, setSelectedProvince] = useState<string>(initialValues?.provinceCode || '')
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialValues?.districtCode || '')
  const [selectedWard, setSelectedWard] = useState<string>(initialValues?.wardCode || '')
  const [street, setStreet] = useState<string>(initialValues?.street || '')
  
  const [loading, setLoading] = useState({
    provinces: false,
    districts: false,
    wards: false
  })

  // Fetch provinces on mount
  useEffect(() => {
    fetchProvinces()
  }, [])

  // Fetch districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince)
      setSelectedDistrict('')
      setSelectedWard('')
      setWards([])
    } else {
      setDistricts([])
      setSelectedDistrict('')
      setSelectedWard('')
      setWards([])
    }
  }, [selectedProvince])

  // Fetch wards when district changes
  useEffect(() => {
    if (selectedDistrict) {
      fetchWards(selectedDistrict)
      setSelectedWard('')
    } else {
      setWards([])
      setSelectedWard('')
    }
  }, [selectedDistrict])

  // Notify parent when address changes
  useEffect(() => {
    if (selectedProvince && selectedDistrict && selectedWard) {
      const province = provinces.find(p => p.code === selectedProvince)
      const district = districts.find(d => d.code === selectedDistrict)
      const ward = wards.find(w => w.code === selectedWard)
      
      if (province && district && ward) {
        const fullAddress = [
          street,
          ward.name,
          district.name,
          province.name
        ].filter(Boolean).join(', ')

        onAddressChange?.({
          province: province.name,
          provinceCode: province.code,
          district: district.name,
          districtCode: district.code,
          ward: ward.name,
          wardCode: ward.code,
          street,
          fullAddress
        })
      }
    }
  }, [selectedProvince, selectedDistrict, selectedWard, street, provinces, districts, wards])

  const fetchProvinces = async () => {
    setLoading(prev => ({ ...prev, provinces: true }))
    try {
      const res = await axios.get('https://provinces.open-api.vn/api/p/')
      setProvinces(res.data.map((p: any) => ({ 
        code: p.code.toString(), 
        name: p.name 
      })))
    } catch (error) {
      console.error('Failed to fetch provinces:', error)
    } finally {
      setLoading(prev => ({ ...prev, provinces: false }))
    }
  }

  const fetchDistricts = async (provinceCode: string) => {
    setLoading(prev => ({ ...prev, districts: true }))
    try {
      const res = await axios.get(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
      setDistricts(res.data.districts?.map((d: any) => ({ 
        code: d.code.toString(), 
        name: d.name 
      })) || [])
    } catch (error) {
      console.error('Failed to fetch districts:', error)
      setDistricts([])
    } finally {
      setLoading(prev => ({ ...prev, districts: false }))
    }
  }

  const fetchWards = async (districtCode: string) => {
    setLoading(prev => ({ ...prev, wards: true }))
    try {
      const res = await axios.get(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
      setWards(res.data.wards?.map((w: any) => ({ 
        code: w.code.toString(), 
        name: w.name 
      })) || [])
    } catch (error) {
      console.error('Failed to fetch wards:', error)
      setWards([])
    } finally {
      setLoading(prev => ({ ...prev, wards: false }))
    }
  }

  return (
    <div className="space-y-4">
      {/* Street Address */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Số nhà, đường <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Ví dụ: Số 123, Đường Lê Lợi"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all"
          required
        />
      </div>

      {/* Province */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Tỉnh/Thành phố <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            disabled={loading.provinces}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
            required
          >
            <option value="">-- Chọn Tỉnh/Thành phố --</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* District */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Quận/Huyện <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!selectedProvince || loading.districts || districts.length === 0}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
            required
          >
            <option value="">-- Chọn Quận/Huyện --</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Ward */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Phường/Xã <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            disabled={!selectedDistrict || loading.wards || wards.length === 0}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all appearance-none pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
            required
          >
            <option value="">-- Chọn Phường/Xã --</option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Preview Full Address */}
      {selectedProvince && selectedDistrict && selectedWard && street && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                Địa chỉ giao hàng
              </p>
              <p className="text-sm font-medium text-slate-700">
                {street}, {wards.find(w => w.code === selectedWard)?.name}, {districts.find(d => d.code === selectedDistrict)?.name}, {provinces.find(p => p.code === selectedProvince)?.name}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
