'use client'

import { Pencil, Trash2, Copy, Package, ArrowLeft } from 'lucide-react'
import type { Product } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

interface Props {
  product: Product
  onEdit: () => void
  onDelete: () => void
  onClone: () => void
}

export default function ProductDetailHeader({ product, onEdit, onDelete, onClone }: Props) {
  const discount = product.sale_price && product.price > 0
    ? Math.round((1 - product.sale_price / product.price) * 100)
    : null

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="relative h-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {product.image && (
          <img 
            src={product.image} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[2px] scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        <div className="relative z-10 h-full flex items-end p-6">
          <div className="flex items-end justify-between w-full gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-white/10 backdrop-blur-sm">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20">
                    SP-{String(product.id).padStart(5, '0')}
                  </span>
                  {product.is_featured && (
                    <span className="px-3 py-1 bg-amber-400/90 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                      ⭐ Nổi bật
                    </span>
                  )}
                </div>
                <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight drop-shadow-lg">
                  {product.name}
                </h1>
                <p className="text-white/60 text-xs mt-1 font-mono">/products/{product.slug}</p>
              </div>
            </div>

            {/* Status */}
            {product.is_active ? (
              <span className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500/90 backdrop-blur-md text-white rounded-2xl text-xs font-bold shadow-lg border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Đang bán
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-700/90 backdrop-blur-md text-slate-300 rounded-2xl text-xs font-bold border border-slate-600/30">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Đã ẩn
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Info Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Category */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Danh mục</p>
              <p className="text-sm font-bold text-slate-800 truncate">
                {product.category?.name ?? 'Chưa phân loại'}
              </p>
            </div>

            {/* Price */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giá bán</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-[#ed2a2a]">{fmt(product.sale_price ?? product.price)}</span>
                {product.sale_price && product.price > product.sale_price && (
                  <span className="text-xs text-slate-400 line-through">{fmt(product.price)}</span>
                )}
              </div>
              {discount && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg mt-1 inline-block">
                  -{discount}%
                </span>
              )}
            </div>

            {/* Stock */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tồn kho</p>
              <p className={`text-lg font-black ${
                !product.is_available || product.stock === 0 ? 'text-red-500' :
                (product.stock ?? 0) <= 10 ? 'text-amber-500' : 'text-emerald-600'
              }`}>
                {product.is_available ? '∞' : (product.stock ?? 0)}
              </p>
              <p className="text-[10px] text-slate-400">
                {product.is_available ? 'Luôn có sẵn' : (product.stock ?? 0) === 0 ? 'Hết hàng' : 'sản phẩm'}
              </p>
            </div>

            {/* Rating */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đánh giá</p>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-amber-500">
                  {product.rating_avg !== undefined ? Number(product.rating_avg).toFixed(1) : '—'}
                </span>
                <span className="text-yellow-400 text-sm">★</span>
              </div>
              <p className="text-[10px] text-slate-400">{product.reviews_count || 0} đánh giá</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 lg:flex-col lg:gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-5 py-3 bg-[#ed2a2a] text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              <Pencil className="w-4 h-4" />
              Chỉnh sửa
            </button>
            <button
              onClick={onClone}
              className="flex items-center gap-2 px-4 py-3 border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Clone</span>
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-3 border border-red-100 text-red-500 rounded-2xl text-sm font-bold hover:bg-red-50 hover:border-red-200 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Xoá</span>
            </button>
          </div>
        </div>

        {/* Badges Row */}
        {(product.health_score !== undefined || product.health_badges?.length) && (
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-slate-100">
            {product.health_score !== undefined && product.health_score > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                💚 Điểm sức khỏe: {product.health_score}/100
              </span>
            )}
            {product.health_badges?.map((badge, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100">
                {badge}
              </span>
            ))}
            {!product.is_available && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                ⚠️ Hết hàng
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
