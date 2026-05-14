import api from './api'
import type { Voucher, PaginatedResponse } from '@/types'

export const voucherService = {
  async getAll(params?: { search?: string; status?: string; page?: number; per_page?: number }) {
    try {
      const res = await api.get<PaginatedResponse<Voucher>>('/admin/vouchers', { params })
      return res.data
    } catch (error) {
      return { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } }
    }
  },
  
  async getPublicVouchers(params?: { status?: string; limit?: number }) {
    try {
      const { limit, ...rest } = params ?? {}
      const res = await api.get<{ data: Voucher[] }>('/vouchers', {
        params: { ...rest, per_page: limit ?? 15 },
      })
      return res.data.data
    } catch (error) {
      console.error("[VoucherService] Error fetching public vouchers:", error)
      return []
    }
  },

  async getById(id: number) {
    const res = await api.get<{ data: Voucher }>(`/admin/vouchers/${id}`)
    return res.data.data
  },

  async create(data: {
    code: string
    name: string
    description?: string
    discount_type: 'percent' | 'amount'
    discount_value: number
    max_discount?: number
    min_order_amount?: number
    apply_to: 'all' | 'products'
    product_ids?: number[]
    usage_limit?: number
    usage_per_user: number
    start_date: string
    end_date: string
    tier_restriction: 'all' | 'silver' | 'gold' | 'vip'
    is_active?: boolean
  }) {
    const res = await api.post<{ data: Voucher }>('/admin/vouchers', data)
    return res.data.data
  },

  async update(id: number, data: Partial<{
    code: string
    name: string
    description?: string
    discount_type: 'percent' | 'amount'
    discount_value: number
    max_discount?: number
    min_order_amount?: number
    apply_to: 'all' | 'products'
    product_ids?: number[]
    usage_limit?: number
    usage_per_user: number
    start_date: string
    end_date: string
    tier_restriction: 'all' | 'silver' | 'gold' | 'vip'
    is_active: boolean
  }>) {
    const res = await api.put<{ data: Voucher }>(`/admin/vouchers/${id}`, data)
    return res.data.data
  },

  async delete(id: number) {
    await api.delete(`/admin/vouchers/${id}`)
  },

  async toggle(id: number) {
    const res = await api.patch<{ data: Voucher }>(`/admin/vouchers/${id}/toggle`)
    return res.data.data
  },

  async bulkDelete(ids: number[]) {
    await api.post('/admin/vouchers/bulk-delete', { ids })
  },

  async seed() {
    const res = await api.post<{ message: string }>('/admin/vouchers/seed')
    return res.data
  },

  async validate(code: string, subtotal: number, productIds?: number[]) {
    const res = await api.post<{ valid: boolean; voucher: Voucher; discount: number }>('/vouchers/validate', {
      code,
      subtotal,
      product_ids: productIds,
    })
    return res.data
  },
}
