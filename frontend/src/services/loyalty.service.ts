import api from './api'
import type { LoyaltyReward, LoyaltySummary, LoyaltyTransaction } from '@/types'

export const loyaltyService = {
  async getSummary(): Promise<LoyaltySummary> {
    const res = await api.get<{ data: LoyaltySummary }>('/loyalty/summary')
    return res.data.data
  },

  async getTransactions(page = 1) {
    const res = await api.get<{ data: LoyaltyTransaction[]; current_page: number; last_page: number; total: number }>(
      '/loyalty/transactions',
      { params: { page } }
    )
    return res.data
  },

  async getRewards(): Promise<LoyaltyReward[]> {
    const res = await api.get<{ data: LoyaltyReward[] }>('/loyalty/rewards')
    return res.data.data
  },

  async redeem(rewardCatalogId: number) {
    const res = await api.post('/loyalty/redeem', { reward_catalog_id: rewardCatalogId })
    return res.data
  },
}
