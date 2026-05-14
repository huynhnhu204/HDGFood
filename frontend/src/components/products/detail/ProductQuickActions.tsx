'use client'

import type { Product } from '@/types'

interface Props {
  product: Product
  onUpdate: (patch: Partial<Pick<Product, 'is_active' | 'is_featured' | 'is_available'>>) => void
}

export default function ProductQuickActions({ product, onUpdate }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Hành động nhanh</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onUpdate({ is_active: !product.is_active })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            product.is_active
              ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
              : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {product.is_active ? '✅ Đang bán — Tắt?' : '⏸ Ngưng bán — Bật?'}
        </button>

        <button
          onClick={() => onUpdate({ is_featured: !product.is_featured })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            product.is_featured
              ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
              : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {product.is_featured ? '⭐ Nổi bật — Bỏ?' : '☆ Thường — Set nổi bật?'}
        </button>

        <button
          onClick={() => onUpdate({ is_available: !product.is_available })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            product.is_available
              ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
              : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
          }`}
        >
          {product.is_available ? '📦 Còn hàng — Đánh dấu hết?' : '❌ Hết hàng — Mở lại?'}
        </button>
      </div>
    </div>
  )
}
