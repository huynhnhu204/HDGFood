import api from './api'
import type { User, Order } from '@/types'

export const profileService = {
  // Lấy thông tin profile + thống kê
  async getProfile() {
    const { data } = await api.get<{
      user: User
      stats: { total_orders: number; total_spent: number; wishlist_count: number }
    }>('/profile')
    return data
  },

  // Cập nhật thông tin cá nhân
  async updateProfile(payload: { name: string; email: string; phone?: string; address?: string }) {
    const { data } = await api.put<{ message: string; user: User }>('/profile', payload)
    return data
  },

  async updateAvatar(file: File) {
    const fd = new FormData()
    fd.append('avatar', file)
    const { data } = await api.post<{ message: string; user: User }>('/profile/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  // Đổi mật khẩu
  async changePassword(payload: { current_password: string; password: string; password_confirmation: string }) {
    const { data } = await api.put<{ message: string }>('/profile/password', payload)
    return data
  },

  // Đơn hàng của tôi
  async getOrders(page = 1, perPage = 10) {
    const { data } = await api.get<{
      data: Order[]
      meta: { current_page: number; last_page: number; total: number }
    }>('/profile/orders', { params: { page, per_page: perPage } })
    return data
  },

  async cancelOrder(orderId: number, payload: { cancel_reason?: string; request_only?: boolean }) {
    const { data } = await api.post<{ message: string; data: Order }>(`/orders/${orderId}/cancel`, payload)
    return data
  },

  // Wishlist
  async getWishlist(page = 1) {
    const { data } = await api.get('/profile/wishlist', { params: { page } })
    return data
  },

  async addToWishlist(productId: number) {
    const { data } = await api.post('/profile/wishlist', { product_id: productId })
    return data
  },

  async removeFromWishlist(productId: number) {
    const { data } = await api.delete(`/profile/wishlist/${productId}`)
    return data
  },
}
