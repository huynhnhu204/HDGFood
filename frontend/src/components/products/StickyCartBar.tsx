'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus } from 'lucide-react'

interface StickyCartBarProps {
  productImage: string
  productName: string
  totalPrice: number
  onAddToCart: () => void
  onBuyNow: () => void
  isKitchenClosed?: boolean
}

export default function StickyCartBar({ 
  productImage, 
  productName, 
  totalPrice, 
  onAddToCart,
  onBuyNow,
  isKitchenClosed = false
}: StickyCartBarProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled past 600px
      setIsVisible(window.scrollY > 600)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Mobile Version - Bottom */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
          >
            <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center gap-4">
                  {/* Product Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                        {productName}
                      </p>
                      <p className="text-lg font-black text-[#ed2a2a]">
                        {totalPrice.toLocaleString()}đ
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={onAddToCart}
                      disabled={isKitchenClosed}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isKitchenClosed
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-95'
                      }`}
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      onClick={onBuyNow}
                      disabled={isKitchenClosed}
                      className={`px-6 h-12 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                        isKitchenClosed
                          ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                          : 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/30 hover:bg-slate-900 active:scale-95'
                      }`}
                    >
                      <ShoppingCart size={16} />
                      {isKitchenClosed ? 'Đóng bếp' : 'Mua'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Desktop Version - Bottom Right */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-8 right-8 z-50 hidden lg:block"
          >
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-900/10 border border-slate-100 p-4 w-80">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                  <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate mb-1">
                    {productName}
                  </p>
                  <p className="text-2xl font-black text-[#ed2a2a]">
                    {totalPrice.toLocaleString()}đ
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onAddToCart}
                  disabled={isKitchenClosed}
                  className={`flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    isKitchenClosed
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-95'
                  }`}
                >
                  <Plus size={16} />
                  {isKitchenClosed ? 'Đóng bếp' : 'Them'}
                </button>
                <button
                  onClick={onBuyNow}
                  disabled={isKitchenClosed}
                  className={`flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    isKitchenClosed
                      ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                      : 'bg-[#ed2a2a] text-white shadow-lg shadow-red-500/30 hover:bg-slate-900 active:scale-95'
                  }`}
                >
                  <ShoppingCart size={16} />
                  {isKitchenClosed ? 'Đóng bếp' : 'Mua ngay'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
