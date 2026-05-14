import api from './api'
import { useAuthStore } from '@/store/authStore'
import type { AuthResponse, User } from '@/types'

export const authService = {
  // Đăng nhập — lưu token + user vào Zustand (→ localStorage tự động)
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password })
    const { user, token } = res.data
    useAuthStore.getState().setAuth(user, token)
    return res.data
  },

  // Đăng nhập Admin — tách biệt endpoint để kiểm tra role chặt chẽ
  async loginAdmin(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/admin/login', { email, password })
    const { user, token } = res.data
    // Vẫn lưu vào cùng một store hoặc bạn có thể tách ra
    // User muốn lưu cookie khác nhau.
    useAuthStore.getState().setAuth(user, token)
    return res.data
  },

  // Đăng nhập bằng Google token (từ Google Identity Services)
  async loginWithGoogle(googleToken: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/google/callback', { token: googleToken })
    const { user, token } = res.data
    useAuthStore.getState().setAuth(user, token)
    return res.data
  },

  // Đăng xuất — xóa token trên server + clear store
  async logout(): Promise<void> {
    try {
      await api.post('/logout')
    } catch (error: any) {
      // Ignore 401/404 errors - token might be expired or invalid
      if (error?.response?.status !== 401 && error?.response?.status !== 404) {
        console.error('Logout error:', error)
      }
    } finally {
      // Always clear local auth state regardless of API response
      useAuthStore.getState().clearAuth()
    }
  },

  // Đăng ký tài khoản mới
  async register(data: any): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data)
    const { user, token } = res.data
    useAuthStore.getState().setAuth(user, token)
    return res.data
  },

  // Quên mật khẩu
  async forgotPassword(email: string): Promise<any> {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  },

  async forgotPasswordOtp(email: string): Promise<any> {
    const res = await api.post('/auth/forgot-password-otp', { email })
    return res.data
  },

  async resetPassword(payload: {
    email: string
    token: string
    password: string
    password_confirmation: string
  }): Promise<any> {
    const res = await api.post('/auth/reset-password', payload)
    return res.data
  },

  async resetPasswordWithOtp(payload: {
    email: string
    otp: string
    password: string
    password_confirmation: string
  }): Promise<any> {
    const res = await api.post('/auth/reset-password-otp', payload)
    return res.data
  },

  async checkEmail(email: string): Promise<boolean> {
    const { data } = await api.post('/auth/check-email', { email })
    return data.exists
  },

  async checkPhone(phone: string): Promise<boolean> {
    const { data } = await api.post('/auth/check-phone', { phone })
    return data.exists
  },

  // Lấy thông tin user hiện tại
  async me(): Promise<User> {
    const res = await api.get<{ data: User }>('/auth/me')
    return res.data.data
  },
}
