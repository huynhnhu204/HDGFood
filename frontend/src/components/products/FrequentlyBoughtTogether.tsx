'use client'

import { useState, useEffect } from 'react'
import { Plus, ShoppingCart, Sparkles, TrendingUp, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import api from '@/services/api'

interface Product {
  id: number
  name: string
  slug: string
  price: number
  final_price: number
  image: string
  sold_count?: number
}

interface FrequentlyBoughtTogetherProps {
  categoryId?: number
  currentProductId: number
  onAddMultipleToCart?: (products: Product[]) => void
}

export default function FrequentlyBoughtTogether({ 
  categoryId, 
  currentProductId,
  onAddMultipleToCart 
}: FrequentlyBoughtTogetherProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [addingToCart, setAddingToCart] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Try to fetch cross-selling products first
        try {
          const res = await api.get(`/products/${currentProductId}/cross-selling?limit=4`)
          const data = res.data?.data || []
          if (data.length > 0) {
            setProducts(data.slice(0, 4))
            setSelectedIds(data.slice(0, 2).map((p: Product) => p.id))
            setLoading(false)
            return
          }
        } catch (crossSellError) {
          console.log("Cross-selling not available, using category fallback")
        }
        
        // Fallback to category products
        if (categoryId) {
          const res = await api.get(`/products?category=${categoryId}&limit=4`)
          const data = res.data?.data || []
          const filtered = data.filter((p: Product) => p.id !== currentProductId).slice(0, 4)
          setProducts(filtered)
          if (filtered.length > 0) {
            setSelectedIds(filtered.slice(0, 2).map((p: Product) => p.id))
          }
        }
      } catch (err) {
        console.error("Failed to fetch products", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [categoryId, currentProductId])

  const toggleProduct = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    )
  }

  const handleAddToCart = async () => {
    if (selectedProducts.length === 0) return
    
    setAddingToCart(true)
    
    // Simulate API delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    onAddMultipleToCart?.(selectedProducts)
    
    setAddingToCart(false)
    setJustAdded(true)
    
    // Reset after 2 seconds
    setTimeout(() => setJustAdded(false), 2000)
  }

  const selectedProducts = products.filter(p => selectedIds.includes(p.id))
  const totalPrice = selectedProducts.reduce((sum, p) => sum + p.final_price, 0)
  const totalSavings = selectedProducts.reduce((sum, p) => sum + (p.price - p.final_price), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
              <div className="h-3 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-[2rem] p-6 lg:p-8 border-2 border-orange-100 relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-red-200/30 to-transparent rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Thường mua cùng
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Combo tiết kiệm cho bạn
              </p>
            </div>
          </div>
          
          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm"
            >
              <span className="text-xs font-black text-[#ed2a2a]">
                {selectedProducts.length} món
              </span>
              {totalSavings > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-bold text-emerald-600">
                    Tiết kiệm {totalSavings.toLocaleString()}đ
                  </span>
                </>
              )}
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <AnimatePresence mode="popLayout">
            {products.map((product, index) => {
              const isSelected = selectedIds.includes(product.id)
              return (
                <motion.button
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => toggleProduct(product.id)}
                  className="relative group"
                >
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      isSelected 
                        ? 'border-[#ed2a2a] shadow-xl shadow-red-500/30' 
                        : 'border-white hover:border-orange-200 shadow-md'
                    }`}
                  >
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/50 to-transparent transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`} />
                  </motion.div>
                  
                  {/* Checkbox with animation */}
                  <motion.div 
                    animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${
                      isSelected 
                        ? 'bg-[#ed2a2a] border-[#ed2a2a]' 
                        : 'bg-white/90 backdrop-blur-sm border-white'
                    }`}
                  >
                    {isSelected ? (
                      <Check size={16} className="text-white" />
                    ) : (
                      <Plus size={16} className="text-slate-400" />
                    )}
                  </motion.div>

                  {/* Hot badge */}
                  {product.sold_count && product.sold_count > 50 && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg">
                      Hot
                    </div>
                  )}

                  {/* Product info */}
                  <div className="mt-2 text-left">
                    <p className="text-[11px] font-bold text-slate-700 line-clamp-2 mb-1 leading-tight">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-[#ed2a2a]">
                        {product.final_price.toLocaleString()}đ
                      </p>
                      {product.price > product.final_price && (
                        <p className="text-[9px] font-bold text-slate-400 line-through">
                          {product.price.toLocaleString()}đ
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-orange-100"
            >
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Tổng cộng combo ({selectedProducts.length} món)
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl font-black text-[#ed2a2a]">
                    {totalPrice.toLocaleString()}đ
                  </p>
                  {totalSavings > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-full">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600">
                        Tiết kiệm {totalSavings.toLocaleString()}đ
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddToCart}
                disabled={addingToCart || justAdded}
                className={`px-8 h-14 rounded-xl font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center gap-2 ${
                  justAdded
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#ed2a2a] text-white hover:bg-slate-900 shadow-red-500/30'
                } disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {justAdded ? (
                  <>
                    <Check size={18} />
                    Đã thêm!
                  </>
                ) : addingToCart ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <ShoppingCart size={18} />
                    </motion.div>
                    Đang thêm...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Thêm combo
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint text */}
        {selectedProducts.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-slate-400 font-medium mt-4"
          >
            Chọn món để tạo combo tiết kiệm của bạn
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}
