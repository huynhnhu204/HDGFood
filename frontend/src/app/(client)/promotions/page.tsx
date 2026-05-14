import { Metadata } from 'next'
import PromotionsContent from './PromotionsContent'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Khuyến mãi món ngon HDG Food - Ưu đãi hấp dẫn nhất',
  description: 'Khám phá đại tiệc ưu đãi tại HDG Food. Hàng trăm món ngon đang giảm giá cực sâu, ưu đãi lên đến 50%. Đặt ngay kẻo lỡ!',
  openGraph: {
    title: 'Khuyến mãi món ngon HDG Food - Ưu đãi hấp dẫn nhất',
    description: 'Đại tiệc ưu đãi - Ăn ngon không lo giá tại HDG Food.',
    images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200'],
  },
}

export default function PromotionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#ed2a2a] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PromotionsContent />
    </Suspense>
  )
}
