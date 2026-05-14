import api from './api'
import type { Table } from '@/types'

export const tableService = {
  getAll: async () => {
    const { data } = await api.get<Table[]>('/admin/tables')
    return data
  },

  getById: async (id: number) => {
    const { data } = await api.get<Table>(`/admin/tables/${id}`)
    return data
  },

  create: async (payload: Partial<Table>) => {
    const { data } = await api.post<Table>('/admin/tables', payload)
    return data
  },

  update: async (id: number, payload: Partial<Table>) => {
    const { data } = await api.put<Table>(`/admin/tables/${id}`, payload)
    return data
  },

  delete: async (id: number) => {
    await api.delete(`/admin/tables/${id}`)
  },

  updateStatus: async (id: number, status: string, orderId?: number | null) => {
    const { data } = await api.patch<{ message: string; table: Table }>(`/admin/tables/${id}/status`, {
      status,
      current_order_id: orderId
    })
    return data
  },

  completePayment: async (id: number, paymentMethod: string = 'cod') => {
    const { data } = await api.post<{ message: string; table: Table }>(`/admin/tables/${id}/complete-payment`, {
      payment_method: paymentMethod,
    })
    return data
  },

  addItems: async (id: number, items: Array<{ product_id: number; quantity: number }>) => {
    const { data } = await api.post<{ message: string; table: Table }>(`/admin/tables/${id}/add-items`, {
      items,
    })
    return data
  },

  getCurrentOrder: async (id: number) => {
    const { data } = await api.get<{ data: {
      id: number
      status: string
      total: number
      discount_amount: number
      final_total: number
      items: Array<{
        id: number
        product_id: number
        name: string
        image?: string | null
        quantity: number
        price: number
        subtotal: number
      }>
    } | null }>(`/tables/${id}/current-order`)
    return data.data
  },
}
