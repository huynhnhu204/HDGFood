'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles, Gift, Tag, TrendingUp } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/services/api'

interface SuggestedProduct {
  id: number
  name: string
  slug: string
  price: number
  final_price: number
  image: string
}

export default function CartSidebar() {
  const { items, isOpen, setCartOpen, removeItem, updateQuantity, getTotal, addItem } = useCartStore()
  const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [addingProduct, setAddingProduct] = useState<number | null>(null)
  const [justRemoved, setJustRemoved] = useState<string | null>(null)

  // Fetch suggested products based on cart items
  useEffect(() => {
    if (items.length > 0 && isOpen) {
      fetchSuggestions()
    }
  }, [items.length, isOpen])

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const productIds = items.map(item => item.productId).filter(Boolean)
      if (productIds.length === 0) {
        setLoadingSuggestions(false)
        return
      }

      let data: SuggestedProduct[] = []
      
      // Try cross-selling first
      try {
        const res = await api.get(`/products/${productIds[0]}/cross-selling?limit=3`)
        data = res.data?.data || []
      } catch (crossSellError) {
        console.log('Cross-selling not available, using random products')
        // Fallback to random products
        try {
          const res = await api.get(`/products?limit=6`)
          data = res.data?.data || []
        } catch {}
      }

      // Filter out products already in cart
      const filtered = data.filter((p: SuggestedProduct) => 
        !items.some(item => item.productId === p.id)
      )
      setSuggestedProducts(filtered.slice(0, 2))
    } catch (error) {
      console.error('Failed to fetch suggestions', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleAddSuggestion = async (product: SuggestedProduct) => {
    setAddingProduct(product.id)
    
    // Simulate delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.final_price,
      image: product.image,
      quantity: 1
    })
    
    // Remove from suggestions
    setSuggestedProducts(prev => prev.filter(p => p.id !== product.id))
    setAddingProduct(null)
  }

  const handleRemoveItem = (id: string) => {
    setJustRemoved(id)
    setTimeout(() => {
      removeItem(id)
      setJustRemoved(null)
    }, 300)
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const freeShippingThreshold = 200000
  const currentTotal = getTotal()
  const progressToFreeShip = Math.min((currentTotal / freeShippingThreshold) * 100, 100)
  const remainingForFreeShip = Math.max(0, freeShippingThreshold - currentTotal)

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={setCartOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-2xl">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100 bg-white shadow-sm z-10 relative">
                      <div>
                        <Dialog.Title className="text-xl font-black uppercase italic tracking-tight text-slate-900 flex items-center gap-3">
                          <div className="relative">
                            <ShoppingBag className="w-6 h-6 text-[#ed2a2a]" />
                            {totalItems > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-[#ed2a2a] text-white text-[10px] font-black rounded-full flex items-center justify-center"
                              >
                                {totalItems}
                              </motion.span>
                            )}
                          </div>
                          Giỏ hàng của bạn
                        </Dialog.Title>
                        {items.length > 0 && (
                          <p className="text-xs text-slate-400 font-medium mt-1">
                            {totalItems} món • {currentTotal.toLocaleString()}đ
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="rounded-2xl p-2 text-slate-400 hover:text-[#ed2a2a] hover:bg-red-50 focus:outline-none transition-all active:scale-95"
                        onClick={() => setCartOpen(false)}
                      >
                        <span className="sr-only">Đóng panel</span>
                        <X className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Free Shipping Progress */}
                    {items.length > 0 && remainingForFreeShip > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">
                              Thêm {remainingForFreeShip.toLocaleString()}đ để được freeship!
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-600">
                            {Math.round(progressToFreeShip)}%
                          </span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressToFreeShip}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                          />
                        </div>
                      </motion.div>
                    )}

                    {items.length > 0 && remainingForFreeShip === 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-sm font-black">Bạn được freeship rồi!</span>
                          <Sparkles className="w-4 h-4" />
                        </div>
                      </motion.div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                      <AnimatePresence mode="popLayout">
                        {items.length === 0 ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center h-full text-center space-y-6"
                          >
                            <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex items-center justify-center rotate-12 border border-slate-100">
                               <ShoppingBag className="w-16 h-16 text-slate-200" />
                            </div>
                            <div className="space-y-2">
                               <p className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Giỏ hàng trống</p>
                               <p className="text-sm font-bold text-slate-400">Hãy thêm món ngon vào giỏ của bạn nhé!</p>
                            </div>
                            <button
                              onClick={() => setCartOpen(false)}
                              className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all w-full"
                            >
                              Tiếp tục chọn món
                            </button>
                          </motion.div>
                        ) : (
                          <ul role="list" className="space-y-4">
                            {items.map((item) => (
                              <motion.li 
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95, x: -20 }}
                                animate={{ 
                                  opacity: justRemoved === item.id ? 0 : 1, 
                                  scale: justRemoved === item.id ? 0.9 : 1,
                                  x: justRemoved === item.id ? -20 : 0
                                }}
                                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <Link 
                                  href={`/products/${item.slug}`} 
                                  onClick={() => setCartOpen(false)}
                                  className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-50 bg-slate-50 group"
                                >
                                  <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" 
                                  />
                                </Link>

                                <div className="flex flex-1 flex-col justify-between">
                                  <div>
                                    {item.isCombo && (
                                      <span className="text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-[#ed2a2a] to-orange-500 px-2 py-0.5 rounded-lg mb-1 inline-block">
                                        COMBO
                                      </span>
                                    )}
                                    <div className="flex justify-between text-base font-medium text-gray-900 gap-2">
                                      <h3 className="text-sm font-black text-slate-800 line-clamp-2 leading-tight uppercase tracking-tight">
                                        <Link href={item.isCombo ? '#' : `/products/${item.slug}`} onClick={(e) => { if (!item.isCombo) setCartOpen(false) }} className="hover:text-[#ed2a2a] transition-colors">
                                          {item.name}
                                        </Link>
                                      </h3>
                                      <p className="ml-4 font-black text-[#ed2a2a] whitespace-nowrap italic text-sm">
                                         {(item.price * item.quantity).toLocaleString()}đ
                                      </p>
                                    </div>
                                    {item.comboBasePrice && item.comboBasePrice > item.price && (
                                      <span className="text-[10px] font-bold text-slate-400 line-through">
                                        {item.comboBasePrice.toLocaleString()}đ
                                      </span>
                                    )}
                                    {item.options && Object.keys(item.options).length > 0 && !item.isCombo && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                         {Object.entries(item.options).map(([key, val]) => (
                                            <span key={key} className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                               {key}: {val}
                                            </span>
                                         ))}
                                      </div>
                                    )}
                                    {item.isCombo && item.comboSelections && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                          {item.comboSelections.reduce((sum, s) => sum + s.product_ids.length, 0)} món
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-1 items-end justify-between text-sm mt-3">
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
                                       <motion.button 
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                          className="w-7 h-7 flex items-center justify-center text-slate-500 bg-white rounded-lg shadow-sm hover:text-slate-900 transition-colors"
                                       >
                                          <Minus className="w-3 h-3" />
                                       </motion.button>
                                       <span className="font-black text-sm text-slate-900 min-w-[1.5rem] text-center tabular-nums">{item.quantity}</span>
                                       <motion.button 
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                          className="w-7 h-7 flex items-center justify-center text-slate-500 bg-white rounded-lg shadow-sm hover:text-slate-900 transition-colors"
                                       >
                                          <Plus className="w-3 h-3" />
                                       </motion.button>
                                    </div>

                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      type="button"
                                      onClick={() => handleRemoveItem(item.id)}
                                      className="p-2 text-slate-300 hover:text-red-500 transition-colors bg-red-50/0 hover:bg-red-50 rounded-xl"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.li>
                            ))}
                          </ul>
                        )}
                      </AnimatePresence>
                      
                      {/* Suggested Products */}
                      {items.length > 0 && suggestedProducts.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 bg-gradient-to-br from-orange-50 to-red-50 p-5 rounded-3xl border-2 border-orange-100"
                        >
                           <div className="flex items-center gap-2 mb-4">
                              <TrendingUp className="w-4 h-4 text-[#ed2a2a]" />
                              <h5 className="text-xs font-black uppercase tracking-widest text-[#ed2a2a]">Thường mua cùng</h5>
                           </div>
                           <div className="space-y-3">
                              {suggestedProducts.map((product) => (
                                <motion.div
                                  key={product.id}
                                  layout
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="flex gap-3 items-center bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="w-14 h-14 bg-slate-100 rounded-xl shrink-0 overflow-hidden">
                                    <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <h6 className="text-xs font-black text-slate-900 uppercase line-clamp-1">{product.name}</h6>
                                     <div className="flex items-center gap-2 mt-0.5">
                                       <span className="text-xs font-black text-[#ed2a2a]">{product.final_price.toLocaleString()}đ</span>
                                       {product.price > product.final_price && (
                                         <span className="text-[9px] font-bold text-slate-400 line-through">{product.price.toLocaleString()}đ</span>
                                       )}
                                     </div>
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleAddSuggestion(product)}
                                    disabled={addingProduct === product.id}
                                    className="w-9 h-9 rounded-full bg-[#ed2a2a] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                  >
                                    {addingProduct === product.id ? (
                                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}>
                                        <Plus className="w-4 h-4" />
                                      </motion.div>
                                    ) : (
                                      <Plus className="w-4 h-4" />
                                    )}
                                  </motion.button>
                                </motion.div>
                              ))}
                           </div>
                        </motion.div>
                      )}

                    </div>

                    {/* Footer / Checkout */}
                    {items.length > 0 && (
                      <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="border-t border-slate-100 bg-white px-6 py-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20"
                      >
                        <div className="flex justify-between text-base font-black text-gray-900 uppercase tracking-tight mb-6">
                          <p>Tổng tiền tạm tính</p>
                          <p className="text-[#ed2a2a] text-2xl italic">{currentTotal.toLocaleString()}đ</p>
                        </div>
                        <div className="space-y-3">
                          <Link
                            href="/checkout"
                            onClick={() => setCartOpen(false)}
                            className="flex items-center justify-center gap-3 w-full rounded-full border border-transparent bg-[#ed2a2a] px-6 py-5 text-[13px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-red-500/30 hover:bg-slate-900 transition-all active:scale-95 group relative overflow-hidden"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                               Thanh toán ngay
                               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                          </Link>
                          <button
                            type="button"
                            className="flex items-center justify-center w-full px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                            onClick={() => setCartOpen(false)}
                          >
                            Tiếp tục mua hàng
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
