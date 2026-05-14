'use client'

import { useState } from 'react'
import {
  Package, TrendingUp, DollarSign, Star, Clock,
  Award, Flame, ShieldCheck, Tag, Image as ImageIcon,
  ChevronRight, Info, BarChart2
} from 'lucide-react'
import type { Product } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
const fmtTime = (t: string) =>
  ({ all: 'Cả ngày', morning: 'Buổi sáng', afternoon: 'Buổi trưa/chiều', evening: 'Buổi tối' }[t] ?? t)

const TABS = [
  { key: 'info',       label: 'Thông tin',     icon: <Info className="w-4 h-4" /> },
  { key: 'price',      label: 'Giá & Kho',     icon: <DollarSign className="w-4 h-4" /> },
  { key: 'nutrition',  label: 'Dinh dưỡng',    icon: <Flame className="w-4 h-4" /> },
  { key: 'options',    label: 'Tuỳ chọn',      icon: <Tag className="w-4 h-4" /> },
  { key: 'images',     label: 'Hình ảnh',      icon: <ImageIcon className="w-4 h-4" /> },
  { key: 'stats',      label: 'Thống kê',      icon: <BarChart2 className="w-4 h-4" /> },
] as const

type TabKey = typeof TABS[number]['key']

interface Props {
  product: Product
  stats: { total_orders: number; total_revenue: number } | null
}

export default function ProductDetailTabs({ product, stats }: Props) {
  const [tab, setTab] = useState<TabKey>('info')

  const discount = product.sale_price && product.price > 0
    ? Math.round((1 - product.sale_price / product.price) * 100)
    : null

  const nutritionEntries = product.nutrition
    ? Object.entries(product.nutrition)
    : []

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              tab === t.key
                ? 'border-[#ed2a2a] text-[#ed2a2a] bg-red-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* ── THÔNG TIN ── */}
        {tab === 'info' && (
          <div className="space-y-1">
            <Row label="Tên sản phẩm" value={<span className="font-semibold text-slate-900">{product.name}</span>} />
            <Row label="Slug / URL" value={
              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                /products/{product.slug}
              </span>
            } />
            <Row label="Danh mục" value={
              product.category
                ? <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{product.category.name}</span>
                : <span className="text-slate-400 italic">Chưa phân loại</span>
            } />
            <Row label="Khung giờ bán" value={
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                {fmtTime(product.available_time)}
              </span>
            } />
            <Row label="Sản phẩm nổi bật" value={
              product.is_featured
                ? <span className="text-yellow-600 font-medium">⭐ Có</span>
                : <span className="text-slate-400">Không</span>
            } />
            <Row label="Đánh giá" value={
              product.rating_avg !== undefined
                ? <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{product.rating_avg}</span>
                    <span className="text-slate-400 text-xs">({product.reviews_count || 0} đánh giá)</span>
                  </span>
                : <span className="text-slate-400 italic">Chưa có</span>
            } />

            {/* Mô tả ngắn */}
            {product.description && (
              <div className="pt-4 border-t border-slate-50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mô tả ngắn</p>
                <div
                  className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {/* Mô tả dài */}
            {product.long_description && (
              <div className="pt-4 border-t border-slate-50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mô tả chi tiết</p>
                <div
                  className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.long_description }}
                />
              </div>
            )}

            {/* Ghi chú nội bộ */}
            {product.internal_note && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 mb-1">📝 Ghi chú nội bộ</p>
                <p className="text-sm text-amber-800">{product.internal_note}</p>
              </div>
            )}
          </div>
        )}

        {/* ── GIÁ & KHO ── */}
        {tab === 'price' && (
          <div className="space-y-1">
            <Row label="Giá gốc" value={
              <span className="text-lg font-bold text-slate-800">{fmt(product.price)}</span>
            } />
            <Row label="Giá sale" value={
              product.sale_price
                ? <span className="text-lg font-bold text-[#ed2a2a]">{fmt(product.sale_price)}</span>
                : <span className="text-slate-400 italic">Không có</span>
            } />
            {discount && (
              <Row label="Mức giảm" value={
                <span className="font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg text-sm">
                  -{fmt(product.price - (product.sale_price ?? 0))} ({discount}%)
                </span>
              } />
            )}
            {product.final_price !== undefined && (
              <Row label="Giá hiệu lực" value={
                <span className="text-lg font-bold text-[#ed2a2a]">{fmt(product.final_price)}</span>
              } />
            )}

            {/* Promotion */}
            {product.active_promotion && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-[#ed2a2a] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-[#ed2a2a]">Đang áp dụng CTKM:</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                    {product.active_promotion.name}
                    <span className="text-[#ed2a2a] ml-2">({product.active_promotion.discount_label})</span>
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 mt-4 space-y-1">
              <Row label="Tồn kho" value={
                product.is_available
                  ? <span className="text-blue-600 font-medium">Luôn có sẵn</span>
                  : <span className={`font-bold text-lg ${product.stock === 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {product.stock} sản phẩm
                    </span>
              } />
              <Row label="Trạng thái" value={
                product.is_available
                  ? <StatusBadge color="blue" text="Luôn có sẵn" />
                  : product.stock === 0
                    ? <StatusBadge color="red" text="Hết hàng" />
                    : product.stock <= 10
                      ? <StatusBadge color="amber" text={`Sắp hết (còn ${product.stock})`} />
                      : <StatusBadge color="green" text={`Còn hàng (${product.stock})`} />
              } />
              {product.sold_count !== undefined && (
                <Row label="Đã bán" value={
                  <span className="font-semibold text-slate-700">{product.sold_count.toLocaleString()} phần</span>
                } />
              )}
            </div>
          </div>
        )}

        {/* ── DINH DƯỠNG ── */}
        {tab === 'nutrition' && (
          <div className="space-y-6">
            {nutritionEntries.length === 0 ? (
              <div className="text-center py-12">
                <Flame className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 italic text-sm">Chưa có thông tin dinh dưỡng.</p>
              </div>
            ) : (
              <>
                {/* Health Score */}
                {product.health_score !== undefined && product.health_score > 0 && (
                  <div className={`p-5 rounded-2xl border-2 ${
                    product.health_score >= 85 ? 'bg-emerald-50 border-emerald-200' :
                    product.health_score >= 70 ? 'bg-blue-50 border-blue-200' :
                    product.health_score >= 50 ? 'bg-amber-50 border-amber-200' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Award className={`w-5 h-5 ${
                          product.health_score >= 85 ? 'text-emerald-600' :
                          product.health_score >= 70 ? 'text-blue-600' :
                          product.health_score >= 50 ? 'text-amber-600' : 'text-slate-500'
                        }`} />
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Điểm sức khỏe</p>
                      </div>
                      <span className={`text-3xl font-black ${
                        product.health_score >= 85 ? 'text-emerald-600' :
                        product.health_score >= 70 ? 'text-blue-600' :
                        product.health_score >= 50 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {product.health_score}<span className="text-base font-bold text-slate-400">/100</span>
                      </span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          product.health_score >= 85 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                          product.health_score >= 70 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
                          product.health_score >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                          'bg-gradient-to-r from-slate-300 to-slate-400'
                        }`}
                        style={{ width: `${product.health_score}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {product.health_score >= 85 ? '🌟 Xuất sắc — Rất lành mạnh' :
                       product.health_score >= 70 ? '✅ Tốt — Dinh dưỡng hợp lý' :
                       product.health_score >= 50 ? '👍 Trung bình' : '⚠️ Thấp — Cần cải thiện'}
                    </p>
                  </div>
                )}

                {/* Health Badges */}
                {product.health_badges && product.health_badges.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Nhãn sức khỏe</p>
                    <div className="flex flex-wrap gap-2">
                      {product.health_badges.map((badge, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm">
                          <Award className="w-3.5 h-3.5 text-[#ed2a2a]" />
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrition Table */}
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Bảng dinh dưỡng</p>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-5 py-3 font-black text-slate-600 text-xs uppercase tracking-wider">Chỉ số</th>
                          <th className="text-right px-5 py-3 font-black text-slate-600 text-xs uppercase tracking-wider">Giá trị</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {nutritionEntries.map(([key, value], i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-slate-700 font-medium capitalize">{key}</td>
                            <td className="px-5 py-3 text-right font-bold text-slate-900">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TUỲ CHỌN ── */}
        {tab === 'options' && (
          <div className="space-y-4">
            {!product.options?.length ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 italic text-sm">Sản phẩm này không có tuỳ chọn.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm text-slate-500 pb-2">
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full font-medium">{product.options.length} nhóm</span>
                  <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full font-medium">
                    {product.options.filter(o => o.is_required).length} bắt buộc
                  </span>
                </div>
                <div className="space-y-3">
                  {product.options.map(opt => (
                    <div key={opt.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <span className="text-sm font-black text-slate-800">{opt.name}</span>
                        {opt.is_required && (
                          <span className="text-xs px-2.5 py-1 bg-red-100 text-red-600 rounded-full font-bold">Bắt buộc</span>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {opt.values.map(val => (
                          <div key={val.id} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                              <span className="text-slate-700">{val.label}</span>
                            </div>
                            <span className={`font-bold ${val.price_extra > 0 ? 'text-[#ed2a2a]' : 'text-slate-400'}`}>
                              {val.price_extra > 0 ? `+${fmt(val.price_extra)}` : 'Miễn phí'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── HÌNH ẢNH ── */}
        {tab === 'images' && (
          <div className="space-y-6">
            {product.image ? (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Ảnh chính</p>
                <div className="relative inline-block group">
                  <img
                    src={product.image} alt={product.name}
                    className="w-72 h-72 object-cover rounded-2xl border shadow-md cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02]"
                    onClick={() => window.open(product.image, '_blank')}
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg font-bold shadow-lg">
                    Ảnh chính
                  </span>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-2xl transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-lg transition-all">
                      Click để xem full
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 italic text-sm">Chưa có ảnh chính.</p>
              </div>
            )}

            {product.images && product.images.length > 0 && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  Ảnh phụ ({product.images.length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {product.images.map((img, i) => (
                    <div key={img.id || i} className="relative group cursor-pointer" onClick={() => window.open(img.url, '_blank')}>
                      <img
                        src={img.url}
                        alt={`${product.name} - ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-xl border shadow-sm hover:opacity-90 transition-all hover:scale-105"
                      />
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-slate-800/70 text-white text-[10px] rounded font-bold">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!product.image && (!product.images || product.images.length === 0) && (
              <div className="text-center py-16">
                <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 italic">Sản phẩm chưa có hình ảnh nào.</p>
              </div>
            )}
          </div>
        )}

        {/* ── THỐNG KÊ ── */}
        {tab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Đơn hàng"
                value={stats ? `${stats.total_orders.toLocaleString('vi-VN')}` : '—'}
                sub="phần đã bán"
                icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                bg="bg-blue-50"
              />
              <StatCard
                label="Doanh thu"
                value={stats ? fmt(stats.total_revenue) : '—'}
                sub="tổng thu về"
                icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
                bg="bg-emerald-50"
              />
              <StatCard
                label="Tồn kho"
                value={product.is_available ? '∞' : String(product.stock)}
                sub={product.is_available ? 'luôn có sẵn' : 'sản phẩm còn'}
                icon={<Package className="w-5 h-5 text-amber-600" />}
                bg="bg-amber-50"
                warning={!product.is_available && product.stock <= 10}
              />
              <StatCard
                label="Đánh giá"
                value={product.rating_avg ? String(product.rating_avg) : '—'}
                sub={`${product.reviews_count || 0} lượt đánh giá`}
                icon={<Star className="w-5 h-5 text-violet-600" />}
                bg="bg-violet-50"
              />
            </div>

            {/* Health Score in stats */}
            {product.health_score !== undefined && product.health_score > 0 && (
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm font-black text-slate-800">Điểm sức khỏe</p>
                  </div>
                  <span className="text-2xl font-black text-emerald-600">{product.health_score}/100</span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-green-500 h-full rounded-full"
                    style={{ width: `${product.health_score}%` }}
                  />
                </div>
                {product.health_badges && product.health_badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {product.health_badges.map((b, i) => (
                      <span key={i} className="text-[10px] font-black px-2 py-1 bg-white border border-emerald-200 text-emerald-700 rounded-lg">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-slate-400">* Chỉ tính các đơn hàng đã hoàn thành.</p>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0">
      <span className="w-40 shrink-0 text-xs font-black text-slate-400 uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-sm text-slate-800 flex-1">{value}</span>
    </div>
  )
}

function StatusBadge({ color, text }: { color: 'green' | 'red' | 'amber' | 'blue'; text: string }) {
  const styles = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red:   'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue:  'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${styles[color]}`}>
      {text}
    </span>
  )
}

function StatCard({ label, value, sub, icon, bg, warning }: {
  label: string; value: string; sub: string
  icon: React.ReactNode; bg: string; warning?: boolean
}) {
  return (
    <div className={`p-5 rounded-2xl border ${warning ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-200'} bg-white`}>
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
    </div>
  )
}
