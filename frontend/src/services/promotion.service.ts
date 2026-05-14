import api from './api'
import type { Promotion, PaginatedResponse } from '@/types'

export const promotionService = {
  /** GET /api/admin/promotions — list all with products */
  async getAll(params?: { search?: string; status?: string; page?: number; per_page?: number }) {
    const res = await api.get<PaginatedResponse<Promotion>>('/admin/promotions', { params })
    return res.data
  },

  /** GET /api/admin/promotions/:id */
  async getById(id: number) {
    const res = await api.get<{ data: Promotion }>(`/admin/promotions/${id}`)
    return res.data.data
  },

  /** POST /api/admin/promotions */
  async create(data: {
    name: string
    product_ids: number[]
    discount_type: 'percent' | 'amount'
    discount_value: number
    min_order_amount?: number
    start_date: string
    end_date: string
    is_active?: boolean
  }) {
    const res = await api.post<{ data: Promotion }>('/admin/promotions', data)
    return res.data.data
  },

  /** PUT /api/admin/promotions/:id */
  async update(id: number, data: Partial<{
    name: string
    product_ids: number[]
    discount_type: 'percent' | 'amount'
    discount_value: number
    min_order_amount?: number
    start_date: string
    end_date: string
    is_active: boolean
  }>) {
    const res = await api.put<{ data: Promotion }>(`/admin/promotions/${id}`, data)
    return res.data.data
  },

  /** DELETE /api/admin/promotions/:id */
  async delete(id: number) {
    await api.delete(`/admin/promotions/${id}`)
  },

  /** PATCH /api/admin/promotions/:id/toggle */
  async toggle(id: number) {
    const res = await api.patch<{ data: Promotion }>(`/admin/promotions/${id}/toggle`)
    return res.data.data
  },

  /** POST /api/admin/promotions/bulk-delete */
  async bulkDelete(ids: number[]) {
    await api.post('/admin/promotions/bulk-delete', { ids })
  },
}
