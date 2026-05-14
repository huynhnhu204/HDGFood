'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [mounted, setMounted] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=1000&auto=format&fit=crop"
  ]

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => setCurrentSlide(prev => (prev + 1) % slides.length), 5000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return <div className="min-h-screen bg-white" />

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      
      {/* Left Side: Dynamic Form Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-white relative z-10 overflow-y-auto">
        <div className="absolute top-0 left-0 w-32 h-32 bg-red-50/50 rounded-br-full -z-10"></div>
        
        <div className="w-full max-w-[420px]">
          {children}
        </div>
        
        {/* Persistent Footer */}
        <div className="mt-12 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">
              © {new Date().getFullYear()} HDG Food — Cuisine Experience
            </p>
        </div>
      </div>

      {/* Right Side: Shared Visual Banner (Carousel) */}
      <div className="hidden lg:flex flex-[1.2] bg-[#ed2a2a] relative overflow-hidden items-center justify-center">
         <AnimatePresence mode='wait'>
            <motion.img 
              key={currentSlide}
              src={slides[currentSlide]}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.8, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover grayscale-[20%]" 
            />
         </AnimatePresence>
         
         {/* Glass Overlay & Gradient */}
         <div className="absolute inset-x-0 inset-y-0 bg-gradient-to-r from-white via-transparent to-black/20"></div>
         
         <div className="relative z-10 text-center p-20 space-y-4">
            <motion.h2 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="text-white text-6xl font-black tracking-tight drop-shadow-2xl"
            >
              Ngon như nhà làm,<br/>Sạch như mẹ nấu.
            </motion.h2>
            <p className="text-white/80 font-bold uppercase tracking-widest text-sm drop-shadow">Hơn 100+ món ăn tươi ngon đang chờ bạn.</p>
         </div>

         {/* Decorative Element */}
         <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-white/20 rounded-bl-3xl"></div>
      </div>

    </div>
  )
}
