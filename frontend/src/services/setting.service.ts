import api from './api'

export interface SettingsResponse {
  grouped: Record<string, Record<string, string>>
  data: Record<string, string>
}

export const settingService = {
  getAll: async (): Promise<SettingsResponse> => {
    const { data } = await api.get<SettingsResponse>('/admin/settings')
    return data
  },

  update: async (settings: { key: string; value: string; group: string }[]): Promise<void> => {
    await api.put('/admin/settings', { settings })
  },

  upload: async (key: string, file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('key', key)
    const { data } = await api.post<{ path: string }>('/admin/settings/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.path
  },
}
