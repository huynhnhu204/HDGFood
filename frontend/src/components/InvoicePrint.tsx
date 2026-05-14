import { forwardRef } from 'react'
import type { Order } from '@/types'

// Component này được truyền vào react-to-print qua ref
// Toàn bộ nội dung bên trong sẽ được in ra máy in
const InvoicePrint = forwardRef<HTMLDivElement, { order: Order }>(
  ({ order }, ref) => (
    <div ref={ref} className="p-8 max-w-2xl mx-auto font-sans text-slate-900">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black text-red-600 tracking-tight">HDG Food</h1>
          <p className="text-slate-500 text-sm mt-1">Hóa đơn bán hàng</p>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p className="font-semibold text-base">#{order.id}</p>
          <p>{order.created_at}</p>
        </div>
      </div>

      {/* Thông tin khách */}
      <div className="bg-slate-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-400 text-xs uppercase font-semibold mb-0.5">Khách hàng</p>
          <p className="font-semibold">{order.customer_name}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs uppercase font-semibold mb-0.5">Điện thoại</p>
          <p className="font-semibold">{order.customer_phone}</p>
        </div>
        <div className="col-span-2">
          <p className="text-slate-400 text-xs uppercase font-semibold mb-0.5">Ghi chú</p>
          <p>{order.note || '—'}</p>
        </div>
      </div>

      {/* Bảng sản phẩm */}
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-left py-2 font-semibold text-slate-600">Sản phẩm</th>
            <th className="text-center py-2 font-semibold text-slate-600 w-16">SL</th>
            <th className="text-right py-2 font-semibold text-slate-600 w-28">Đơn giá</th>
            <th className="text-right py-2 font-semibold text-slate-600 w-28">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item) => (
            <tr key={item.id} className="border-b border-slate-100">
              <td className="py-2.5">{item.product?.name ?? '—'}</td>
              <td className="py-2.5 text-center">{item.quantity}</td>
              <td className="py-2.5 text-right">{item.price_formatted}</td>
              <td className="py-2.5 text-right font-medium">{item.subtotal_formatted}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tổng tiền */}
      <div className="flex justify-end">
        <div className="w-56">
          <div className="flex justify-between py-2 border-t-2 border-slate-900">
            <span className="font-bold text-base">Tổng cộng</span>
            <span className="font-black text-lg text-red-600">{order.total_price_formatted}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-slate-400 text-xs mt-10 border-t border-slate-100 pt-4">
        Cảm ơn quý khách đã tin tưởng HDG Food — Hotline: 1900 xxxx
      </p>
    </div>
  )
)

InvoicePrint.displayName = 'InvoicePrint'
export default InvoicePrint
