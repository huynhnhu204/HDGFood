'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Mail, Phone, MapPin, UserCircle, ChevronDown, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { profileService } from '@/services/profile.service'
import type { User } from '@/types'

interface Province { code: string; name: string; }
interface Ward { code: string; name: string; }

const FETCH_TIMEOUT_MS = 10000

const normalizeProvinces = (payload: any): Province[] => {
  const fromTinhThanhPho = Array.isArray(payload?.data) ? payload.data : []
  if (fromTinhThanhPho.length > 0) {
    return fromTinhThanhPho.map((p: any) => ({
      code: String(p.code),
      name: String(p.name),
    }))
  }

  const fromOpenApi = Array.isArray(payload) ? payload : []
  return fromOpenApi.map((p: any) => ({
    code: String(p.code),
    name: String(p.name),
  }))
}

const normalizeWards = (payload: any): Ward[] => {
  const fromTinhThanhPho = Array.isArray(payload?.data) ? payload.data : []
  if (fromTinhThanhPho.length > 0) {
    return fromTinhThanhPho.map((w: any) => ({
      code: String(w.code),
      name: String(w.name),
    }))
  }

  const flat = Array.isArray(payload?.wards) ? payload.wards : []
  if (flat.length > 0) {
    return flat.map((w: any) => ({
      code: String(w.code),
      name: String(w.name),
    }))
  }

  // provinces.open-api.vn ?depth=3 — phường/xã nằm trong districts[].wards[]
  const districts = Array.isArray(payload?.districts) ? payload.districts : []
  const out: Ward[] = []
  for (const d of districts) {
    const ws = d?.wards
    if (!Array.isArray(ws)) continue
    for (const w of ws) {
      out.push({ code: String(w.code), name: String(w.name) })
    }
  }
  return out
}

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

interface Props {
  user: User
  onUpdated: (user: User) => void
}

export default function PersonalInfoForm({ user, onUpdated }: Props) {
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [form, setForm] = useState({
    name:          user.name,
    email:         user.email,
    phone:         user.phone || '',
    address:       user.address || '',
    province_code: user.province_code || '',
    ward_code:     user.ward_code || '',
  })
  
  const [provinces, setProvinces] = useState<Province[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingWards, setLoadingWards] = useState(false)

  useEffect(() => {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      province_code: user.province_code || '',
      ward_code: user.ward_code || '',
    })
  }, [user.id, user.name, user.email, user.phone, user.address, user.province_code, user.ward_code])

  // Fetch Tỉnh — chỉ dùng provinces.open-api.vn (CORS ổn). tinhthanhpho.com gọi từ localhost bị chặn CORS.
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true)
      const provinceSources = ['https://provinces.open-api.vn/api/p/']
      try {
        let loaded: Province[] = []
        for (const url of provinceSources) {
          try {
            const data = await fetchWithTimeout(url)
            loaded = normalizeProvinces(data)
            if (loaded.length > 0) break
          } catch {
            // try next source
          }
        }
        setProvinces(loaded)
      } catch (err) {
        console.error(err)
        setProvinces([])
      } finally {
        setLoadingProvinces(false)
      }
    }
    fetchProvinces()
  }, [])

  // Fetch Phường khi chọn Tỉnh
  useEffect(() => {
    if (!form.province_code) {
      setWards([])
      if (form.ward_code) setForm(prev => ({ ...prev, ward_code: '' }))
      return
    }
    const fetchWards = async () => {
      setLoadingWards(true)
      const code = encodeURIComponent(String(form.province_code).trim())
      // depth=3 mới có wards trong từng quận/huyện; depth=2 thường wards rỗng.
      const wardSources = [`https://provinces.open-api.vn/api/p/${code}?depth=3`]
      try {
        let loaded: Ward[] = []
        for (const url of wardSources) {
          try {
            const data = await fetchWithTimeout(url)
            loaded = normalizeWards(data)
            if (loaded.length > 0) break
          } catch {
            // try next source
          }
        }
        setWards(loaded)
      } catch (err) {
        console.error(err)
        setWards([])
      } finally {
        setLoadingWards(false)
      }
    }
    fetchWards()
  }, [form.province_code])

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) return toast.error('Vui lòng nhập họ tên')
    if (!form.email.trim()) return toast.error('Vui lòng nhập email')

    setSaving(true)
    try {
      const res = await profileService.updateProfile(form)
      toast.success(res.message || 'Cập nhật thành công')
      onUpdated(res.user)
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message
      toast.error(serverMsg || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (file?: File) => {
    if (!file) return
    setUploadingAvatar(true)
    try {
      const res = await profileService.updateAvatar(file)
      toast.success(res.message || 'Cập nhật avatar thành công')
      onUpdated(res.user)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload avatar thất bại')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-slate-100">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-[#ed2a2a]" />
          </div>
          Thông Tin Cá Nhân
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1 ml-[52px]">
          Cập nhật thông tin tài khoản của bạn
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/60">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-10 h-10 text-slate-300" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-700">Ảnh đại diện</p>
            <p className="text-xs text-slate-400 mt-0.5">Hỗ trợ JPG, PNG, WEBP. Tối đa 4MB.</p>
            <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-[#ed2a2a]/40 cursor-pointer transition-colors">
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploadingAvatar ? 'Đang tải lên...' : 'Thay ảnh'}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  handleAvatarChange(file)
                  e.currentTarget.value = ''
                }}
                disabled={uploadingAvatar}
              />
            </label>
          </div>
        </div>

        {/* Name + Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-slate-400" />
              Họ và Tên <span className="text-[#ed2a2a]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Email <span className="text-[#ed2a2a]">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
              required
            />
          </div>
        </div>

        {/* Phone + Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              Số Điện Thoại
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="0901 234 567"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Địa Chỉ Giao Hàng
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {/* Chọn Tỉnh */}
              <div className="relative group">
                <select
                  value={form.province_code}
                  onChange={e => handleChange('province_code', e.target.value)}
                  disabled={loadingProvinces}
                  className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all disabled:opacity-60"
                >
                  <option value="">Chọn Tỉnh / Thành phố...</option>
                  {provinces.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  {loadingProvinces ? <Loader2 className="w-4 h-4 animate-spin text-[#ed2a2a]" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Chọn Phường */}
              <div className="relative group">
                <select
                  value={form.ward_code}
                  onChange={e => handleChange('ward_code', e.target.value)}
                  disabled={!form.province_code || loadingWards}
                  className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all disabled:opacity-60"
                >
                  <option value="">{form.province_code ? 'Chọn Phường / Xã...' : 'Vui lòng chọn Tỉnh trước'}</option>
                  {wards.map(w => (
                    <option key={w.code} value={w.code}>{w.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  {loadingWards ? <Loader2 className="w-4 h-4 animate-spin text-[#ed2a2a]" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Chi tiết số nhà */}
            <input
              type="text"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="Nhập chi tiết: Số nhà, Tên đường..."
              className="w-full mt-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Lưu Thay Đổi
          </button>
        </div>
      </form>
    </div>
  )
}
