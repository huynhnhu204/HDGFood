'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, LayoutGrid, Info, Users, MapPin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { tableService } from '@/services/table.service'

export default function EditTablePage() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    capacity: 2,
    area: ''
  })

  useEffect(() => {
    fetchTableDetail()
  }, [id])

  const fetchTableDetail = async () => {
    try {
      const data = await tableService.getById(Number(id))
      setFormData({
        name: data.name,
        capacity: data.capacity,
        area: data.area || ''
      })
    } catch {
      toast.error('Không thể tìm thấy thông tin bàn')
      router.push('/admin/tables')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return toast.error('Vui lòng nhập tên bàn')
    
    setLoading(true)
    try {
      await tableService.update(Number(id), formData)
      toast.success('Cập nhật bàn thành công')
      router.push(`/admin/tables/${id}`)
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ed2a2a] mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border border-slate-200 p-5 lg:p-6 rounded-[2rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-3">
              <LayoutGrid className="w-7 h-7 text-[#ed2a2a]" />
              Chỉnh Sửa — {formData.name}
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cập nhật cấu hình bàn nhà hàng</p>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#ed2a2a] text-white rounded-2xl text-[14px] font-black shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Lưu Thay Đổi
        </button>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 border border-slate-200 shadow-sm space-y-10">
        
        {/* Basic Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#ed2a2a] flex items-center justify-center">
               <Info className="w-4 h-4" />
            </div>
            <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-[0.2em]">Thông tin cơ bản</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Bàn</label>
              <div className="relative group">
                <LayoutGrid className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#ed2a2a] transition-colors" />
                <input 
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên bàn..."
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 outline-none focus:ring-4 focus:ring-red-100 focus:border-[#ed2a2a] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Khu vực / Vị trí</label>
              <div className="relative group">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#ed2a2a] transition-colors" />
                <select 
                  value={formData.area}
                  onChange={e => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 outline-none appearance-none focus:ring-4 focus:ring-red-100 focus:border-[#ed2a2a] transition-all"
                >
                  <option value="Phòng lạnh">Phòng lạnh ❄️</option>
                  <option value="Sân vườn">Sân vườn 🌿</option>
                  <option value="Tầng lầu">Tầng lầu 🏢</option>
                  <option value="Khu VIP">Khu vực VIP ⭐</option>
                  <option value="Quầy bar">Quầy Bar 🍸</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#ed2a2a] flex items-center justify-center">
               <Users className="w-4 h-4" />
            </div>
            <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-[0.2em]">Sức chứa dự kiến</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
             {[2, 4, 6, 8, 10, 12].map(cap => (
                <button
                   key={cap}
                   type="button"
                   onClick={() => setFormData(prev => ({ ...prev, capacity: cap }))}
                   className={`px-4 py-5 rounded-3xl border-2 text-[15px] font-black transition-all active:scale-95 flex flex-col items-center gap-2 ${
                     formData.capacity === cap ? 'bg-[#ed2a2a] border-[#ed2a2a] text-white shadow-lg shadow-red-500/20' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-white'
                   }`}
                >
                   <Users className="w-5 h-5" />
                   {cap} Người
                </button>
             ))}
          </div>
        </div>
      </div>
    </div>
  )
}
