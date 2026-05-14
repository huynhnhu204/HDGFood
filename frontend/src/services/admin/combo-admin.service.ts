import api from '../api'
import {
  Combo,
  ComboCreateInput,
  ComboUpdateInput,
} from '@/types/combo'

export interface ComboAdminListParams {
  search?: string
  is_active?: boolean
  page?: number
  per_page?: number
}

export interface AddProductPayload {
  product_id: number
  quantity?: number
  price_override?: number | null
}

export interface GroupPayload {
  name: string
  description?: string
  min_required?: number
  max_required?: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export const comboAdminService = {
  /**
   * List all combos (admin)
   */
  getAll: async (params?: ComboAdminListParams) => {
    const response = await api.get<PaginatedResponse<Combo>>('/admin/combos', { params })
    return response.data
  },

  /**
   * Create new combo
   */
  create: async (data: ComboCreateInput) => {
    const response = await api.post<{ success: boolean; data: Combo; message: string }>('/admin/combos', data)
    return response.data
  },

  /**
   * Get combo detail (admin)
   */
  getById: async (id: number) => {
    const response = await api.get<{ success: boolean; data: Combo }>(`/admin/combos/${id}`)
    return response.data
  },

  /**
   * Update combo
   */
  update: async (id: number, data: ComboUpdateInput) => {
    const response = await api.put<{ success: boolean; data: Combo; message: string }>(`/admin/combos/${id}`, data)
    return response.data
  },

  /**
   * Delete combo
   */
  delete: async (id: number) => {
    const response = await api.delete<{ success: boolean; message: string }>(`/admin/combos/${id}`)
    return response.data
  },

  /**
   * Toggle combo active status
   */
  toggle: async (id: number) => {
    const response = await api.post<{ success: boolean; data: { is_active: boolean }; message: string }>(`/admin/combos/${id}/toggle`)
    return response.data
  },

  /**
   * Add group to combo
   */
  addGroup: async (comboId: number, data: GroupPayload) => {
    const response = await api.post<{ success: boolean; data: any; message: string }>(`/admin/combos/${comboId}/groups`, data)
    return response.data
  },

  /**
   * Update group
   */
  updateGroup: async (comboId: number, groupId: number, data: Partial<GroupPayload>) => {
    const response = await api.put<{ success: boolean; data: any; message: string }>(`/admin/combos/${comboId}/groups/${groupId}`, data)
    return response.data
  },

  /**
   * Delete group
   */
  deleteGroup: async (comboId: number, groupId: number) => {
    const response = await api.delete<{ success: boolean; message: string }>(`/admin/combos/${comboId}/groups/${groupId}`)
    return response.data
  },

  /**
   * Add products to group
   */
  addProducts: async (comboId: number, groupId: number, products: AddProductPayload[]) => {
    const response = await api.post<{ success: boolean; data: any[]; message: string }>(`/admin/combos/${comboId}/groups/${groupId}/products`, { products })
    return response.data
  },

  /**
   * Remove product from group
   */
  removeProduct: async (comboId: number, groupId: number, productId: number) => {
    const response = await api.delete<{ success: boolean; message: string }>(`/admin/combos/${comboId}/groups/${groupId}/products/${productId}`)
    return response.data
  },

  /**
   * Seed sample combos
   */
  seed: async () => {
    const response = await api.post<{ success: boolean; message: string; data: Combo[] }>('/admin/combos/seed')
    return response.data
  },
}