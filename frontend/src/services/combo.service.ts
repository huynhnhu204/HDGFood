import api from './api'
import { Combo, ComboCalculationRequest, ComboCalculation } from '@/types/combo'

export interface ComboListParams {
  search?: string
  page?: number
  per_page?: number
}

export const comboService = {
  /**
   * Get all active combos
   */
  getAll: async (params?: ComboListParams) => {
    const response = await api.get<{ success: boolean; data: Combo[] }>('/combos', { params })
    return response.data
  },

  /**
   * Get single combo detail
   */
  getById: async (id: number) => {
    const response = await api.get<{ success: boolean; data: Combo }>(`/combos/${id}`)
    return response.data
  },

  /**
   * Calculate combo price for specific selections
   */
  calculate: async (data: ComboCalculationRequest) => {
    const response = await api.post<{ success: boolean; data: ComboCalculation }>('/combos/calculate', data)
    return response.data
  },
}