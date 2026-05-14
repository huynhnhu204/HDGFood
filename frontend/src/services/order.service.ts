import api from './api'
import type { Order, OrderStatus, PaginatedResponse } from '@/types'

export const orderService = {
  // Danh sách đơn hàng — hỗ trợ lọc status, tìm kiếm, phân trang
  async getAll(params?: {
    status?: OrderStatus | 'all'
    search?: string
    page?: number
    per_page?: number
    cancel_requests?: 0 | 1
  }) {
    const { status, ...rest } = params ?? {}
    const res = await api.get<PaginatedResponse<Order>>('/admin/orders', {
      params: { ...rest, ...(status && status !== 'all' ? { status } : {}) },
    })
    return res.data
  },

  // Chi tiết 1 đơn hàng
  async getById(id: number) {
    const res = await api.get<{ data: Order }>(`/admin/orders/${id}`)
    return res.data.data
  },

  // Cập nhật trạng thái (Admin)
  async updateStatus(id: number, status: OrderStatus, cancelReason?: string) {
    const payload = status === 'cancelled'
      ? { status, cancel_reason: cancelReason ?? null }
      : { status }
    const res = await api.patch<{ data: Order }>(`/admin/orders/${id}/status`, payload)
    return res.data.data
  },

  // Tạo đơn hàng mới (Admin)
  async create(data: {
    customer_name: string
    customer_phone: string
    table_number?: string
    note?: string
    voucher_code?: string
    user_id?: number
    items: { product_id: number; quantity: number }[]
  }) {
    const res = await api.post<{ data: Order }>('/orders', data)
    return res.data.data
  },

  // Sửa thông tin đơn (Admin)
  async update(id: number, data: {
    customer_name?: string
    customer_phone?: string
    table_number?: string | null
    note?: string | null
  }) {
    const res = await api.put<{ data: Order }>(`/admin/orders/${id}`, data)
    return res.data.data
  },

  // Xóa đơn (Admin)
  async remove(id: number) {
    await api.delete(`/admin/orders/${id}`)
  },

  async approveCancelRequest(id: number, adminNote?: string) {
    const res = await api.post<{ data: Order }>(`/admin/orders/${id}/cancel/approve`, {
      admin_note: adminNote ?? null,
    })
    return res.data.data
  },

  async rejectCancelRequest(id: number, rejectReason: string) {
    const res = await api.post<{ data: Order }>(`/admin/orders/${id}/cancel/reject`, {
      reject_reason_code: rejectReason,
    })
    return res.data.data
  },

  async getRejectReasonCatalog(status: OrderStatus) {
    const res = await api.get<{ data: { code: string; label: string }[] }>(
      '/admin/orders/cancel/reject-reasons',
      { params: { status } },
    )
    return res.data.data
  },
}
