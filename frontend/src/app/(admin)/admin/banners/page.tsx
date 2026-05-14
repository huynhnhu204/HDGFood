'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Image as ImageIcon, Plus, Loader2, Search, Edit, Trash2,
  CheckCircle, XCircle, MousePointerClick, Calendar, SwitchCamera,
  MoreVertical, Power, ListFilter,
} from 'lucide-react'
import { toast } from 'sonner'
import { bannerService } from '@/services/banner.service'
import type { Banner } from '@/types'
import Image from 'next/image'

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
  slider: 'Trang chủ',
  products: 'Trang Thực đơn',
  combos: 'Trang Combo',
  promotions: 'Trang Khuyến mãi',
  blog: 'Trang Blog',
  about: 'Trang Giới thiệu',
  contact: 'Trang Liên hệ',
  global: 'Tất cả trang (fallback)',
  home_center: 'Vị trí cũ: home_center',
  sidebar: 'Vị trí cũ: sidebar',
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
} as any

/* ══════════════════════════════════════════════════════════════ */
export default function BannersPage() {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [status, setStatus] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await bannerService.getAll({
        search, position, status, per_page: 50
      })
      setBanners(res.data)
    } catch {
      toast.error('Lỗi khi tải danh sách Banner')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [position, status])

  const handleSearchClick = () => { loadData() }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa Banner này?')) return
    try {
      await bannerService.delete(id)
      setBanners(prev => prev.filter(b => b.id !== id))
      toast.success('Đã xóa Banner thành công')
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  const handleToggle = async (banner: Banner) => {
    try {
      const res = await bannerService.toggleStatus(banner.id)
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, status: res.status } : b))
      toast.success(res.status === 'active' ? 'Đã BẬT banner' : 'Đã TẮT banner')
    } catch {
      toast.error('Cập nhật trạng thái thất bại')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 lg:pb-10">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-[1.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-[#ed2a2a] to-[#ff6b6b] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">
              Quản Lý Banner
            </h1>
            <span className="text-sm font-medium text-slate-500 mt-1 block">
              Tùy chỉnh Slider &amp; Banner quảng cáo website
            </span>
          </div>
        </div>

        <Link
          href="/admin/banners/create"
          className="relative z-10 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#ed2a2a] text-white rounded-xl text-[14px] font-bold shadow-[0_4px_20px_rgba(237,42,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" /> Tải Banner Trực Tiếp
        </Link>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center gap-3">
        <div className="relative w-full lg:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên banner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a] transition-all"
          />
        </div>
        
        <div className="flex w-full lg:w-auto gap-3">
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="flex-1 lg:w-48 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a]"
          >
            <option value="">Tất cả vị trí</option>
            <option value="slider">Trang chủ</option>
            <option value="products">Trang Thực đơn</option>
            <option value="combos">Trang Combo</option>
            <option value="promotions">Trang Khuyến mãi</option>
            <option value="blog">Trang Blog</option>
            <option value="about">Trang Giới thiệu</option>
            <option value="contact">Trang Liên hệ</option>
            <option value="global">Tất cả trang (fallback)</option>
            <option value="home_center">Vị trí cũ: home_center</option>
            <option value="sidebar">Vị trí cũ: sidebar</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex-1 lg:w-40 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#ed2a2a]/20 focus:border-[#ed2a2a]"
          >
            <option value="">Trạng thái</option>
            <option value="active">Đang hiển thị</option>
            <option value="inactive">Đang tắt</option>
          </select>

          <button
            onClick={handleSearchClick}
            className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 active:scale-95 transition-all hidden sm:block"
          >
            Lọc
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin mb-4" />
          <span className="font-bold text-slate-500 uppercase tracking-widest text-[13px] animate-pulse">Đang tải dữ liệu...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed text-center px-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-10 h-10 text-slate-300" />
          </div>
          <span className="text-slate-500 font-semibold mb-2">Không có banner nào được tìm thấy.</span>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Hãy điều chỉnh lại bộ lọc hoặc tạo mới banner đầu tiên của bạn để website thêm sinh động.
          </p>
          <button
            onClick={() => { setSearch(''); setPosition(''); setStatus(''); loadData(); }}
            className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            Xoá bộ lọc
          </button>
        </div>
      ) : (
        <>
          {/* ── DESKTOP TABLE ── */}
          <div className="hidden lg:block bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider w-[120px]">Hình ảnh</th>
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider">Thông tin Banner</th>
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider text-center">Tương tác</th>
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                  <th className="py-4 px-6 text-[12px] font-bold text-slate-500 uppercase tracking-wider text-right w-[140px]">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banners.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group-hover:border-[#ed2a2a]/30 transition-colors">
                        <Image src={getImg(item.image_url || item.image_path)} alt={item.title} fill className="object-cover" unoptimized />
                        {item.mobile_image_path && (
                          <div title="Có ảnh Mobile tĩnh" className="absolute top-1 right-1 w-5 h-5 bg-black/60 backdrop-blur rounded-md flex items-center justify-center">
                            <SwitchCamera className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Link href={`/admin/banners/${item.id}`} className="font-bold text-[15px] text-slate-800 hover:text-[#ed2a2a] transition-colors line-clamp-1 mb-1">
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[11px] font-bold whitespace-nowrap border border-blue-100">
                          {POSITIONS[item.position]}
                        </span>
                        {item.start_date && (
                          <span className="text-[12px] text-slate-400 font-medium whitespace-nowrap">
                            Từ: {new Date(item.start_date).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-black text-slate-700">{item.click_count.toLocaleString()}</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Clicks</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggle(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all active:scale-95 ${
                          item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${item.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {item.status === 'active' ? 'Đang bật' : 'Đã tắt'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/banners/${item.id}/edit`}
                          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors bg-white shadow-sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors bg-white shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE GRID CARDS (Framer Motion) ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden"
          >
            {banners.map((item) => (
              <motion.div
                variants={itemVariants}
                key={item.id}
                className="bg-white rounded-[1.25rem] border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col group relative"
              >
                {/* Image Area with Overlay */}
                <div className="relative w-full aspect-video bg-slate-100">
                  <Image src={getImg(item.image_url || item.image_path)} alt={item.title} fill className="object-cover" unoptimized />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 rounded-lg backdrop-blur bg-white/10 border border-white/20 text-white text-[11px] font-bold shadow-sm flex items-center gap-1">
                      {item.status === 'active' ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-300" />}
                      {POSITIONS[item.position]}
                    </span>
                  </div>

                  {/* Context Overlay Menu */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur transition-all active:scale-90 shadow-lg ${
                        item.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Title */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-white font-bold text-[16px] leading-tight line-clamp-2 drop-shadow-md">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="p-4 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 opacity-80">
                      <MousePointerClick className="w-4 h-4 text-[#ed2a2a]" />
                      <span className="font-bold text-slate-700 text-[13px]">{item.click_count} <span className="text-slate-400 font-medium">clicks</span></span>
                    </div>
                    {item.mobile_image_path && (
                      <div className="flex items-center gap-1.5 opacity-80" title="Ảnh Mobile riêng biệt">
                        <SwitchCamera className="w-4 h-4 text-blue-500" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Mobile</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => router.push(`/admin/banners/${item.id}/edit`)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg active:scale-95">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg active:scale-95">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
