import api from './api'

export const dashboardService = {
  getStats: async (range: string = 'today') => {
    const { data } = await api.get('/admin/dashboard/stats', { params: { range } })
    return data
  }
}
