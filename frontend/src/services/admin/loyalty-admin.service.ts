import api from '../api'
import type { LoyaltyReward } from '@/types'

export const loyaltyAdminService = {
  async getRewards(params?: { search?: string; page?: number; per_page?: number }) {
    const res = await api.get('/admin/loyalty-rewards', { params })
    return res.data
  },

  async createReward(payload: Partial<LoyaltyReward>) {
    const res = await api.post<{ data: LoyaltyReward }>('/admin/loyalty-rewards', payload)
    return res.data.data
  },

  async updateReward(id: number, payload: Partial<LoyaltyReward>) {
    const res = await api.put<{ data: LoyaltyReward }>(`/admin/loyalty-rewards/${id}`, payload)
    return res.data.data
  },

  async deleteReward(id: number) {
    await api.delete(`/admin/loyalty-rewards/${id}`)
  },
}
