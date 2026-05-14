'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Star, Camera, X, Loader2, ImagePlus, AlertCircle, 
  CheckCircle2, UploadCloud, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { reviewService } from '@/services/review.service'
import api from '@/services/api'

/* ── Types ──────────────────────────────────────────────────────────── */

interface ReviewFormProps {
  productId: number
  onSuccess?: () => void
}

interface UploadingImage {
  id: string
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  url?: string
}

/* ────────────────────────────────────────────────────────────────────── */
/*                          REVIEW FORM COMPONENT                         */
/* ────────────────────────────────────────────────────────────────────── */

export default function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [eligible, setEligible] = useState<{ can_review: boolean; reason?: string } | null>(null)
  const [checking, setChecking] = useState(true)
  
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState<UploadingImage[]>([])
  const [submitting, setSubmitting] = useState(false)

  /* ── Check eligibility ── */
  useEffect(() => {
    const check = async () => {
      try {
        const res = await reviewService.checkEligibility(productId)
        setEligible(res)
      } catch (err) {
        setEligible({ can_review: false, reason: 'error' })
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [productId])

  /* ── Image Upload logic ── */
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: UploadingImage[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'uploading'
    }))

    setUploading(prev => [...prev, ...newUploads])

    for (const item of newUploads) {
      const formData = new FormData()
      formData.append('file', item.file)

      try {
        const res = await api.post('/admin/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) {
              const progress = Math.round((e.loaded / e.total) * 100)
              setUploading(prev => prev.map(u => u.id === item.id ? { ...u, progress } : u))
            }
          }
        })
        
        const url = res.data.url
        setImages(prev => [...prev, url])
        setUploading(prev => prev.map(u => u.id === item.id ? { ...u, status: 'success', url } : u))
        
        // Auto remove success items after delay
        setTimeout(() => {
          setUploading(prev => prev.filter(u => u.id !== item.id))
        }, 2000)

      } catch (err) {
        setUploading(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error' } : u))
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 5
  })

  /* ── Submit logic ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) { toast.error('Vui lòng chọn số sao đánh giá ⭐️'); return }
    
    setSubmitting(true)
    try {
      await reviewService.submit({
        product_id: productId,
        rating,
        content,
        images
      })
      toast.success('Gửi đánh giá thành công! Cảm ơn bạn đã phản hồi. ❤️')
      setEligible({ can_review: false, reason: 'already_reviewed' })
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Render Check ── */
  if (checking) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 text-[#ed2a2a] animate-spin" /></div>
  
  if (!eligible?.can_review) {
    if (eligible?.reason === 'unauthenticated') return null // Do not show anything if not logged in
    
    if (eligible?.reason === 'not_purchased') return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
        <Info className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-[14px] font-bold text-slate-600">Bạn chỉ có thể đánh giá sau khi đã mua sản phẩm này.</p>
        <p className="text-[12px] font-medium text-slate-400 mt-1">Sản phẩm phải thuộc đơn hàng có trạng thái "Đã hoàn thành".</p>
      </div>
    )

    if (eligible?.reason === 'already_reviewed') return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <p className="text-[14px] font-black text-emerald-800 uppercase tracking-tight">Vừa xong!</p>
        <p className="text-xs font-bold text-emerald-600 mt-1">Cảm ơn bạn đã dành thời gian đánh giá sản phẩm của HDG Food!</p>
      </div>
    )

    return null
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-xl shadow-slate-200/50"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
          <Star className="w-6 h-6 text-[#ed2a2a] fill-[#ed2a2a]" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Đánh giá sản phẩm</h3>
          <p className="text-xs font-bold text-slate-400 mt-0.5">Chia sẻ trải nghiệm của bạn với chúng tôi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* ── PART 1: Rating Stars ── */}
        <div className="text-center">
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Mức độ hài lòng của bạn?</p>
           <div className="flex items-center justify-center gap-2">
             {[1, 2, 3, 4, 5].map((s) => (
               <button
                 key={s}
                 type="button"
                 className="p-1 group transition-all"
                 onMouseEnter={() => setHoverRating(s)}
                 onMouseLeave={() => setHoverRating(0)}
                 onClick={() => setRating(s)}
               >
                 <motion.div
                   animate={{ 
                     scale: (hoverRating || rating) >= s ? 1.2 : 1,
                     rotate: (hoverRating || rating) >= s ? [0, 10, -10, 0] : 0
                   }}
                 >
                   <Star 
                     className={`w-10 h-10 transition-colors duration-200 ${
                       (hoverRating || rating) >= s 
                         ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]' 
                         : 'text-slate-200'
                     }`} 
                   />
                 </motion.div>
               </button>
             ))}
           </div>
           {rating > 0 && (
              <p className="text-[13px] font-black text-amber-500 mt-3 animate-in fade-in duration-300">
                {rating === 1 ? 'Rất không hài lòng 😞' : 
                 rating === 2 ? 'Chưa hài lòng ☹️' : 
                 rating === 3 ? 'Bình thường 😐' : 
                 rating === 4 ? 'Hài lòng 🙂' : 'Tuyệt vời 😍'}
              </p>
           )}
        </div>

        {/* ── PART 2: Text Content ── */}
        <div>
           <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
             Viết cảm nhận của bạn
           </label>
           <textarea
             value={content}
             onChange={e => setContent(e.target.value)}
             placeholder="Sản phẩm rất ngon, dịch vụ tốt... (Tối thiểu 10 ký tự)"
             rows={4}
             className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-[#ed2a2a] focus:bg-white transition-all resize-none shadow-inner"
           />
        </div>

        {/* ── PART 3: Image Upload ── */}
        <div>
           <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
             Hình ảnh thực tế (Tối đa 5 ảnh)
           </label>
           
           <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {/* Preview images */}
              <AnimatePresence>
                {images.map((url, idx) => (
                  <motion.div 
                    key={url}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Uploading placeholders */}
              {uploading.map(item => (
                <div key={item.id} className="relative aspect-square rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center p-2">
                  {item.status === 'uploading' ? (
                    <>
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-2" />
                      <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${item.progress}%` }} />
                      </div>
                    </>
                  ) : item.status === 'error' ? (
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  ) : null}
                </div>
              ))}

              {/* Add button (Dropzone) */}
              {images.length < 5 && (
                <div
                  {...getRootProps()}
                  className={`
                    aspect-square rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all
                    ${isDragActive ? 'border-[#ed2a2a] bg-red-50 text-[#ed2a2a]' : 'border-slate-200 bg-slate-50/50 text-slate-400 hover:border-[#ed2a2a] hover:text-[#ed2a2a] hover:bg-red-50'}
                  `}
                >
                  <input {...getInputProps()} />
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Thêm ảnh</span>
                </div>
              )}
           </div>
        </div>

        {/* ── PART 4: Submit Button ── */}
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="w-full py-4.5 bg-[#ed2a2a] text-white rounded-2xl text-[13px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang gửi đánh giá...
            </>
          ) : (
            <>
              Gửi đánh giá ngay
              <CheckCircle2 className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-[11px] font-bold text-slate-400">
          Mọi thông tin rò rỉ hoặc spam sẽ bị hệ thống tự động lọc bỏ.
        </p>

      </form>
    </motion.div>
  )
}
