'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Loader2, Image as ImageIcon, Link as LinkIcon,
  ToggleLeft, LayoutTemplate, Smartphone, CheckCircle2, AlertTriangle, Monitor,
} from 'lucide-react'
import { toast } from 'sonner'
import { bannerService } from '@/services/banner.service'
import Image from 'next/image'

const POSITIONS = [
  { value: 'slider', label: 'Trang chủ', icon: LayoutTemplate, desc: 'Banner cho trang /' },
  { value: 'products', label: 'Trang Thực đơn', icon: Monitor, desc: 'Banner cho trang /products' },
  { value: 'combos', label: 'Trang Combo', icon: ToggleLeft, desc: 'Banner cho trang /combos' },
  { value: 'promotions', label: 'Trang Khuyến mãi', icon: Monitor, desc: 'Banner cho trang /promotions' },
  { value: 'blog', label: 'Trang Blog', icon: Monitor, desc: 'Banner cho trang /blog' },
  { value: 'about', label: 'Trang Giới thiệu', icon: Monitor, desc: 'Banner cho trang /about' },
  { value: 'contact', label: 'Trang Liên hệ', icon: Monitor, desc: 'Banner cho trang /contact' },
  { value: 'global', label: 'Tất cả trang (fallback)', icon: LayoutTemplate, desc: 'Dùng khi trang cụ thể chưa có banner' },
  { value: 'home_center', label: 'Vị trí cũ: home_center', icon: Monitor, desc: 'Giữ tương thích dữ liệu cũ' },
  { value: 'sidebar', label: 'Vị trí cũ: sidebar', icon: ToggleLeft, desc: 'Giữ tương thích dữ liệu cũ' },
]

export default function CreateBannerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [positions, setPositions] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState('0')
  const [status, setStatus] = useState<'active'|'inactive'>('active')

  // File State
  const [desktopFile, setDesktopFile] = useState<File | null>(null)
  const [desktopPreview, setDesktopPreview] = useState<string>('')
  const [mobileFile, setMobileFile] = useState<File | null>(null)
  const [mobilePreview, setMobilePreview] = useState<string>('')

  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  // Validation
  const isValidLink = linkUrl === '' || linkUrl.startsWith('/') || linkUrl.startsWith('http')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    if (type === 'desktop') {
      setDesktopFile(file)
      setDesktopPreview(previewUrl)
    } else {
      setMobileFile(file)
      setMobilePreview(previewUrl)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return toast.error('Vui lòng nhập tên banner')
    if (!desktopFile) return toast.error('Ảnh Desktop là bắt buộc')
    if (linkUrl && !isValidLink) return toast.error('Đường dẫn không hợp lệ. Vui lòng nhập link bắt đầu bằng / hoặc http')

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('image', desktopFile)
      if (mobileFile) fd.append('mobile_image', mobileFile)
      if (linkUrl) fd.append('link_url', linkUrl)
      positions.forEach((position) => fd.append('positions[]', position))
      fd.append('sort_order', sortOrder)
      fd.append('status', status)

      await bannerService.create(fd)
      toast.success('Đã tạo Banner thành công 🎉')
      router.push('/admin/banners')
      router.refresh()
    } catch {
      toast.error('Đã có lỗi xảy ra khi tạo banner')
    } finally {
      setLoading(false)
    }
  }

  const togglePosition = (value: string) => {
    setPositions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-28 lg:pb-10">
      
      {/* ── HEADER (Sticky Desktop) ── */}
      <div className="sticky top-[72px] lg:top-4 z-40 flex items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-5 lg:p-6 rounded-[1.5rem] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-[#ed2a2a]" />
              Thêm Banner Mới
            </h1>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="hidden sm:flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Lưu Banner
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LỚP TRÁI (2/3) - Ảnh Upload */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[1.5rem] p-6 lg:p-8 border border-slate-200 shadow-sm space-y-8">
            
            {/* Desktop Image */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-500" />
                  Ảnh máy tính (Desktop) <span className="text-[#ed2a2a]">*</span>
                </label>
                <span className="text-[12px] font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-600">
                  Bắt buộc (16:9)
                </span>
              </div>
              
              <div
                onClick={() => desktopInputRef.current?.click()}
                className={`relative w-full aspect-[21/9] rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors ${
                  desktopPreview
                    ? 'border-transparent bg-slate-900 group'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#ed2a2a]'
                }`}
              >
                {desktopPreview ? (
                  <>
                    <Image src={desktopPreview} alt="Desktop Preview" fill className="object-cover opacity-80 group-hover:opacity-50 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-xl text-white font-bold text-sm">
                        Đổi ảnh khác
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-bold text-slate-700">Kéo thả hoặc Click để chọn ảnh</p>
                      <p className="text-[12px] font-medium text-slate-400 mt-1">Hỗ trợ JPG, PNG, WEBP (Max 5MB)</p>
                    </div>
                  </>
                )}
                <input ref={desktopInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={e => handleFileChange(e, 'desktop')} />
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Mobile Image */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                  Ảnh điện thoại (Mobile)
                </label>
                <span className="text-[12px] font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-600">
                  Tùy chọn (Rất khuyên dùng)
                </span>
              </div>
              <p className="text-[13px] text-slate-500 font-medium">Nếu không có ảnh Mobile, hệ thống sẽ dùng ảnh Desktop và tự cắt đi hai bên (khiến chữ có thể bị mất).</p>
              
              <div
                onClick={() => mobileInputRef.current?.click()}
                className={`relative w-full sm:w-[350px] aspect-[4/5] mx-auto rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors ${
                  mobilePreview
                    ? 'border-transparent bg-slate-900 group'
                    : 'border-slate-300 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-500'
                }`}
              >
                {mobilePreview ? (
                  <>
                    <Image src={mobilePreview} alt="Mobile Preview" fill className="object-cover opacity-80 group-hover:opacity-50 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-xl text-white font-bold text-sm">
                        Đổi ảnh khác
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Smartphone className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-bold text-slate-700">Bộ tỷ lệ chuẩn 4:5 hoặc 1:1</p>
                      <p className="text-[12px] font-medium text-slate-400 mt-1">Dành riêng cho màn hình dọc</p>
                    </div>
                  </>
                )}
                <input ref={mobileInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={e => handleFileChange(e, 'mobile')} />
              </div>
            </div>

          </div>
        </div>

        {/* LỚP PHẢI (1/3) - Thông tin Banner */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm space-y-5">
            
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">
                Tên Banner <span className="text-[#ed2a2a]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Khuyến mãi Hè 2026..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide flex justify-between">
                Đường Dẫn (Link)
              </label>
              <div className="relative">
                <LinkIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${linkUrl && !isValidLink ? 'text-red-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="/khuyen-mai/sale-he"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-[14px] font-semibold text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                    linkUrl && !isValidLink
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 focus:border-[#ed2a2a] focus:ring-[#ed2a2a]/20'
                  }`}
                />
              </div>
              {linkUrl && !isValidLink && (
                <p className="text-[12px] text-red-500 font-medium flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> Link nên bắt đầu bằng / hoặc http://
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Vị Trí Hiển Thị</label>
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    positions.length === 0
                      ? 'border-[#ed2a2a] bg-red-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="position"
                    value=""
                    checked={positions.length === 0}
                    onChange={() => setPositions([])}
                    className="mt-1"
                  />
                  <div>
                    <span className={`block font-bold text-[14px] leading-none mb-1 ${positions.length === 0 ? 'text-[#ed2a2a]' : 'text-slate-700'}`}>
                      Không chọn (hiện tất cả trang)
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">Tự động dùng vị trí global.</span>
                  </div>
                </label>
                {POSITIONS.map(pos => (
                  <label
                    key={pos.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      positions.includes(pos.value)
                        ? 'border-[#ed2a2a] bg-red-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="position"
                      value={pos.value}
                      checked={positions.includes(pos.value)}
                      onChange={() => togglePosition(pos.value)}
                      className="mt-1"
                    />
                    <div>
                      <span className={`block font-bold text-[14px] leading-none mb-1 ${positions.includes(pos.value) ? 'text-[#ed2a2a]' : 'text-slate-700'}`}>
                        {pos.label}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">{pos.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Thứ Tự</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Trạng Thái</label>
                <button
                  type="button"
                  onClick={() => setStatus(s => s === 'active' ? 'inactive' : 'active')}
                  className={`w-full flex items-center gap-2 justify-center px-4 py-3 border-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
                    status === 'active'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-slate-100 text-slate-500'
                  }`}
                >
                  {status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {status === 'active' ? 'Đang bật' : 'Đang tắt'}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── MOBILE ACTIONS (Sticky Bottom) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#ed2a2a] text-white rounded-xl text-[15px] font-black shadow-[0_4px_20px_rgba(237,42,42,0.3)] active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Lưu Banner Mới
        </button>
      </div>

    </form>
  )
}
