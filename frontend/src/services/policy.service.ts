import api from './api'
import type { Policy } from '@/types'

export interface PolicyFilters {
  search?: string
  category?: string
  is_active?: boolean
  page?: number
  per_page?: number
}

export interface PolicyPayload {
  title: string
  slug?: string
  icon?: string
  category: string
  content: string
  order?: number
  is_active?: boolean
}

export const policyService = {
  list: async (params?: { search?: string; category?: string }) => {
    const { data } = await api.get<{ success: boolean; data: Policy[] }>('/policies', { params })
    return data
  },

  getBySlug: async (slug: string) => {
    const { data } = await api.get<{ success: boolean; data: Policy }>(`/policies/${slug}`)
    return data
  },

  listAdmin: async (params?: PolicyFilters) => {
    const { data } = await api.get<{
      success: boolean
      data: Policy[]
      meta: { current_page: number; last_page: number; per_page: number; total: number }
    }>('/admin/policies', { params })
    return data
  },

  getAdminById: async (id: number) => {
    const { data } = await api.get<{ success: boolean; data: Policy }>(`/admin/policies/${id}`)
    return data
  },

  create: async (payload: PolicyPayload) => {
    const { data } = await api.post<{ success: boolean; data: Policy; message: string }>('/admin/policies', payload)
    return data
  },

  update: async (id: number, payload: Partial<PolicyPayload>) => {
    const { data } = await api.put<{ success: boolean; data: Policy; message: string }>(`/admin/policies/${id}`, payload)
    return data
  },

  toggle: async (id: number) => {
    const { data } = await api.post<{ success: boolean; data: { is_active: boolean }; message: string }>(`/admin/policies/${id}/toggle`)
    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete<{ success: boolean; message: string }>(`/admin/policies/${id}`)
    return data
  },
}
