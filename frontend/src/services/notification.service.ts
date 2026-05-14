import api from './api'

export interface Notification {
  id: number
  title: string
  content: string
  type: 'order' | 'table' | 'system' | 'voucher'
  link?: string
  is_read: boolean
  created_at: string
}

export const notificationService = {
  getAll: async (page: number = 1) => {
    const { data } = await api.get(`/admin/notifications?page=${page}`)
    return data
  },

  getLatest: async () => {
    const { data } = await api.get<Notification[]>('/admin/notifications/latest')
    return data
  },

  getUnreadCount: async () => {
    const { data } = await api.get<{ count: number }>('/admin/notifications/unread-count')
    return data.count
  },

  markAsRead: async (id: number) => {
    await api.patch(`/admin/notifications/${id}/read`)
  },

  markAllAsRead: async () => {
    await api.post('/admin/notifications/read-all')
  },

  deleteAll: async () => {
    await api.delete('/admin/notifications/delete-all')
  }
}
