'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Settings, Save, Loader2, Building2, Phone, Globe2,
  Share2, Search, Image as ImageIcon, X, Upload,
  Mail, MapPin, Clock, Facebook, Instagram, Youtube,
  BarChart3, Type, FileText, ChevronDown, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { settingService } from '@/services/setting.service'
import Image from 'next/image'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000'

/* ── Tab definitions ── */
const TABS = [
  { id: 'general', label: 'Thông tin chung',  icon: Building2 },
  { id: 'contact', label: 'Liên hệ',         icon: Phone },
  { id: 'social',  label: 'Mạng xã hội',     icon: Share2 },
  { id: 'seo',     label: 'Cấu hình Web',    icon: Globe2 },
] as const

type TabId = typeof TABS[number]['id']

/* ── Field definitions per tab ── */
const FIELDS: Record<TabId, { key: string; label: string; type: 'text' | 'textarea' | 'file'; placeholder: string; icon?: any }[]> = {
  general: [
    { key: 'site_name',         label: 'Tên quán / Thương hiệu',  type: 'text',     placeholder: 'VD: HDG Food',             icon: Building2 },
    { key: 'site_description',  label: 'Mô tả ngắn',              type: 'textarea', placeholder: 'Giới thiệu ngắn gọn...',   icon: FileText },
    { key: 'logo',              label: 'Logo',                     type: 'file',     placeholder: '',                           icon: ImageIcon },
    { key: 'favicon',           label: 'Favicon',                  type: 'file',     placeholder: '',                           icon: ImageIcon },
    { key: 'currency',          label: 'Đơn vị tiền tệ',          type: 'text',     placeholder: 'VND',                        icon: Type },
  ],
  contact: [
    { key: 'phone',             label: 'Số điện thoại',            type: 'text',     placeholder: '0123 456 789',               icon: Phone },
    { key: 'hotline',           label: 'Hotline',                  type: 'text',     placeholder: '1900 xxxx',                  icon: Phone },
    { key: 'email',             label: 'Email liên hệ',           type: 'text',     placeholder: 'contact@HDGfood.vn',         icon: Mail },
    { key: 'address',           label: 'Địa chỉ',                 type: 'textarea', placeholder: '123 Nguyễn Huệ, Q.1, HCM',  icon: MapPin },
    { key: 'working_hours',     label: 'Giờ hoạt động',           type: 'text',     placeholder: '08:00 - 22:00',              icon: Clock },
    { key: 'google_maps_embed', label: 'Google Maps Embed URL',   type: 'textarea', placeholder: 'Paste iframe src URL...',     icon: MapPin },
  ],
  social: [
    { key: 'facebook_url',  label: 'Facebook',   type: 'text', placeholder: 'https://facebook.com/...',  icon: Facebook },
    { key: 'tiktok_url',    label: 'TikTok',     type: 'text', placeholder: 'https://tiktok.com/@...',   icon: Share2 },
    { key: 'instagram_url', label: 'Instagram',  type: 'text', placeholder: 'https://instagram.com/...', icon: Instagram },
    { key: 'youtube_url',   label: 'YouTube',    type: 'text', placeholder: 'https://youtube.com/@...',  icon: Youtube },
    { key: 'zalo_url',      label: 'Zalo',       type: 'text', placeholder: 'https://zalo.me/...',       icon: Share2 },
  ],
  seo: [
    { key: 'meta_title',         label: 'Meta Title mặc định',     type: 'text',     placeholder: 'HDG Food - Nhà hàng...',    icon: Type },
    { key: 'meta_description',   label: 'Meta Description',        type: 'textarea', placeholder: 'Mô tả hiển thị trên Google...', icon: Search },
    { key: 'google_analytics_id',label: 'Google Analytics ID',     type: 'text',     placeholder: 'G-XXXXXXXXXX',               icon: BarChart3 },
    { key: 'facebook_pixel_id',  label: 'Facebook Pixel ID',       type: 'text',     placeholder: '123456789',                  icon: Facebook },
  ],
}

/* ══════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const [activeTab,  setActiveTab]  = useState<TabId>('general')
  const [values,     setValues]     = useState<Record<string, string>>({})
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [dirty,      setDirty]      = useState(false)
  const [previews,   setPreviews]   = useState<Record<string, string>>({})
  const [mobileOpen, setMobileOpen] = useState(false)

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  /* ── Load settings ── */
  useEffect(() => {
    settingService.getAll()
      .then(res => {
        const flat: Record<string, string> = {}
        Object.entries(res.data).forEach(([k, v]) => { flat[k] = v ?? '' })
        setValues(flat)
      })
      .catch(() => toast.error('Không tải được cài đặt'))
      .finally(() => setLoading(false))
  }, [])

  /* ── Handlers ── */
  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleFileChange = async (key: string, file: File) => {
    // Preview immediately
    setPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }))
    setDirty(true)

    try {
      const path = await settingService.upload(key, file)
      setValues(prev => ({ ...prev, [key]: path }))
      toast.success('Đã tải ảnh lên thành công')
    } catch {
      toast.error('Upload ảnh thất bại')
      setPreviews(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Build settings array with group info
      const settings: { key: string; value: string; group: string }[] = []
      for (const [tabId, fields] of Object.entries(FIELDS)) {
        for (const field of fields) {
          if (field.type !== 'file') { // files are saved via upload endpoint
            settings.push({ key: field.key, value: values[field.key] ?? '', group: tabId })
          }
        }
      }
      await settingService.update(settings)
      toast.success('Đã lưu cài đặt thành công!')
      setDirty(false)
    } catch {
      toast.error('Lưu cài đặt thất bại')
    } finally {
      setSaving(false)
    }
  }

  const getImageUrl = (key: string) => {
    if (previews[key]) return previews[key]
    const val = values[key]
    if (!val) return null
    return val.startsWith('http') ? val : `${API_URL}/storage/${val}`
  }

  /* ── Active tab info ── */
  const activeTabInfo = TABS.find(t => t.id === activeTab)!

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin" />
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Đang tải cài đặt...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28 lg:pb-10">

      {/* ── Header ── */}
      <div className="sticky top-[72px] lg:top-4 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-5 lg:p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#ed2a2a] to-[#ff6b6b] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800">
              Cài Đặt Hệ Thống
            </h1>
            <span className="text-sm font-medium text-slate-500 mt-0.5 block">
              Quản lý thông tin chung, liên hệ &amp; cấu hình website
            </span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${
            dirty
              ? 'bg-[#ed2a2a] text-white shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02]'
              : 'bg-slate-100 text-slate-400 border border-slate-200'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Đang lưu...' : dirty ? 'Lưu Thay Đổi' : 'Đã lưu'}
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">

        {/* ── Desktop Sidebar Tabs ── */}
        <div className="hidden lg:block space-y-2">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-bold transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#ed2a2a] border-2 border-red-200 shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#ed2a2a]' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── Mobile Tab Dropdown ── */}
        <div className="lg:hidden relative">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <activeTabInfo.icon className="w-5 h-5 text-[#ed2a2a]" />
              <span className="font-bold text-slate-800">{activeTabInfo.label}</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden">
              {TABS.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileOpen(false) }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-[14px] font-bold transition-colors ${
                      activeTab === tab.id
                        ? 'bg-red-50 text-[#ed2a2a]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Content Area ── */}
        <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-6 lg:p-8">
          <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-50 text-[#ed2a2a] flex items-center justify-center shrink-0">
              <activeTabInfo.icon className="w-4 h-4" />
            </span>
            {activeTabInfo.label}
          </h2>

          <div className="space-y-6">
            {FIELDS[activeTab].map(field => {
              const FieldIcon = field.icon

              // ── FILE type (Logo, Favicon) ──
              if (field.type === 'file') {
                const imgUrl = getImageUrl(field.key)
                return (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      {FieldIcon && <FieldIcon className="w-4 h-4 text-slate-400" />}
                      {field.label}
                    </label>
                    <input
                      ref={el => { fileRefs.current[field.key] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) handleFileChange(field.key, f)
                      }}
                    />
                    <div className="flex items-center gap-4">
                      {imgUrl ? (
                        <div className="relative">
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50">
                            <Image src={imgUrl} alt={field.label} fill className="object-contain" />
                          </div>
                          <button
                            onClick={() => {
                              setValues(prev => ({ ...prev, [field.key]: '' }))
                              setPreviews(prev => { const n = { ...prev }; delete n[field.key]; return n })
                              if (fileRefs.current[field.key]) fileRefs.current[field.key]!.value = ''
                              setDirty(true)
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileRefs.current[field.key]?.click()}
                          className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-[#ed2a2a] hover:bg-red-50/30 transition-all group cursor-pointer"
                        >
                          <Upload className="w-6 h-6 text-slate-300 group-hover:text-[#ed2a2a] transition-colors" />
                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#ed2a2a]">Upload</span>
                        </button>
                      )}
                      <button
                        onClick={() => fileRefs.current[field.key]?.click()}
                        className="px-4 py-2.5 text-[13px] font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        {imgUrl ? 'Đổi ảnh' : 'Tải lên'}
                      </button>
                    </div>
                  </div>
                )
              }

              // ── TEXTAREA type ──
              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      {FieldIcon && <FieldIcon className="w-4 h-4 text-slate-400" />}
                      {field.label}
                    </label>
                    <textarea
                      value={values[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full p-4 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all resize-none"
                    />
                  </div>
                )
              }

              // ── TEXT type (default) ──
              return (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    {FieldIcon && <FieldIcon className="w-4 h-4 text-slate-400" />}
                    {field.label}
                  </label>
                  <div className="relative">
                    {FieldIcon && (
                      <FieldIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    )}
                    <input
                      type="text"
                      value={values[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className={`w-full ${FieldIcon ? 'pl-10' : 'pl-4'} pr-4 py-3 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all`}
                    />
                  </div>
                </div>
              )
            })}

            {/* ── Google Maps Preview (Contact tab) ── */}
            {activeTab === 'contact' && values['google_maps_embed'] && (
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> Xem trước bản đồ
                </label>
                <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200">
                  <iframe
                    src={values['google_maps_embed']}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Google Maps"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky Save ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${
            dirty
              ? 'bg-[#ed2a2a] text-white shadow-[0_4px_20px_rgba(237,42,42,0.3)]'
              : 'bg-slate-100 text-slate-400 border border-slate-200'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : dirty ? <Save className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {saving ? 'Đang lưu...' : dirty ? 'Lưu Tất Cả Thay Đổi' : 'Đã lưu tất cả'}
        </button>
      </div>
    </div>
  )
}
