import api, { type ApiRequestConfig } from './api'
import type { Banner } from '@/types'

export const bannerService = {
  /**
   * ADMIN SERVICES
   * Dành cho trang quản lý Dashboard
   */
  
  // Lấy danh sách cho Admin (có phân trang, tìm kiếm)
  getAll: async (params?: any) => {
    const { data } = await api.get('/admin/banners', { params })
    return data
  },

  // Xem chi tiết banner
  getById: async (id: number | string) => {
    const { data } = await api.get<Banner>(`/admin/banners/${id}`)
    return data
  },

  // Tạo mới Banner (Multipart Formdata)
  create: async (formData: FormData) => {
    const { data } = await api.post('/admin/banners', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  // Cập nhật Banner (Dùng POST + _method=PUT vì có file)
  update: async (id: number | string, formData: FormData) => {
    // Đảm bảo Laravel nhận diện đúng method PUT khi gửi bằng FormData
    if (!formData.has('_method')) {
      formData.append('_method', 'PUT')
    }
    const { data } = await api.post(`/admin/banners/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  // Xóa banner
  delete: async (id: number) => {
    const { data } = await api.delete(`/admin/banners/${id}`)
    return data
  },

  // Bật/Tắt trạng thái nhanh
  toggleStatus: async (id: number) => {
    const { data } = await api.patch<{ status: 'active' | 'inactive', message: string }>(`/admin/banners/${id}/toggle`)
    return data
  },

  /**
   * PUBLIC SERVICES 
   * Dành cho website bán hàng công khai
   */

  // Lấy danh sách cho slider/banner tại frontend
  getActive: async (position?: string) => {
    try {
      const { data } = await api.get<Banner[]>('/banners/active', {
        params: { position },
        skipNetworkErrorToast: true,
      } as ApiRequestConfig)
      return data
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error)
      console.warn(`[BannerService] Error fetching banners: ${detail}`)
      return []
    }
  },

  // Ghi nhận lượt click
  incrementClick: async (id: number) => {
    try {
      await api.patch(`/banners/${id}/click`)
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error)
      console.warn(`[BannerService] Click tracking failed: ${detail}`)
    }
  }
}
