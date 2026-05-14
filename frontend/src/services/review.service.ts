import api from './api'

export interface ReviewFilter {
  rating?: number
  has_photo?: boolean
  sort?: 'latest' | 'useful'
  page?: number
  status?: 'pending' | 'approved'
  search?: string
}

export const reviewService = {
  // ── Public APIs ──
  getByProduct: async (productId: number, params: ReviewFilter = {}) => {
    const { data } = await api.get(`/products/${productId}/reviews`, { params })
    return data
  },

  getSummary: async (productId: number) => {
    const { data } = await api.get(`/products/${productId}/reviews/summary`)
    return data
  },

  checkEligibility: async (productId: number) => {
    const { data } = await api.get<{ can_review: boolean; reason?: string }>(`/products/${productId}/review-eligibility`)
    return data
  },

  create: async (payload: {
    product_id: number
    rating: number
    content?: string
    images?: string[]
  }) => {
    const { data } = await api.post('/reviews', payload)
    return data
  },

  submit: async (payload: any) => {
    const { data } = await api.post('/reviews', payload)
    return data
  },

  like: async (reviewId: number) => {
    const { data } = await api.post(`/reviews/${reviewId}/like`)
    return data
  },

  // ── Admin APIs ──
  getAll: async (params: ReviewFilter = {}) => {
    const { data } = await api.get('/admin/reviews', { params })
    return data
  },

  toggleApproval: async (reviewId: number) => {
    const { data } = await api.post(`/admin/reviews/${reviewId}/toggle`)
    return data
  },

  remove: async (reviewId: number) => {
    await api.delete(`/admin/reviews/${reviewId}`)
  },

  getReport: async () => {
    const { data } = await api.get('/admin/reviews/report')
    return data
  },

  submitReply: async (reviewId: number, reply: string) => {
    const { data } = await api.post(`/admin/reviews/${reviewId}/reply`, { reply })
    return data
  }
}
