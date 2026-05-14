'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, BookOpen, Save, Loader2, Link2, Type, CheckCircle, Hash, AlignLeft, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { postTopicService } from '@/services/post-topic.service'
import type { PostTopic } from '@/types'

export default function EditPostTopicPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState<Partial<PostTopic>>({
    name: '',
    slug: '',
    description: '',
    status: 'active',
    meta_title: '',
    meta_description: '',
    image_url: ''
  })

  useEffect(() => {
    if (!id) return
    postTopicService.getById(Number(id))
      .then((data) => {
        setFormData({
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          status: data.status || 'active',
          meta_title: data.meta_title || '',
          meta_description: data.meta_description || '',
          image_url: data.image_url || ''
        })
      })
      .catch((err) => {
        toast.error('Không tìm thấy chủ đề hoặc đã bị xóa')
        router.push('/admin/post-topics')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name?.trim()) {
      return toast.error('Vui lòng nhập tên chủ đề')
    }
    
    setSaving(true)
    try {
      await postTopicService.update(Number(id), formData)
      toast.success('Đã cập nhật chủ đề thành công!')
      router.push('/admin/post-topics')
      router.refresh()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
         </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 lg:pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
         <div className="flex items-center gap-4">
           <button 
             onClick={() => router.back()}
             className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
           >
             <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
             <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-2">
               <BookOpen className="w-6 h-6 text-blue-500" />
               Chỉnh Sửa Chủ Đề
             </h1>
             <p className="text-sm font-medium text-slate-500 mt-0.5">Cập nhật thông tin và SEO cho chuyên mục</p>
           </div>
         </div>
         <button
           onClick={handleSubmit}
           disabled={saving}
           className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
         >
           {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
           Cập Nhật Thay Đổi
         </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
         {/* Thông tin chung */}
         <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Type className="w-4 h-4" />
               </div>
               Thông Tin Cơ Bản
            </h2>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tên Chủ Đề <span className="text-red-500">*</span></label>
                  <div className="relative">
                     <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="VD: Kiến thức dinh dưỡng..."
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all text-slate-800"
                        required
                     />
                  </div>
               </div>
               
               <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Đường Dẫn (URL Slug) <span className="text-slate-400 font-normal ml-1">- Có thể tùy chỉnh nếu cần</span></label>
                  <div className="relative">
                     <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <input
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        placeholder="kien-thuc-dinh-duong"
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all text-slate-800"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mô Tả Chủ Đề</label>
                  <div className="relative">
                     <AlignLeft className="absolute left-3.5 top-4 w-5 h-5 text-slate-400" />
                     <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Viết một đoạn mô tả ngắn về chủ đề này..."
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all min-h-[100px] text-slate-800"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Trạng Thái Hiển Thị</label>
                  <div className="relative">
                     <CheckCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                     <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all appearance-none bg-white text-slate-800"
                     >
                        <option value="active">🟢 Đang hiển thị</option>
                        <option value="inactive">⚫ Tạm ẩn</option>
                     </select>
                  </div>
               </div>
            </div>
         </div>

         {/* SEO Optimization */}
         <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Hash className="w-4 h-4" />
               </div>
               Tối Ưu SEO (Tùy chọn)
            </h2>
            
            <div className="space-y-6">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                  <span className="text-sm text-slate-600">Thẻ Meta hỗ trợ bộ máy tìm kiếm Google phân phối bài viết tốt hơn. Để trống sẽ tự lấy từ thông tin cơ bản.</span>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Meta Title</label>
                  <div className="relative">
                     <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <input
                        name="meta_title"
                        value={formData.meta_title}
                        onChange={handleChange}
                        placeholder="Tiêu đề hiển thị trên kết quả tìm kiếm..."
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-orange-50 focus:border-orange-400 transition-all text-slate-800"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Meta Description</label>
                  <textarea
                     name="meta_description"
                     value={formData.meta_description}
                     onChange={handleChange}
                     placeholder="Đoạn văn tóm tắt hiển thị bên dưới tiêu đề trên Google..."
                     className="w-full p-4 border border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-orange-50 focus:border-orange-400 transition-all min-h-[120px] text-slate-800"
                  />
               </div>
            </div>
         </div>

      </form>
    </div>
  )
}
