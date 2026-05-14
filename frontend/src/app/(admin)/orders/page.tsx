'use client'

import { useEffect, useState } from 'react'
import { orderService } from '@/services/order.service'
import type { Order, OrderStatus } from '@/types'
import OrderStatusBadge from './components/OrderStatusBadge'
import OrderStatusSelect from './components/OrderStatusSelect'
import PrintInvoiceButton from './components/PrintInvoiceButton'

const STATUS_TABS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Tất cả',       value: 'all' },
  { label: 'Chờ xác nhận',   value: 'pending' },
  { label: 'Đã xác nhận',   value: 'confirmed' },
  { label: 'Đang chế biến', value: 'preparing' },
  { label: 'Sẵn sàng',       value: 'ready' },
  { label: 'Đang phục vụ',  value: 'serving' },
  { label: 'Hoàn thành',     value: 'completed' },
  { label: 'Đã hủy',         value: 'cancelled' },
]

export default function OrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all')
  const [page, setPage]           = useState(1)
  const [lastPage, setLastPage]   = useState(1)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await orderService.getAll({
        status: activeTab !== 'all' ? activeTab : undefined,
        page,
      })
      setOrders(res.data)
      setLastPage(res.meta.last_page)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [activeTab, page])

  const handleStatusChange = async (orderId: number, status: OrderStatus) => {
    await orderService.updateStatus(orderId, status)
    fetchOrders()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Quản lý đơn hàng</h2>

      {/* Tabs lọc trạng thái */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(1) }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-HDG-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bảng đơn hàng */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Mã đơn</th>
              <th className="px-4 py-3 text-left">Khách hàng</th>
              <th className="px-4 py-3 text-left">Tổng tiền</th>
              <th className="px-4 py-3 text-left">Ngày đặt</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Không có đơn hàng</td></tr>
            ) : orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium text-HDG-600">#{order.id}</td>
                <td className="px-4 py-3">{order.customer_name}</td>
                <td className="px-4 py-3 font-medium">
                  {order.total_price.toLocaleString('vi-VN')}đ
                </td>
                <td className="px-4 py-3 text-gray-500">{order.created_at}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <OrderStatusSelect
                      current={order.status}
                      onChange={(s) => handleStatusChange(order.id, s)}
                    />
                    <PrintInvoiceButton order={order} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {lastPage > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${
                page === p ? 'bg-HDG-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}