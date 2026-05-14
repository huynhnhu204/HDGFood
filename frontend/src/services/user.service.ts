import api from './api'
import type { User, PaginatedResponse, UserTier } from '@/types'

export const userService = {
  async getAll(params?: {
    search?: string
    tier?: UserTier | ''
    status?: 'active' | 'inactive' | ''
    only_trashed?: boolean
    per_page?: number
    page?: number
  }) {
    const res = await api.get<PaginatedResponse<User>>('/admin/users', { params })
    return res.data
  },

  async getById(id: number) {
    const res = await api.get<{ data: User }>(`/admin/users/${id}`)
    return res.data.data
  },

  async create(data: { name: string; email: string; phone?: string; address?: string; password: string }) {
    const res = await api.post<{ data: User }>('/admin/users', data)
    return res.data.data
  },

  async update(id: number, data: Partial<{ name: string; phone: string; address: string; is_active: boolean; tier: UserTier }>) {
    const res = await api.put<{ data: User }>(`/admin/users/${id}`, data)
    return res.data.data
  },

  async remove(id: number) {
    await api.delete(`/admin/users/${id}`)
  },

  async restore(id: number) {
    const res = await api.post<{ data: User; message?: string }>(`/admin/users/${id}/restore`)
    return res.data.data
  },

  async getOrders(id: number, page = 1) {
    const res = await api.get(`/admin/users/${id}/orders`, { params: { page } })
    return res.data
  },

  async recalculateTier(id: number) {
    const res = await api.post<{ data: User }>(`/admin/users/${id}/recalculate-tier`)
    return res.data.data
  },

  async search(q: string) {
    const res = await api.get<{ data: User[] }>('/admin/users/search', { params: { q } })
    return res.data.data
  },
}
