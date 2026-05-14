'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, ThumbsUp, CheckCircle, Quote, ArrowRight, StarHalf } from 'lucide-react'
import Link from 'next/link'
import api from '@/services/api'

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

interface Review {
  id: number
  rating: number
  content: string
  is_bought: boolean
  likes: number
  images?: string[]
  user: { name: string; avatar?: string }
  product: { name: string; slug: string }
}

export default function SocialProofSection() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedReviews = async () => {
       try {
          // Lấy các đánh giá nổi bật
          const response = await api.get('/reviews/featured?limit=10')
          const data = response.data?.data || response.data || []
          setReviews(Array.isArray(data) ? data : [])
       } catch (err) {
          console.error("[SocialProof] Fetch error:", err)
       } finally {
          setLoading(false)
       }
    }
    fetchFeaturedReviews()
  }, [])

  if (loading) return <SocialProofSkeleton />
  if (reviews.length === 0) return null
  const topReviews = reviews.slice(0, 3)

  // AggrHDGte Rating Schema for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": "HDG Food",
    "aggrHDGteRating": {
      "@type": "AggrHDGteRating",
      "ratingValue": "4.9",
      "reviewCount": "1280"
    }
  }

  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden">
      {/* SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4">
         
         {/* Header */}
         <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic">
               Cảm nhận từ <span className="text-[#ed2a2a]">Khách hàng</span>
            </h2>
            <div className="h-1.5 w-24 bg-[#ed2a2a] mx-auto rounded-full" />
            <p className="text-slate-400 font-semibold text-sm md:text-base">
               3 chia sẻ mới nhất từ khách hàng sau khi thưởng thức thực đơn HDG Food.
            </p>
         </div>

         {/* Swiper Slider */}
         <div className="relative px-2 rounded-[3rem] bg-slate-50 p-4 md:p-6 ring-1 ring-slate-100 shadow-[0_18px_80px_rgba(2,6,23,0.04)]">
            <Swiper
              modules={[Navigation, Autoplay, Pagination]}
              spaceBetween={16}
              slidesPerView={1}
              pagination={{ clickable: true, el: '.review-pagination' }}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              breakpoints={{ 1024: { slidesPerView: 1 } }}
              className="!pb-16"
            >
               {topReviews.map((review) => (
                  <SwiperSlide key={review.id}>
                     <ReviewCard review={review} />
                  </SwiperSlide>
               ))}
            </Swiper>
            
            {/* Custom Pagination Container */}
            <div className="review-pagination flex justify-center gap-2 mt-8" />
         </div>

         {/* Simplified CTA */}
         <div className="mt-8 text-center">
           <Link href="/products" className="inline-flex rounded-2xl bg-slate-900 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#ed2a2a]">
             Xem thêm phản hồi
           </Link>
         </div>

      </div>
    </section>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const avatar = review.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user.name)}&background=random`
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 h-full flex flex-col shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
       {/* Decorative Quote */}
       <Quote className="absolute -top-4 -right-4 w-24 h-24 text-slate-50 rotate-12 group-hover:text-red-50 transition-colors" />

       {/* Author info */}
       <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-slate-50 group-hover:ring-red-50 transition-all">
             <img src={avatar} alt={review.user.name} className="w-full h-full object-cover" />
          </div>
          <div>
             <h4 className="font-black text-slate-900 tracking-tight">{review.user.name}</h4>
             {review.is_bought && (
                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                   <CheckCircle className="w-3 h-3" />
                   Chứng thực đã mua
                </div>
             )}
          </div>
       </div>

       {/* Rating */}
       <div className="flex items-center gap-1 mb-4">
          {[1,2,3,4,5].map(i => (
             <Star key={i} className={`w-4 h-4 ${i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
          ))}
       </div>

       {/* Content */}
      <p className="line-clamp-4 text-slate-500 font-semibold leading-relaxed italic mb-6 flex-1">
          "{review.content}"
       </p>

       {/* Product Hint */}
       <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Món đã thưởng thức</p>
          <Link href={`/products/${review.product.slug}`} className="text-sm font-black text-slate-900 hover:text-[#ed2a2a] transition-colors inline-flex items-center gap-1">
             {review.product.name}
             <ArrowRight className="w-3 h-3" />
          </Link>
       </div>

       {/* Interaction */}
       <div className="flex items-center justify-between pt-6 border-t border-slate-50">
          <button className="flex items-center gap-2 text-slate-400 hover:text-[#ed2a2a] transition-colors">
             <ThumbsUp className="w-4 h-4" />
             <span className="text-xs font-black uppercase tracking-widest">{review.likes || 0} Hữu ích</span>
          </button>
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
             Theo HDG Food
          </div>
       </div>
    </div>
  )
}

function SocialProofSkeleton() {
   return (
      <div className="py-24 container mx-auto px-4">
         <div className="w-64 h-12 bg-slate-100 rounded-2xl mx-auto mb-16 animate-pulse" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
               <div key={i} className="aspect-[3/4] bg-white border border-slate-50 shadow-sm rounded-[2.5rem] animate-pulse p-8 space-y-6">
                  <div className="flex gap-4"><div className="w-16 h-16 bg-slate-50 rounded-2xl"/><div className="space-y-2"><div className="w-32 h-6 bg-slate-50 rounded"/><div className="w-24 h-3 bg-slate-50 rounded"/></div></div>
                  <div className="w-full h-24 bg-slate-50 rounded-2xl"/>
                  <div className="aspect-video bg-slate-50 rounded-2xl"/>
               </div>
            ))}
         </div>
      </div>
   )
}
