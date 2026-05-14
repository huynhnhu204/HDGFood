'use client'

import { useState, useEffect } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { profileService } from '@/services/profile.service'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('/api', '')
const getImg = (p: string | null | undefined) => {
  if (!p) return ''
  if (p.startsWith('http')) return p
  if (p.startsWith('/storage')) return `${API_URL}${p}`
  return `${API_URL}/storage/${p}`
}

export default function WishlistTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWishlist()
  }, [])

  const loadWishlist = async () => {
    setLoading(true)
    try {
      const res = await profileService.getWishlist()
      setItems(res.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (productId: number) => {
    try {
      await profileService.removeFromWishlist(productId)
      setItems(prev => prev.filter(i => i.product_id !== productId))
      toast.success('Đã xóa khỏi yêu thích')
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  return (
    <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-slate-100">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-[#ed2a2a]" />
          </div>
          Sản Phẩm Yêu Thích
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1 ml-[52px]">
          Danh sách các món bạn đã lưu
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin mb-4" />
          <span className="font-bold text-slate-500 uppercase tracking-widest text-sm animate-pulse">Đang tải...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-10 h-10 text-slate-300" />
          </div>
          <span className="text-slate-500 font-semibold mb-1">Chưa có sản phẩm yêu thích</span>
          <p className="text-sm text-slate-400 max-w-sm">Thêm các món ăn vào danh sách yêu thích để dễ dàng tìm lại!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {items.map(item => {
            const product = item.product
            if (!product) return null
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all group"
              >
                <div className="relative aspect-square bg-slate-100">
                  <img
                    src={getImg(product.image)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    onClick={() => handleRemove(product.id)}
                    aria-label="Bỏ yêu thích"
                    className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-[#ed2a2a] hover:bg-red-50 transition-all shadow-sm"
                  >
                    <Heart className="w-4 h-4 fill-[#ed2a2a]" />
                  </button>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-sm text-slate-800 line-clamp-2 group-hover:text-[#ed2a2a] transition-colors mb-2">
                    {product.name}
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#ed2a2a] text-sm">
                      {Number(product.sale_price || product.price).toLocaleString('vi-VN')}đ
                    </span>
                    {product.sale_price && product.sale_price < product.price && (
                      <span className="text-[12px] text-slate-400 line-through font-medium">
                        {Number(product.price).toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
