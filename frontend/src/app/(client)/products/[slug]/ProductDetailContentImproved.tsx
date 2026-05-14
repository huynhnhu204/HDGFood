'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { 
  ShoppingCart, Plus, Minus, Check, 
  Star, Flame, Zap, Share2, Heart, 
  Award, Utensils, ChevronRight
} from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import api from '@/services/api'
import ProductReviews from '@/components/products/ProductReviews'
import FlyToCartAnimation, { useFlyToCart } from '@/components/products/FlyToCartAnimation'
import StickyCartBar from '@/components/products/StickyCartBar'
import FrequentlyBoughtTogether from '@/components/products/FrequentlyBoughtTogether'
import Breadcrumbs from '@/components/products/Breadcrumbs'
import Link from 'next/link'
import { useCartStore } from '@/store/useCartStore'

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

// Cố định locale tránh lệch hydration (server thường en-US, trình duyệt là vi-VN).
const fmtVnd = (n: number) => n.toLocaleString('vi-VN')

// Types
interface Product {
  id: number
  name: string
  slug: string
  price: number
  final_price: number
  sale_price: number | null
  image: string
  description: string | null
  long_description: string | null
  stock: number
  is_available?: boolean
  sold_count: number
  rating_avg: number
  reviews_count: number
  nutrition?: { [key: string]: string }
  category?: {
    id: number
    name: string
    slug: string
  }
  images?: { id: number; url: string }[]
  extra_images?: string[]
  options?: {
    id: number
    name: string
    is_required: boolean
    values: { id: number; label: string; price_extra: number }[]
  }[]
  active_promotion?: {
    discount_label: string
  }
}

// Product Gallery with Parallax
function ProductGallery({ mainImage, images }: { mainImage: string; images?: { id: number; url: string }[] }) {
  const [activeImg, setActiveImg] = useState(mainImage)
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  })
  
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])

  const allImages = useMemo(() => {
    const galleryItems = images?.map(img => img.url) || []
    return [mainImage, ...galleryItems.filter(url => url !== mainImage)]
  }, [mainImage, images])

  return (
    <div ref={ref} className="space-y-6 lg:sticky lg:top-24">
       <motion.div 
         style={{ y }}
         className="aspect-square rounded-[2.5rem] overflow-hidden bg-slate-50 border border-slate-100 shadow-xl shadow-slate-200/40 relative group"
       >
          <motion.img 
            src={activeImg} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt="Product"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6 }}
          />
          <button className="absolute top-6 right-6 w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-900 border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
             <Heart className="w-6 h-6 hover:fill-[#ed2a2a] hover:text-[#ed2a2a] transition-colors" />
          </button>
       </motion.div>

       {allImages.length > 1 && (
         <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 sm:gap-4 px-1">
            {allImages.map((url, i) => (
              <button 
                key={i} 
                onClick={() => setActiveImg(url)}
                className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all shadow-sm ${activeImg === url ? 'border-[#ed2a2a] scale-95 shadow-red-500/10' : 'border-white hover:border-slate-200'}`}
              >
                 <img src={url} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
              </button>
            ))}
         </div>
       )}
    </div>
  )
}

// Related Products with Skeleton
function RelatedProducts({ categoryId, currentProductId }: { categoryId?: number; currentProductId: number }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const res = await api.get(`/products?category=${categoryId}&limit=8`)
        const data = res.data?.data || []
        setProducts(data.filter((p: Product) => p.id !== currentProductId))
      } catch (err) {
        console.error("Related products fetch failed", err)
      } finally {
        setLoading(false)
      }
    }
    if (categoryId) fetchRelated()
  }, [categoryId, currentProductId])

  if (loading) {
    return (
      <section className="py-16 md:py-24 border-t border-slate-100">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-10 uppercase tracking-tight">
          Món ngon tương tự
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
              <div className="h-4 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  return (
    <section className="py-16 md:py-24 border-t border-slate-100">
      <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-10 uppercase tracking-tight flex items-center gap-3">
        Món ngon tương tự
        <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
      </h2>

      <Swiper
         modules={[Navigation, FreeMode]}
         spaceBetween={16}
         slidesPerView={1.5}
         freeMode={true}
         breakpoints={{
           640:  { slidesPerView: 2.5, spaceBetween: 20 },
           1024: { slidesPerView: 4.2, spaceBetween: 24 },
         }}
      >
         {products.map((p) => (
           <SwiperSlide key={p.id}>
              <Link href={`/products/${p.slug}`} className="block group">
                 <div className="bg-white rounded-[2rem] border border-slate-100 p-4 hover:shadow-2xl hover:border-red-50 transition-all">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-4">
                       <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <h4 className="text-[13px] font-black text-slate-800 line-clamp-1 group-hover:text-[#ed2a2a] transition-colors">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-sm font-black text-[#ed2a2a]">{p.final_price != null ? fmtVnd(p.final_price) : ''}đ</span>
                       {p.price > p.final_price && <span className="text-[10px] font-bold text-slate-300 line-through">{fmtVnd(p.price)}đ</span>}
                    </div>
                 </div>
              </Link>
           </SwiperSlide>
         ))}
      </Swiper>
    </section>
  )
}

// Main Component
export default function ProductDetailContentImproved({ product }: { product: Product }) {
  const galleryImages = useMemo(() => {
    const listFromObjects = (product.images ?? []).map((img) => img.url)
    const listFromStrings = product.extra_images ?? []
    return Array.from(new Set([...listFromObjects, ...listFromStrings]))
      .filter((url) => typeof url === 'string' && url.length > 0)
      .map((url, idx) => ({ id: idx + 1, url }))
  }, [product.images, product.extra_images])

  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [viewCount, setViewCount] = useState(0)
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([])
  const [mounted, setMounted] = useState(false)
  const { flyingItems, triggerFlyAnimation } = useFlyToCart()
  const buyButtonRef = useRef<HTMLButtonElement>(null)

  // Initialize view count after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    setViewCount(Math.floor(Math.random() * 50) + 10)
  }, [])

  // Simulate live view counter
  useEffect(() => {
    if (!mounted) return
    
    const interval = setInterval(() => {
      setViewCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1
        return Math.max(5, prev + change)
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [mounted])

  // Save to recently viewed
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const saved = localStorage.getItem('recentlyViewed')
    const items: Product[] = saved ? JSON.parse(saved) : []
    const filtered = items.filter(p => p.id !== product.id).slice(0, 7)
    const updated = [product, ...filtered]
    localStorage.setItem('recentlyViewed', JSON.stringify(updated))
    setRecentlyViewed(filtered)
  }, [product.id])

  const extraPrice = useMemo(() => {
    let total = 0
    product.options?.forEach(opt => {
      const selectedValId = selectedOptions[opt.name]
      if (selectedValId) {
        const val = opt.values.find(v => v.id === selectedValId)
        if (val) total += val.price_extra
      }
    })
    return total
  }, [selectedOptions, product.options])

  const totalPrice = (product.final_price + extraPrice) * quantity
  const isKitchenClosed = product.is_available === false || product.stock <= 0

  const handleAddToCart = (e?: React.MouseEvent, withAnimation: boolean = false) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (isKitchenClosed) return

    const optionsForCart: Record<string, string> = {}
    if (product.options) {
      product.options.forEach(opt => {
        const selectedValId = selectedOptions[opt.name]
        if (selectedValId) {
          const val = opt.values.find(v => v.id === selectedValId)
          if (val) optionsForCart[opt.name] = val.label
        }
      })
    }
    
    if (note.trim() !== '') {
       optionsForCart['Ghi chú'] = note.trim()
    }

    useCartStore.getState().addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.final_price + extraPrice,
      image: product.image,
      quantity: quantity,
      options: Object.keys(optionsForCart).length > 0 ? optionsForCart : undefined
    })

    if (withAnimation) {
      const buttonElement = e?.currentTarget as HTMLElement || buyButtonRef.current
      if (buttonElement) {
        triggerFlyAnimation(product.image, buttonElement)
      }
    }

    window.dispatchEvent(new Event('cart-updated'))
  }

  const handleAddMultipleToCart = (products: Product[]) => {
    products.forEach(p => {
      useCartStore.getState().addItem({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        price: p.final_price,
        image: p.image,
        quantity: 1
      })
    })
    window.dispatchEvent(new Event('cart-updated'))
    useCartStore.getState().setCartOpen(true)
  }

  return (
    <>
      <FlyToCartAnimation flyingItems={flyingItems} />
      <StickyCartBar
        productImage={product.image}
        productName={product.name}
        totalPrice={totalPrice}
        onAddToCart={() => handleAddToCart(undefined, true)}
        onBuyNow={() => { handleAddToCart(undefined, true); setTimeout(() => useCartStore.getState().setCartOpen(true), 100); }}
        isKitchenClosed={isKitchenClosed}
      />
      
      <div className="container mx-auto px-4 py-8 lg:py-12">
       
       {/* Breadcrumb */}
       <div className="mb-6">
          <Breadcrumbs 
            items={[
              { label: product.category?.name || 'Sản phẩm', href: `/products?category=${product.category?.id}` },
              { label: product.name }
            ]} 
          />
       </div>

       <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* LEFT: Gallery (50%) */}
          <div className="w-full lg:w-1/2">
             <ProductGallery mainImage={product.image} images={galleryImages} />
          </div>

          {/* RIGHT: Product Info (50%) */}
          <div className="w-full lg:w-1/2 space-y-8">

             {/* Product Name - H1 for SEO */}
             <div className="space-y-4">
                {/* Live indicators */}
                {mounted && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {viewCount > 0 && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full"
                      >
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-green-700">{viewCount} người đang xem</span>
                      </motion.div>
                    )}
                    
                    {!isKitchenClosed && product.stock > 0 && product.stock <= 10 && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full"
                      >
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span className="text-xs font-bold text-orange-700">Chỉ còn {product.stock} suất</span>
                      </motion.div>
                    )}

                    {isKitchenClosed && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                        <span className="text-xs font-bold text-red-700">Đóng bếp</span>
                      </div>
                    )}
                  </div>
                )}

                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900 leading-tight">
                  {product.name}
                </h1>

                {/* Rating & Sold */}
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < Math.floor(product.rating_avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                      />
                    ))}
                    <span className="text-sm font-black text-slate-900 ml-1">{product.rating_avg || 5.0}</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200" />
                  <p className="text-sm font-bold text-slate-500">
                    Đã bán {product.sold_count}+
                  </p>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  {product.price > product.final_price && (
                    <p className="text-lg text-slate-400 line-through font-bold">
                      {fmtVnd(product.price)}đ
                    </p>
                  )}
                  <div className="flex items-end gap-3">
                    <p className="text-4xl lg:text-5xl font-black text-[#ed2a2a]">
                      {fmtVnd(product.final_price)}đ
                    </p>
                    {product.active_promotion && (
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-black mb-1">
                        {product.active_promotion.discount_label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Short description */}
                {product.description && (
                  <p className="text-sm text-slate-500 leading-relaxed border-l-2 border-[#ed2a2a] pl-4">
                    {product.description}
                  </p>
                )}
             </div>

             {/* Options */}
             {product.options && product.options.length > 0 && (
                <div className="space-y-6">
                   {product.options.map((opt) => (
                      <div key={opt.id} className="space-y-3">
                         <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center justify-between">
                            {opt.name}
                            {opt.is_required && <span className="text-[9px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Bắt buộc *</span>}
                         </h4>
                         <div className="flex flex-wrap gap-2">
                            {opt.values.map((v) => (
                               <button 
                                 key={v.id}
                                 onClick={() => setSelectedOptions({ ...selectedOptions, [opt.name]: v.id })}
                                 className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative
                                   ${selectedOptions[opt.name] === v.id 
                                     ? 'bg-slate-900 text-white shadow-lg' 
                                     : 'bg-white border border-slate-200 text-slate-600 hover:border-[#ed2a2a]'
                                   }
                                 `}
                               >
                                  <span>{v.label}</span>
                                  {v.price_extra > 0 && <span className="text-[9px] ml-1">+{fmtVnd(v.price_extra)}đ</span>}
                                  {selectedOptions[opt.name] === v.id && (
                                     <div className="absolute -top-1 -right-1 bg-[#ed2a2a] text-white p-0.5 rounded-full">
                                        <Check className="w-3 h-3" />
                                     </div>
                                  )}
                               </button>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
             )}

             {/* Chef Note */}
             <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                   <Utensils className="w-4 h-4 text-[#ed2a2a]" />
                   Ghi chú cho đầu bếp
                </h4>
                <textarea 
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ví dụ: Không hành, nhiều tương ớt..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all resize-none min-h-[80px]"
                />
             </div>

             {/* Quantity & Buy */}
             <div className="space-y-4">
                {/* Stock warning */}
                {!isKitchenClosed && product.stock > 0 && product.stock <= 5 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2"
                  >
                    <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs font-bold text-amber-800">
                      Sắp hết! Chỉ còn {product.stock} suất. Đặt ngay để không bỏ lỡ!
                    </p>
                  </motion.div>
                )}

                <div className="flex items-center gap-4">
                   <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                      <button 
                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                        disabled={isKitchenClosed}
                        className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Minus size={18} />
                      </button>
                      <span className="w-12 text-center text-lg font-black text-slate-900">{quantity}</span>
                      <button 
                         onClick={() => setQuantity(prev => Math.min(product.stock || 999, prev + 1))}
                         disabled={isKitchenClosed}
                         className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Plus size={18} />
                      </button>
                   </div>
                   
                   <button 
                     ref={buyButtonRef}
                     onClick={(e) => { handleAddToCart(e, true); setTimeout(() => useCartStore.getState().setCartOpen(true), 100); }}
                     disabled={isKitchenClosed}
                     className="flex-1 h-14 bg-[#ed2a2a] text-white rounded-xl text-sm font-black uppercase tracking-wider shadow-xl shadow-red-500/30 hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none"
                   >
                      {isKitchenClosed ? 'Đóng bếp' : `Mua ngay • ${fmtVnd(totalPrice)}đ`}
                      <ShoppingCart size={18} />
                   </button>
                </div>

                <div className="flex gap-3">
                   <button 
                     onClick={(e) => handleAddToCart(e, true)}
                     disabled={isKitchenClosed}
                     className="flex-1 h-12 bg-white border-2 border-[#ed2a2a] text-[#ed2a2a] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-50 transition-all disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                   >
                      {isKitchenClosed ? 'Đóng bếp' : 'Thêm vào giỏ'}
                   </button>
                   <button 
                     onClick={() => {
                       if (navigator.share) {
                         navigator.share({
                           title: product.name,
                           text: product.description || '',
                           url: window.location.href
                         })
                       } else {
                         navigator.clipboard.writeText(window.location.href)
                         alert('Đã copy link sản phẩm!')
                       }
                     }}
                     className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:text-slate-900 hover:bg-white transition-all"
                   >
                      <Share2 size={18} />
                   </button>
                </div>
             </div>

             {/* Benefits with Dynamic Delivery Time */}
             <div className="grid grid-cols-2 gap-3 pt-4">
                {[
                  { 
                    icon: <Zap className="w-5 h-5" />,
                    title: !isKitchenClosed ? 'Giao 20-30 phút' : 'Bep tam dong',
                    desc: !isKitchenClosed ? 'Nhanh & An tâm' : 'Vui long quay lai sau'
                  },
                  { icon: <Award className="w-5 h-5" />, title: 'Vệ sinh', desc: 'Chứng nhận ATVSTP' },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
                     <div className="w-10 h-10 bg-red-50 text-[#ed2a2a] rounded-xl flex items-center justify-center shrink-0">
                        {item.icon}
                     </div>
                     <div>
                        <h6 className="text-[11px] font-black uppercase text-slate-900">{item.title}</h6>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{item.desc}</p>
                     </div>
                  </div>
                ))}
             </div>

             {/* Frequently Bought Together */}
             <FrequentlyBoughtTogether
               categoryId={product.category?.id}
               currentProductId={product.id}
               onAddMultipleToCart={handleAddMultipleToCart}
             />

          </div>
       </div>

       {/* SCROLL SECTIONS - No Tabs */}
       <div className="mt-24 lg:mt-32 space-y-24">
          
          {/* Description Section */}
          <section id="description" className="scroll-mt-24">
             <h2 className="text-2xl lg:text-3xl font-black text-slate-900 mb-8 uppercase tracking-tight">
                Sản phẩm đặc sắc
             </h2>
             {product.long_description ? (
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                 <div className="lg:col-span-8">
                   <div className="prose prose-slate max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed">
                     <div dangerouslySetInnerHTML={{ __html: product.long_description }} />
                   </div>
                 </div>
                 {product.description && (
                   <div className="lg:col-span-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 h-fit space-y-4">
                     <h5 className="text-xs font-black uppercase tracking-widest text-[#ed2a2a]">Mô tả ngắn</h5>
                     <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
                   </div>
                 )}
               </div>
             ) : product.description ? (
               <div className="prose prose-slate max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed">
                 <p className="text-slate-600 leading-relaxed">{product.description}</p>
               </div>
             ) : (
               <p className="text-slate-400 italic">Đang cập nhật mô tả món ăn...</p>
             )}
          </section>

          {/* Nutrition Section */}
          <section id="nutrition" className="scroll-mt-24">
             <h2 className="text-2xl lg:text-3xl font-black text-slate-900 mb-8 uppercase tracking-tight">
                Thông tin dinh dưỡng
             </h2>

             {product.nutrition && Object.keys(product.nutrition).length > 0 ? (
               <div className="space-y-6">
                 {/* Main nutrition grid */}
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {['kcal', 'protein', 'fat', 'carbs'].map(key => {
                     const val = product.nutrition![key]
                     if (!val) return null
                     const icons: Record<string, string> = { kcal: '🔥', protein: '💪', fat: '🥑', carbs: '🌾' }
                     const labels: Record<string, string> = { kcal: 'Năng lượng', protein: 'Protein', fat: 'Chất béo', carbs: 'Carbs' }
                     const colors: Record<string, string> = { kcal: 'bg-orange-50 border-orange-100', protein: 'bg-blue-50 border-blue-100', fat: 'bg-yellow-50 border-yellow-100', carbs: 'bg-green-50 border-green-100' }
                     return (
                       <div key={key} className={`p-5 rounded-2xl border-2 ${colors[key]} text-center`}>
                         <div className="text-3xl mb-2">{icons[key]}</div>
                         <p className="text-xl font-black text-slate-800">{val}</p>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{labels[key]}</p>
                       </div>
                     )
                   })}
                 </div>

                 {/* Extra nutrition fields */}
                 {Object.entries(product.nutrition).filter(([k]) => !['kcal','protein','fat','carbs'].includes(k)).length > 0 && (
                   <div className="bg-slate-50 rounded-2xl p-5">
                     <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider mb-4">Thành phần khác</h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                       {Object.entries(product.nutrition)
                         .filter(([k]) => !['kcal','protein','fat','carbs'].includes(k))
                         .map(([key, val]) => (
                           <div key={key} className="flex justify-between items-center bg-white rounded-xl px-4 py-3 border border-slate-200">
                             <span className="text-sm font-semibold text-slate-600 capitalize">{key}</span>
                             <span className="text-sm font-black text-slate-800">{val}</span>
                           </div>
                         ))}
                     </div>
                   </div>
                 )}

                 {/* Long description */}
                 {product.long_description && (
                   <div className="prose prose-slate max-w-none bg-slate-50 p-8 rounded-3xl">
                     <div dangerouslySetInnerHTML={{ __html: product.long_description }} />
                   </div>
                 )}
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                 <BenefitCard title="Không chứa chất bảo quản" desc="Nguyên liệu tươi sạch" icon={<Flame className="w-6 h-6" />} />
                 <BenefitCard title="Chế biến tươi mỗi ngày" desc="Đảm bảo chất lượng" icon={<Zap className="w-6 h-6" />} />
                 <BenefitCard title="An toàn vệ sinh" desc="Tiêu chuẩn VSATTP" icon={<Award className="w-6 h-6" />} />
               </div>
             )}
          </section>

          {/* Reviews Section */}
          <section id="reviews" className="scroll-mt-24">
             <h2 className="text-2xl lg:text-3xl font-black text-slate-900 mb-8 uppercase tracking-tight">
                Khách hàng chia sẻ ({product.reviews_count})
             </h2>
             <ProductReviews productId={product.id} />
          </section>

       </div>

       {/* Related Products */}
       <RelatedProducts categoryId={product.category?.id} currentProductId={product.id} />

       {/* Recently Viewed Products */}
       {recentlyViewed.length > 0 && (
         <section className="py-16 md:py-24 border-t border-slate-100">
           <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-10 uppercase tracking-tight flex items-center gap-3">
             Bạn đã xem gần đây
             <span className="text-sm font-normal text-slate-400 normal-case">({recentlyViewed.length})</span>
           </h2>

           <Swiper
             modules={[Navigation, FreeMode]}
             spaceBetween={16}
             slidesPerView={1.5}
             freeMode={true}
             breakpoints={{
               640:  { slidesPerView: 2.5, spaceBetween: 20 },
               1024: { slidesPerView: 4.2, spaceBetween: 24 },
             }}
           >
             {recentlyViewed.map((p) => (
               <SwiperSlide key={p.id}>
                 <Link href={`/products/${p.slug}`} className="block group">
                   <div className="bg-white rounded-[2rem] border border-slate-100 p-4 hover:shadow-2xl hover:border-red-50 transition-all">
                     <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-4">
                       <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                     </div>
                     <h4 className="text-[13px] font-black text-slate-800 line-clamp-1 group-hover:text-[#ed2a2a] transition-colors">{p.name}</h4>
                     <div className="flex items-center gap-2 mt-2">
                       <span className="text-sm font-black text-[#ed2a2a]">{p.final_price != null ? fmtVnd(p.final_price) : ''}đ</span>
                       {p.price > p.final_price && <span className="text-[10px] font-bold text-slate-300 line-through">{fmtVnd(p.price)}đ</span>}
                     </div>
                   </div>
                 </Link>
               </SwiperSlide>
             ))}
           </Swiper>
         </section>
       )}

      </div>
    </>
  )
}

function BenefitCard({ title, desc, icon }: any) {
   return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-3 hover:shadow-xl transition-all">
         <div className="w-14 h-14 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center">
            {icon}
         </div>
         <div>
            <h6 className="text-sm font-black text-slate-900">{title}</h6>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{desc}</p>
         </div>
      </div>
   )
}
