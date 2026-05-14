import api from './api'

/* ── Types ── */
export interface Post {
  id: number
  title: string
  slug: string
  content?: string
  thumbnail?: string
  topic_id?: number | null
  user_id?: number | null
  status: 'draft' | 'published'
  view_count: number
  is_featured: boolean
  meta_title?: string
  meta_description?: string
  published_at?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  topic?: { id: number; name: string; slug: string } | null
  author?: { id: number; name: string; email: string } | null
}

export interface PostPaginatedResponse {
  data: Post[]
  meta: {
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
}

export interface PostFilters {
  search?: string
  topic_id?: number | string
  status?: 'draft' | 'published' | 'all'
  page?: number
  per_page?: number
}

/* ── Service ── */
export const postService = {
  getAll: async (filters?: PostFilters): Promise<PostPaginatedResponse> => {
    try {
      const params: Record<string, any> = { ...filters }
      if (params.status === 'all') delete params.status
      const { data } = await api.get<PostPaginatedResponse>('/admin/posts', { params })
      return data
    } catch (error) {
      console.error("[PostService] Error fetching posts:", error)
      return { 
        data: [], 
        meta: { current_page: 1, last_page: 1, total: 0, per_page: 10 } 
      }
    }
  },

  getById: async (id: number): Promise<Post> => {
    const { data } = await api.get<Post>(`/admin/posts/${id}`)
    return data
  },

  create: async (payload: FormData): Promise<Post> => {
    const { data } = await api.post<Post>('/admin/posts', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  update: async (id: number, payload: FormData): Promise<Post> => {
    const { data } = await api.post<Post>(`/admin/posts/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/posts/${id}`)
  },

  restore: async (id: number): Promise<Post> => {
    const { data } = await api.patch<Post>(`/admin/posts/${id}/restore`)
    return data
  },

  publish: async (id: number): Promise<Post> => {
    const { data } = await api.patch<Post>(`/admin/posts/${id}/publish`)
    return data
  },

  toggleFeatured: async (id: number): Promise<Post> => {
    const { data } = await api.patch<Post>(`/admin/posts/${id}/toggle-featured`)
    return data
  },
}
