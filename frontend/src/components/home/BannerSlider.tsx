'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import { ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

// Swiper styles
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

import { bannerService } from '@/services/banner.service'
import { type Banner } from '@/types'
import { Skeleton } from '@/components/common/Skeleton'
import { ChevronLeft } from 'lucide-react'

type BannerPosition = Banner['position']

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace('/api', '')
const getImg = (url: string | null | undefined) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/storage/http://') || url.startsWith('/storage/https://')) {
    return url.replace('/storage/', '')
  }
  if (url.startsWith('/storage')) return `${API_URL}${url}`
  return `${API_URL}/storage/${url}`
}

interface BannerSliderProps {
  position?: BannerPosition
}

export default function BannerSlider({ position = 'slider' }: BannerSliderProps) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [parallaxY, setParallaxY] = useState(0)

  useEffect(() => {
    fetchBanners()
  }, [position])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        const y = Math.min(24, Math.max(0, window.scrollY * 0.06))
        setParallaxY(y)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const SplitText = ({ text }: { text: string }) => (
    <span aria-label={text} className="inline-block">
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.02, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </span>
  )

  const fetchBanners = async () => {
    try {
      const data = await bannerService.getActive(position)
      if ((data || []).length > 0 || position === 'global' || position === 'slider') {
        setBanners(data || [])
      } else {
        // Fallback to global banners when page-specific slot is empty.
        const globalData = await bannerService.getActive('global')
        setBanners(globalData || [])
      }
    } catch (error) {
      console.error("[BannerSlider] Lỗi khi tải banner:", error)
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  const handleBannerClick = (id: number) => {
    bannerService.incrementClick(id)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 mt-20 mb-10">
        <Skeleton className="w-full h-[250px] lg:h-[450px] rounded-[2rem]" />
      </div>
    )
  }

  if (banners.length === 0) {
    return null
  }

  return (
    <section className="relative w-full mt-20 lg:mt-24 mb-10 px-4 group">
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        spaceBetween={20}
        slidesPerView={1}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ 
          clickable: true,
          bulletActiveClass: 'bg-[#ed2a2a] w-6 transition-all rounded-full opacity-100',
          bulletClass: 'inline-block w-2 h-2 bg-slate-300 rounded-full mx-1 cursor-pointer transition-all'
        }}
        navigation={{
          nextEl: '.swiper-next',
          prevEl: '.swiper-prev'
        }}
        loop={banners.length > 1}
        className="rounded-[2.5rem] overflow-hidden shadow-2xl shadow-red-500/5 aspect-[16/7] lg:aspect-[21/9]"
      >
        {banners.map((banner, index) => (
          <SwiperSlide key={banner.id}>
            <div className="relative w-full h-full">
              {/* Picture tag cho Responsive Image */}
              <picture>
                {banner.mobile_image_url && (
                  <source media="(max-width: 640px)" srcSet={getImg(banner.mobile_image_url)} />
                )}
                <img
                  src={getImg(banner.image_url)} 
                  alt={banner.title}
                  className="w-full h-full object-cover select-none will-change-transform"
                  style={{ transform: `translate3d(0, ${parallaxY}px, 0) scale(1.06)` }}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                />
              </picture>

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent flex items-center px-6 lg:px-20">
                <div className="max-w-xl space-y-4 rounded-[2.25rem] bg-black/35 backdrop-blur-sm p-5 lg:p-7 border border-white/15 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                   <motion.div 
                     initial={{ opacity: 0, x: -30 }} 
                     whileInView={{ opacity: 1, x: 0 }}
                     className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full inline-block border border-white/20"
                   >
                     <span className="text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap">🔥 Ưu đãi có hạn</span>
                   </motion.div>
                   
                   <motion.h2 
                     initial={{ opacity: 0, x: -50 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.1 }}
                     className="text-3xl lg:text-6xl font-black text-white leading-[1.08] drop-shadow-lg tracking-tight"
                   >
                     <SplitText text={banner.title} />
                   </motion.h2>

                   {banner.link_url && (
                     <motion.div
                       initial={{ opacity: 0, y: 20 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       transition={{ delay: 0.2 }}
                     >
                       <Link 
                         href={banner.link_url}
                         onClick={() => handleBannerClick(banner.id)}
                         className="inline-flex items-center gap-2 group px-8 py-3.5 bg-[#ed2a2a] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-red-500/20 hover:shadow-red-200 hover:scale-110 active:scale-95 transition-all"
                       >
                         Đặt ngay <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                       </Link>
                     </motion.div>
                   )}
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}

        {/* Custom Navigation Arrows */}
        <button className="swiper-prev absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all hover:bg-white hover:text-black shadow-xl">
           <ChevronLeft className="w-7 h-7" />
        </button>
        <button className="swiper-next absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all hover:bg-white hover:text-black shadow-xl">
           <ChevronRight className="w-7 h-7" />
        </button>
      </Swiper>
    </section>
  )
}
