'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Edit, Loader2, MousePointerClick, ToggleLeft, Monitor,
  Smartphone, Eye, Power, MousePointer2, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { bannerService } from '@/services/banner.service'
import type { Banner } from '@/types'
import Image from 'next/image'
import Link from 'next/link'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('/api', '')
const getImg = (p: string | null | undefined) => {
  if (!p) return ''
  if (p.startsWith('http')) return p
  if (p.startsWith('/storage/http://') || p.startsWith('/storage/https://')) {
    return p.replace('/storage/', '')
  }
  if (p.startsWith('/storage')) return `${API_URL}${p}`
  return `${API_URL}/storage/${p}`
}

const POSITIONS: Record<string, string> = {
  slider: 'Slider Trang chủ',
  home_center: 'Banner Giữa Trang',
  sidebar: 'Banner Cột dọc',
}

export default function BannerDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  
  const [banner, setBanner] = useState<Banner | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!id) return
    bannerService.getById(Number(id))
      .then(setBanner)
      .catch(() => {
        toast.error('Không tìm thấy Banner')
        router.push('/admin/banners')
      })
      .finally(() => setLoading(false))
  }, [id, router])

  const handleToggle = async () => {
    if (!banner) return
    setToggling(true)
    try {
      const res = await bannerService.toggleStatus(banner.id)
      setBanner({ ...banner, status: res.status })
      toast.success(res.status === 'active' ? 'Đã bật Banner' : 'Đã tắt Banner')
    } catch {
      toast.error('Cập nhật thất bại')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin mb-4" />
        <span className="font-bold text-slate-500 uppercase tracking-widest text-sm animate-pulse">Đang tải chi tiết...</span>
      </div>
    )
  }

  if (!banner) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28 lg:pb-10">

      {/* ── HEADER ── */}
      <div className="sticky top-[72px] lg:top-4 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-5 lg:p-6 rounded-[1.5rem] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
          >
             <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
              <Eye className="w-6 h-6 text-[#ed2a2a]" /> Chi Tiết Banner
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-50 ${
              banner.status === 'active'
                ? 'bg-red-50 text-[#ed2a2a] border-red-200 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
            {banner.status === 'active' ? 'Tắt Banner' : 'Bật Banner'}
          </button>

          <button
            onClick={() => router.push(`/admin/banners/${banner.id}/edit`)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
             <Edit className="w-4 h-4" /> Sửa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CỘT TRÁI (2/3) - PREVIEW ẢNH */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[1.5rem] p-6 lg:p-8 border border-slate-200 shadow-sm space-y-6">
            
            {/* Desktop Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-500" />
                  Hiển thị trên Laptop & PC
                </h3>
                <span className="text-[12px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500">16:9 / 21:9</span>
              </div>
              <div className="w-full relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden mb-2">
                <div className="w-full h-8 bg-slate-200 flex items-center gap-2 px-4 shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
                   <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"></div><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div></div>
                </div>
                {/* Simulated Image Box */}
                <div className="w-full relative bg-slate-100" style={{ aspectRatio: banner.position === 'slider' ? '21/9' : '16/9' }}>
                   <Image src={getImg(banner.image_path)} alt={banner.title} fill className="object-cover" unoptimized />
                </div>
              </div>
            </div>

            {/* Mobile Preview */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                  Hiển thị trên Điện thoại
                </h3>
                <span className="text-[12px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500">4:5 / 1:1</span>
              </div>
              
              <div className="flex justify-center">
                <div className="relative w-[300px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-[2.5rem] overflow-hidden border-[8px] border-slate-800">
                   <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-3xl z-10 w-1/2 mx-auto"></div>
                   {/* Simulated Phone Screen */}
                   <div className="w-full relative bg-slate-100 aspect-[4/5]">
                     {banner.mobile_image_path ? (
                       <Image src={getImg(banner.mobile_image_path)} alt={banner.title} fill className="object-cover" unoptimized />
                     ) : (
                       <Image src={getImg(banner.image_path)} alt={banner.title} fill className="object-cover" unoptimized />
                     )}
                   </div>
                   {!banner.mobile_image_path && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/90 text-white px-4 py-2 font-bold text-[12px] rounded-xl text-center backdrop-blur">
                       Ảnh đang dùng chung với Desktop (Bị cắt xén 2 bên)
                     </div>
                   )}
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* CỘT PHẢI (1/3) - THÔNG SỐ */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[1.5rem] p-6 lg:p-8 border border-slate-200 shadow-sm space-y-6">
            
            <div>
               <h2 className="text-xl font-black text-slate-900 leading-tight mb-2">{banner.title}</h2>
               <div className="flex flex-wrap items-center gap-2">
                 <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase ${banner.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                   {banner.status === 'active' ? 'Đang bật' : 'Đang tắt'}
                 </span>
                 <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100">
                   {POSITIONS[banner.position]}
                 </span>
               </div>
            </div>

            <div className="p-5 rounded-2xl border border-orange-100 bg-orange-50/50 flex flex-col items-center justify-center gap-2 group">
              <MousePointerClick className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />
               <div className="text-center">
                 <span className="text-4xl font-black text-slate-900 leading-none block my-1">
                   {banner.click_count.toLocaleString()}
                 </span>
                 <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                   lượt Click khách hàng
                 </span>
               </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1 relative">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Link trỏ đến</label>
                {banner.link_url ? (
                  <Link href={banner.link_url} target="_blank" className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl font-semibold text-blue-600 hover:bg-blue-50 transition-colors w-full overflow-hidden text-[14px]">
                     <ExternalLink className="w-4 h-4 shrink-0" />
                     <span className="truncate">{banner.link_url}</span>
                  </Link>
                ) : (
                   <div className="p-3 bg-slate-50 rounded-xl font-medium text-slate-400 text-[14px]">
                     Không gắn link (Chỉ hình ảnh)
                   </div>
                )}
              </div>

              <div className="space-y-1">
                 <label className="text-[12px] font-bold text-slate-500 uppercase">Thứ tự hiển thị (Sort Order)</label>
                 <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-800 text-[14px]">
                   {banner.sort_order}
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[12px] font-bold text-slate-500 uppercase">Thời gian tạo</label>
                 <div className="p-3 bg-slate-50 rounded-xl font-semibold text-slate-700 text-[14px]">
                   {new Date(banner.created_at).toLocaleString('vi-VN')}
                 </div>
              </div>

              {(banner.start_date || banner.end_date) && (
                <div className="space-y-1 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[12px] font-bold text-[#ed2a2a] uppercase mb-2 block">Lịch Hẹn Tính Năng</label>
                  {banner.start_date && (
                    <div className="text-[13px] font-medium text-slate-600">
                      Bắt đầu: <span className="font-bold">{new Date(banner.start_date).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                  {banner.end_date && (
                    <div className="text-[13px] font-medium text-slate-600 mt-1">
                      Kết thúc: <span className="font-bold">{new Date(banner.end_date).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
