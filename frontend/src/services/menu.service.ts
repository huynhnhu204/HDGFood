import api, { type ApiRequestConfig } from './api'
import type { Menu, MenuItem, MenuResources } from '@/types'

export const menuService = {
  getAll: async (position?: string) => {
    try {
      const { data } = await api.get<Menu[]>('/menus', {
        params: { position },
        skipNetworkErrorToast: true,
      } as ApiRequestConfig)
      return data
    } catch (error: unknown) {
      // Không dùng console.error(error): Next.js dev bắt AxiosError và bật overlay toàn trang
      const detail = error instanceof Error ? error.message : String(error)
      console.warn(`[MenuService] Error fetching menus: ${detail}`)
      return []
    }
  },

  adminGetAll: async (params?: { position?: string; status?: number; q?: string }) => {
    try {
      const { data } = await api.get<Menu[]>('/admin/menus', { params })
      return data
    } catch (error) {
      console.error("[MenuService] Error fetching admin menus:", error)
      return []
    }
  },

  restore: async (id: number) => {
    const { data } = await api.patch<{ message: string }>(`/admin/menus/${id}/restore`)
    return data
  },

  purge: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/admin/menus/${id}/purge`)
    return data
  },

  toggleStatus: async (id: number) => {
    const { data } = await api.patch<{ message: string; status: number }>(`/admin/menus/${id}/toggle`)
    return data
  },

  getById: async (id: number) => {
    const { data } = await api.get<{ menu: Menu; items: MenuItem[] }>(`/admin/menus/${id}`)
    return data
  },

  create: async (payload: { name: string; position: string; items?: any[] }) => {
    const { data } = await api.post<{ message: string; menu: Menu }>('/admin/menus', payload)
    return data.menu
  },

  update: async (
    id: number,
    payload: { name: string; position: string; status?: 'active' | 'inactive' | 0 | 1 }
  ) => {
    const { data } = await api.put<{ message: string; menu: Menu }>(`/admin/menus/${id}`, payload)
    return data.menu
  },

  delete: async (id: number) => {
    await api.delete(`/admin/menus/${id}`)
  },

  getResources: async () => {
    try {
      const { data } = await api.get<MenuResources>('/admin/menus/resources')
      return data
    } catch (error) {
      console.error("[MenuService] Error fetching menu resources:", error)
      return { categories: [], topics: [], pages: [], products: [], posts: [] } as MenuResources
    }
  },

  syncItems: async (menuId: number, items: Partial<MenuItem>[]) => {
    const body = { items: Array.isArray(items) ? [...items] : [] }
    const { data } = await api.post<{ message: string }>(`/admin/menus/${menuId}/sync`, body)
    return data
  },

  storeWhole: async (payload: { name: string; position: string; items: any[] }) => {
    const { data } = await api.post<{ message: string; menu: Menu }>('/admin/menus/store-whole', payload)
    return data.menu
  }
}
