import api from './api'

export interface Contact {
  id: number
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  status: 'pending' | 'processed'
  admin_note?: string
  created_at: string
}

export const contactService = {
  createPublic: async (payload: {
    name: string
    email: string
    phone?: string
    subject?: string
    message: string
    user_id?: number
  }) => {
    const { data } = await api.post('/public/contacts', payload)
    return data
  },

  getAll: async (params: { page?: number; status?: string; search?: string }) => {
    const { data } = await api.get('/admin/contacts', { params })
    return data
  },

  getById: async (id: number) => {
    const { data } = await api.get<Contact>(`/admin/contacts/${id}`)
    return data
  },

  updateStatus: async (id: number, payload: { status: string; admin_note?: string }) => {
    const { data } = await api.patch(`/admin/contacts/${id}/status`, payload)
    return data
  },

  getPendingCount: async () => {
    const { data } = await api.get<{ count: number }>('/admin/contacts/pending-count')
    return data.count
  }
}
