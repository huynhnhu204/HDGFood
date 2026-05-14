import api, { type ApiRequestConfig } from './api'
import type { Category, PaginatedResponse } from '@/types'

export interface CategoryPayload {
  name: string
  parent_id?: number | null
  description?: string
  image?: string
  is_active?: boolean
  sort_order?: number
}

export const categoryService = {
  async getAll(params?: { search?: string; status?: 'active' | 'hidden' | 'all'; per_page?: number; page?: number; position?: string }) {
    try {
      const { status, ...rest } = params ?? {}
      const res = await api.get<PaginatedResponse<Category> | { data: Category[] }>('/admin/categories', {
        params: { ...rest, ...(status && status !== 'all' ? { status } : {}) },
      })
      return res.data
    } catch (error) {
      console.error("[CategoryService] Error fetching categories:", error)
      return { data: [], total: 0, current_page: 1, last_page: 1 }
    }
  },

  async getPublicCategories(params?: { position?: string | number; limit?: number; status?: 'active' }) {
    try {
      const res = await api.get<{ data: Category[] } | Category[]>('/categories', {
        params,
        skipNetworkErrorToast: true,
      } as ApiRequestConfig)
      const body = res.data as any
      if (Array.isArray(body)) return body
      if (Array.isArray(body?.data)) return body.data
      return []
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error)
      console.warn(`[CategoryService] Error fetching public categories: ${detail}`)
      return []
    }
  },

  async create(data: CategoryPayload) {
    const res = await api.post<{ data: Category }>('/admin/categories', data)
    return res.data.data
  },

  async update(id: number, data: Partial<CategoryPayload> & { is_active?: boolean }) {
    const res = await api.put<{ data: Category }>(`/admin/categories/${id}`, data)
    return res.data.data
  },

  async remove(id: number, moveTo?: number) {
    await api.delete(`/admin/categories/${id}`, { data: moveTo ? { move_to: moveTo } : undefined })
  },

  async getById(id: number) {
    const res = await api.get<{ data: Category }>(`/admin/categories/${id}`)
    return res.data.data
  },

  async bulkDelete(ids: number[]) {
    await api.post('/admin/categories/bulk-delete', { ids })
  },

  async toggle(id: number) {
    const res = await api.patch<{ data: Category }>(`/admin/categories/${id}/toggle`)
    return res.data.data
  },

  async reorder(orders: { id: number; sort_order: number }[]) {
    await api.post('/admin/categories/reorder', { orders })
  },
}
