import api from './api'
import type { PostTopic, PaginatedResponse } from '@/types'

export const postTopicService = {
  getAll: async (params?: { search?: string; status?: string; page?: number; per_page?: number }) => {
    try {
      const { data } = await api.get<PaginatedResponse<PostTopic>>('/admin/post-topics', { params })
      return data
    } catch (error) {
      console.error("[PostTopicService] Error fetching topics:", error)
      return { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } } as PaginatedResponse<PostTopic>
    }
  },

  getById: async (id: number) => {
    const { data } = await api.get<PostTopic>(`/admin/post-topics/${id}`)
    return data
  },

  create: async (payload: Partial<PostTopic>) => {
    const { data } = await api.post<PostTopic>('/admin/post-topics', payload)
    return data
  },

  update: async (id: number, payload: Partial<PostTopic>) => {
    const { data } = await api.put<PostTopic>(`/admin/post-topics/${id}`, payload)
    return data
  },

  delete: async (id: number) => {
    const { data } = await api.delete(`/admin/post-topics/${id}`)
    return data
  },

  toggle: async (id: number) => {
    const { data } = await api.patch<PostTopic>(`/admin/post-topics/${id}/toggle`)
    return data
  }
}
