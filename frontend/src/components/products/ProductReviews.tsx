'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Star, ThumbsUp, Camera, ChevronRight, 
  Filter, ArrowUpDown, ImageIcon, MoreHorizontal,
  User, CheckCircle, Clock, Send, X as XIcon, Upload
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { reviewService, type ReviewFilter } from '@/services/review.service'
import { Skeleton } from '@/components/common/Skeleton'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuthStore } from '@/store/authStore'

/* ── Types ──────────────────────────────────────────────────────────── */

interface ProductReviewProps {
  productId: number
  refreshKey?: number
}

interface SummaryData {
  average: number
  total_count: number
  has_photo_count: number
  distribution: { rating: number; count: number; percentage: number }[]
}

/* ────────────────────────────────────────────────────────────────────── */
/*                        PRODUCT REVIEWS SECTION                       */
/* ────────────────────────────────────────────────────────────────────── */

export default function ProductReviews({ productId, refreshKey }: ProductReviewProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Filters & State
  const [filter, setFilter] = useState<ReviewFilter>({ sort: 'latest', page: 1 })
  const [meta, setMeta] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'all' | number | 'photo'>('all')

  // Zoom Image state
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  // Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewImages, setReviewImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [canReview, setCanReview] = useState<boolean | null>(null)
  const [eligibilityReason, setEligibilityReason] = useState<string>('')
  
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Load summary ── */
  useEffect(() => {
    reviewService.getSummary(productId).then(setSummary)
  }, [productId, refreshKey])

  /* ── Check eligibility ── */
  useEffect(() => {
    if (user) {
      reviewService.checkEligibility(productId).then(res => {
        setCanReview(res.can_review)
        setEligibilityReason(res.reason || '')
      }).catch(() => {
        setCanReview(false)
      })
    }
  }, [productId, user])

  /* ── Load reviews ── */
  const loadReviews = async (p: ReviewFilter, isNew = true) => {
    if (isNew) setLoading(true)
    else setLoadingMore(true)

    try {
      const res = await reviewService.getByProduct(productId, p)
      if (isNew) {
        setReviews(res.data)
      } else {
        setReviews(prev => [...prev, ...res.data])
      }
      setMeta(res)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadReviews(filter, filter.page === 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, filter, refreshKey])

  /* ── Handlers ── */
  const changeTab = (tab: 'all' | number | 'photo') => {
    setActiveTab(tab)
    setFilter({
      sort: filter.sort,
      page: 1,
      rating: typeof tab === 'number' ? tab : undefined,
      has_photo: tab === 'photo' ? true : undefined
    })
  }

  const handleLike = async (id: number) => {
    try {
      await reviewService.like(id)
      setReviews(prev => prev.map(r => r.id === id ? { ...r, likes: (r.likes || 0) + 1, liked: true } : r))
    } catch {}
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReviewImages(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmitReview = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để đánh giá')
      return
    }

    if (!canReview) {
      const messages: Record<string, string> = {
        'already_reviewed': 'Bạn đã đánh giá sản phẩm này rồi',
        'not_purchased': 'Bạn cần mua sản phẩm này trước khi đánh giá',
        'unauthenticated': 'Vui lòng đăng nhập'
      }
      alert(messages[eligibilityReason] || 'Không thể đánh giá sản phẩm này')
      return
    }

    setSubmitting(true)
    try {
      await reviewService.create({
        product_id: productId,
        rating: reviewRating,
        content: reviewContent.trim() || undefined,
        images: reviewImages.length > 0 ? reviewImages : undefined
      })

      // Reset form
      setReviewRating(5)
      setReviewContent('')
      setReviewImages([])
      setShowReviewForm(false)
      setCanReview(false)

      // Reload reviews
      loadReviews({ ...filter, page: 1 }, true)
      reviewService.getSummary(productId).then(setSummary)

      alert('Đánh giá của bạn đã được gửi! Vui lòng chờ quản trị viên phê duyệt.')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá')
    } finally {
      setSubmitting(false)
    }
  }

  if (!summary && loading) return <ReviewSkeleton />

  return (
    <div className="space-y-10">
      
      {/* ── WRITE REVIEW BUTTON ── */}
      {user && canReview && !showReviewForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-6 border-2 border-indigo-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Bạn đã dùng món này?</h3>
              <p className="text-sm text-slate-600">Chia sẻ trải nghiệm của bạn để giúp người khác!</p>
            </div>
            <button
              onClick={() => setShowReviewForm(true)}
              className="px-6 py-3 bg-[#ed2a2a] text-white rounded-xl font-black text-sm hover:bg-slate-900 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Viết đánh giá
            </button>
          </div>
        </motion.div>
      )}

      {/* ── REVIEW FORM ── */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-3xl p-8 border-2 border-indigo-200 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900">Viết đánh giá của bạn</h3>
              <button
                onClick={() => setShowReviewForm(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <XIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Rating Stars */}
            <div className="mb-6">
              <label className="text-sm font-bold text-slate-700 mb-3 block">
                Đánh giá của bạn
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= reviewRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-lg font-black text-slate-900">
                  {reviewRating}/5
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <label className="text-sm font-bold text-slate-700 mb-3 block">
                Chia sẻ trải nghiệm của bạn (không bắt buộc)
              </label>
              <textarea
                value={reviewContent}
                onChange={e => setReviewContent(e.target.value)}
                placeholder="Món ăn có ngon không? Phục vụ thế nào? Bạn có giới thiệu cho bạn bè không?"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none min-h-[120px]"
                maxLength={1000}
              />
              <p className="text-xs text-slate-400 mt-2">
                {reviewContent.length}/1000 ký tự
              </p>
            </div>

            {/* Images */}
            <div className="mb-6">
              <label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                Thêm hình ảnh (tùy chọn)
              </label>
              
              <div className="flex flex-wrap gap-3">
                {reviewImages.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-200 group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {reviewImages.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                  >
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs text-slate-400 font-bold">Thêm ảnh</span>
                  </button>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <p className="text-xs text-slate-400 mt-2">
                Tối đa 5 ảnh. Đánh giá có ảnh sẽ được ưu tiên hiển thị!
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewForm(false)}
                className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="flex-1 py-3 bg-[#ed2a2a] text-white rounded-xl font-black hover:bg-slate-900 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Gửi đánh giá
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PART 1: Summary Header ── */}
      <div className="bg-white rounded-3xl p-6 lg:p-10 border border-slate-100 shadow-xl shadow-slate-200/40">
         <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Big Score */}
            <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-8 md:pb-0">
               <h3 className="text-[64px] font-black text-slate-900 leading-none">{summary?.average}</h3>
               <div className="flex items-center gap-1.5 my-4">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-5 h-5 ${s <= Math.round(summary?.average || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
               </div>
               <p className="text-sm font-bold text-slate-400">Dựa trên {summary?.total_count} đánh giá</p>
               <div className="mt-6 px-5 py-2 bg-emerald-50 rounded-full flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">100% người dùng hài lòng</span>
               </div>
            </div>

            {/* Progress Bars */}
            <div className="md:col-span-8 flex flex-col justify-center gap-3">
               {summary?.distribution.map((d) => (
                  <div key={d.rating} className="flex items-center gap-4 group">
                     <div className="flex items-center gap-1 w-10">
                        <span className="text-xs font-black text-slate-600">{d.rating}</span>
                        <Star className="w-3 h-3 text-slate-300" />
                     </div>
                     <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${d.percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className={`h-full rounded-full ${
                             d.rating >= 4 ? 'bg-amber-400' : d.rating === 3 ? 'bg-amber-300' : 'bg-slate-300'
                          }`}
                        />
                     </div>
                     <div className="w-12 text-right">
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors">{d.percentage}%</span>
                     </div>
                  </div>
               ))}
            </div>

         </div>
      </div>

      {/* ── PART 2: Filters & Sort ── */}
      <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 sticky top-20 z-10 shadow-sm">
         <div className="flex flex-wrap items-center gap-2">
            <FilterBtn active={activeTab === 'all'} onClick={() => changeTab('all')}>Tất cả</FilterBtn>
            <FilterBtn active={activeTab === 5} onClick={() => changeTab(5)}>5 Sao</FilterBtn>
            <FilterBtn active={activeTab === 4} onClick={() => changeTab(4)}>4 Sao</FilterBtn>
            <FilterBtn active={activeTab === 'photo'} onClick={() => changeTab('photo')} icon={<Camera className="w-3.5 h-3.5"/>}>
               Có hình ảnh ({summary?.has_photo_count})
            </FilterBtn>
         </div>

         <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm min-w-[200px]">
            <ArrowUpDown className="w-4 h-4 text-[#ed2a2a]" />
            <select 
              value={filter.sort}
              onChange={e => setFilter({ ...filter, sort: e.target.value as any, page: 1 })}
              className="bg-transparent border-none focus:outline-none text-xs font-black uppercase tracking-widest text-slate-700 w-full"
            >
               <option value="latest">Mới nhất</option>
               <option value="useful">Hữu ích nhất</option>
            </select>
         </div>
      </div>

      {/* ── PART 3: Review List ── */}
      <div className="space-y-6">
         {loading ? (
            <div className="space-y-6">
               {[1,2,3].map(i => <ReviewItemSkeleton key={i} />)}
            </div>
         ) : reviews.length > 0 ? (
           <>
            <AnimatePresence mode="popLayout">
               {reviews.map((r, idx) => (
                  <motion.div 
                    layout
                    key={r.id} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative"
                  >
                     {/* User Info */}
                     <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden">
                              {r.user.avatar ? <img src={r.user.avatar} alt="" className="w-full h-full object-cover"/> : <User className="w-6 h-6 text-indigo-400" />}
                           </div>
                           <div>
                              <h4 className="text-[15px] font-black text-slate-800 tracking-tight flex items-center gap-2">
                                 {r.user.name}
                                 {r.is_bought && <span title="Đã mua hàng"><CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-50" /></span>}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                 <div className="flex items-center gap-0.5">
                                    {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}
                                 </div>
                                 <span className="w-1 h-1 rounded-full bg-slate-300" />
                                 <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: vi })}
                                 </p>
                              </div>
                           </div>
                        </div>
                        <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors"><MoreHorizontal className="w-5 h-5"/></button>
                     </div>

                     {/* Content */}
                     <div className="pl-0 md:pl-16">
                        <p className="text-[14px] font-medium text-slate-600 leading-relaxed mb-5 whitespace-pre-wrap">{r.content || '(Chỉ đánh giá số sao)'}</p>

                        {/* Images */}
                        {r.images?.length > 0 && (
                           <div className="flex flex-wrap gap-2.5 mb-6">
                              {r.images.map((url: string, i: number) => (
                                 <div 
                                   key={i} 
                                   onClick={() => setZoomUrl(url)}
                                   className="relative w-24 sm:w-32 aspect-square rounded-2xl overflow-hidden cursor-zoom-in border border-slate-100 hover:border-indigo-400 transition-all group"
                                 >
                                    <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </div>
                              ))}
                           </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-6 border-t border-slate-50 pt-5 mt-2">
                           <motion.button 
                             onClick={() => handleLike(r.id)}
                             whileTap={{ scale: 0.9 }}
                             disabled={r.liked}
                             className={`flex items-center gap-2 text-[12px] font-black uppercase tracking-widest transition-colors ${
                               r.liked 
                                 ? 'text-indigo-600 cursor-not-allowed' 
                                 : 'text-slate-400 hover:text-indigo-600'
                             }`}
                           >
                              <motion.div
                                animate={r.liked ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.3 }}
                              >
                                <ThumbsUp className={`w-4 h-4 ${r.likes > 0 || r.liked ? 'fill-indigo-100 text-indigo-600' : ''}`} />
                              </motion.div>
                              {r.liked ? 'Đã hữu ích' : 'Hữu ích'} {r.likes > 0 && `(${r.likes})`}
                           </motion.button>
                           <button className="text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors">Báo cáo</button>
                        </div>
                     </div>
                  </motion.div>
               ))}
            </AnimatePresence>

            {/* Pagination / Load more */}
            {meta?.next_page_url && (
               <div className="text-center pt-10">
                  <button 
                    onClick={() => setFilter({ ...filter, page: (filter.page || 1) + 1 })}
                    disabled={loadingMore}
                    className="px-10 py-4 bg-white border border-slate-200 rounded-2xl text-[13px] font-black uppercase tracking-widest hover:border-[#ed2a2a] hover:text-[#ed2a2a] transition-all shadow-sm active:scale-95 flex items-center gap-3 mx-auto"
                  >
                     {loadingMore && <LoaderCircle className="w-4 h-4 animate-spin" />}
                     Xem thêm đánh giá
                  </button>
               </div>
            )}
           </>
         ) : (
            <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-3xl">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ImageIcon className="w-10 h-10 text-slate-200" />
               </div>
               <h5 className="text-[15px] font-black text-slate-500 uppercase tracking-tight">Chưa có đánh giá nào cho bộ lọc này</h5>
               <p className="text-sm font-medium text-slate-300 mt-1.5">Hãy là người đầu tiên chia sẻ cảm nhận về món ăn này!</p>
            </div>
         )}
      </div>

      {/* ── Zoom Modal ── */}
      <AnimatePresence>
         {zoomUrl && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setZoomUrl(null)}>
               <motion.button 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 className="absolute top-6 right-6 p-3 bg-white/20 text-white rounded-2xl hover:bg-white/30 transition-all"
               >
                  <X className="w-6 h-6" />
               </motion.button>
               <motion.img 
                 initial={{ scale: 0.8, opacity: 0 }} 
                 animate={{ scale: 1, opacity: 1 }} 
                 exit={{ scale: 0.8, opacity: 0 }}
                 src={zoomUrl} 
                 className="max-w-full max-h-[90vh] rounded-3xl shadow-2xl" 
                 onClick={e => e.stopPropagation()}
               />
            </div>
         )}
      </AnimatePresence>

    </div>
  )
}

function FilterBtn({ children, active, onClick, icon }: any) {
   return (
      <button 
        onClick={onClick}
        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
           active 
           ? 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/20' 
           : 'bg-white text-slate-500 border border-slate-200 hover:border-[#ed2a2a] hover:text-[#ed2a2a]'
        }`}
      >
         {icon}
         {children}
      </button>
   )
}

function X({ ...props }) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> }
function LoaderCircle({ ...props }) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> }

function ReviewSkeleton() {
   return (
      <div className="space-y-10 animate-pulse">
         <div className="h-64 bg-slate-100 rounded-3xl" />
         <div className="flex gap-2"><Skeleton className="h-10 w-24"/><Skeleton className="h-10 w-24"/><Skeleton className="h-10 w-40"/></div>
         <div className="space-y-6">{[1,2].map(i => <ReviewItemSkeleton key={i} />)}</div>
      </div>
   )
}

function ReviewItemSkeleton() {
   return (
      <div className="bg-white p-8 rounded-3xl border border-slate-100 space-y-4">
         <div className="flex gap-4"><Skeleton className="w-12 h-12 rounded-2xl"/><div className="space-y-2"><Skeleton className="h-4 w-32"/><Skeleton className="h-3 w-48"/></div></div>
         <Skeleton className="h-4 w-full"/><Skeleton className="h-4 w-3/4"/><div className="flex gap-2"><Skeleton className="w-24 h-24 rounded-2xl"/><Skeleton className="w-24 h-24 rounded-2xl"/></div>
      </div>
   )
}
