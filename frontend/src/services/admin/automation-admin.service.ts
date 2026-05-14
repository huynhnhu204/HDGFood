import api from '../api'

export const automationAdminService = {
  async getRules() {
    const res = await api.get<{ data: { rule: string; enabled: boolean }[] }>('/admin/automation/rules')
    return res.data.data
  },

  async updateRule(rule: string, enabled: boolean) {
    const res = await api.post('/admin/automation/rules', { rule, enabled })
    return res.data
  },

  async getLogs(params?: { campaign_type?: string; page?: number; per_page?: number }) {
    const res = await api.get('/admin/automation/logs', { params })
    return res.data
  },

  async runNow() {
    const res = await api.post('/admin/automation/run-now')
    return res.data
  },
}
