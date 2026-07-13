'use client'

import type { ComponentType } from 'react'
import { Truck, UtensilsCrossed, User, Gift, MapPin, Navigation } from 'lucide-react'

type OrderMode = 'delivery' | 'dine_in'
type DeliveryType = 'self' | 'other'
type SelfLocationMode = 'saved' | 'other'

interface CheckoutUser {
  name: string
  phone?: string
  address?: string
}

interface CheckoutDeliveryPanelProps {
  tableId: number | null
  orderMode: OrderMode
  deliveryType: DeliveryType
  selfLocationMode: SelfLocationMode
  user: CheckoutUser | null
  onOrderModeChange: (mode: OrderMode) => void
  onDeliveryTypeChange: (type: DeliveryType) => void
  onSelfLocationModeChange: (mode: SelfLocationMode) => void
  onEditProfile?: () => void
}

function Segment({
  active,
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  active: boolean
  onClick: () => void
  icon: ComponentType<{ className?: string }>
  label: string
  sub?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
        active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
          : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active ? 'bg-[#ed2a2a]/10 text-[#ed2a2a]' : 'bg-slate-200/60 text-slate-400'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black uppercase tracking-wide">{label}</span>
        {sub && <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-400">{sub}</span>}
      </span>
    </button>
  )
}

export default function CheckoutDeliveryPanel({
  tableId,
  orderMode,
  deliveryType,
  selfLocationMode,
  user,
  onOrderModeChange,
  onDeliveryTypeChange,
  onSelfLocationModeChange,
  onEditProfile,
}: CheckoutDeliveryPanelProps) {
  const showDelivery = orderMode === 'delivery'

  return (
    <div className="space-y-5">
      {/* Bước 1: Hình thức đơn */}
      {tableId && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hình thức</p>
          <div className="flex gap-1 rounded-2xl bg-slate-100/80 p-1">
            <Segment
              active={orderMode === 'delivery'}
              onClick={() => onOrderModeChange('delivery')}
              icon={Truck}
              label="Giao hàng"
              sub="Tận nơi trong 25km"
            />
            <Segment
              active={orderMode === 'dine_in'}
              onClick={() => onOrderModeChange('dine_in')}
              icon={UtensilsCrossed}
              label={`Bàn #${tableId}`}
              sub="Ăn tại quán"
            />
          </div>
        </div>
      )}

      {/* Bước 2: Người nhận */}
      {showDelivery && user && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Người nhận</p>
          <div className="flex gap-1 rounded-2xl bg-slate-100/80 p-1">
            <Segment
              active={deliveryType === 'self'}
              onClick={() => onDeliveryTypeChange('self')}
              icon={User}
              label="Giao cho tôi"
              sub="Thông tin tài khoản"
            />
            <Segment
              active={deliveryType === 'other'}
              onClick={() => onDeliveryTypeChange('other')}
              icon={Gift}
              label="Đặt hộ"
              sub="Mua tặng người khác"
            />
          </div>
        </div>
      )}

      {/* Thẻ thông tin user */}
      {showDelivery && user && deliveryType === 'self' && (
        <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-200/80">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ed2a2a] text-lg font-black text-white shadow-md shadow-red-200/50">
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-black text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.phone || 'Chưa có SĐT'}</p>
            {user.address && (
              <p className="flex items-start gap-1.5 text-xs text-slate-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ed2a2a]" />
                <span className="line-clamp-2">{user.address}</span>
              </p>
            )}
          </div>
          {onEditProfile && (!user.phone || !user.address) && (
            <button
              type="button"
              onClick={onEditProfile}
              className="shrink-0 text-[10px] font-bold uppercase text-[#ed2a2a] hover:underline"
            >
              Sửa
            </button>
          )}
        </div>
      )}

      {/* Bước 3: Vị trí giao (chỉ giao cho tôi + có địa chỉ lưu) */}
      {showDelivery && user && deliveryType === 'self' && user.address && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vị trí giao</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelfLocationModeChange('saved')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                selfLocationMode === 'saved'
                  ? 'bg-[#ed2a2a] text-white shadow-md shadow-red-200/40'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-[#ed2a2a]/30'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Địa chỉ đã lưu
            </button>
            <button
              type="button"
              onClick={() => onSelfLocationModeChange('other')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                selfLocationMode === 'other'
                  ? 'bg-[#ed2a2a] text-white shadow-md shadow-red-200/40'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-[#ed2a2a]/30'
              }`}
            >
              <Navigation className="h-3.5 w-3.5" />
              Đang ở chỗ khác
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
