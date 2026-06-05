import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { toast } from 'sonner'

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: number
  /** Khi true: không hiện toast "lỗi mạng" (dùng cho dữ liệu public có fallback UI) */
  skipNetworkErrorToast?: boolean
}

/** Cấu hình request mở rộng (dùng khi gọi api.get/post/...) */
export type ApiRequestConfig = AxiosRequestConfig & Pick<CustomAxiosRequestConfig, 'skipNetworkErrorToast'>

type ApiClient = AxiosInstance & {
  get<T = unknown, D = unknown>(url: string, config?: ApiRequestConfig): Promise<AxiosResponse<T, D>>
  post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T, D>>
  put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T, D>>
  patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T, D>>
  delete<T = unknown, D = unknown>(url: string, config?: ApiRequestConfig): Promise<AxiosResponse<T, D>>
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

const isDev = process.env.NODE_ENV === 'development'

if (typeof window !== 'undefined' && isDev) {
  console.log('[API] Backend:', api.defaults.baseURL)
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('HDG-auth-storage')
      const token = raw ? JSON.parse(raw)?.state?.token : null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        if (isDev) console.log('[API] Token attached')
      } else if (isDev) {
        console.warn('[API] No token in localStorage')
      }
    } catch (e) {
      console.error('[API] Error parsing auth token:', e)
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig

    if (config && (error.code === 'ECONNABORTED' || !error.response)) {
      config._retry = config._retry ?? 0

      if (config._retry < 2) {
        config._retry++
        if (isDev) console.warn(`[API] Retry ${config._retry}...`)
        await new Promise((resolve) => setTimeout(resolve, config._retry * 1000))
        return api(config)
      }
    }

    if (!error.response) {
      const silent = (config as CustomAxiosRequestConfig)?.skipNetworkErrorToast
      if (!silent) {
        toast.error('L\u1ed7i k\u1ebft n\u1ed1i m\u1ea1ng (Network Error)', {
          description:
            'Kh\xf4ng th\u1ec3 k\u1ebft n\u1ed1i \u0111\u1ebfn m\xe1y ch\u1ee7. H\xe3y ch\u1eafc ch\u1eafn backend \u0111ang ch\u1ea1y.',
          duration: 5000,
        })
      }
      return Promise.reject(error)
    }

    const status = error.response.status
    const data = error.response.data as { reason?: string; message?: string } | undefined

    if (status === 403 && data?.reason === 'account_disabled' && typeof window !== 'undefined') {
      localStorage.removeItem('HDG-auth-storage')
      const path = window.location.pathname
      const isAdminRoute = path.startsWith('/admin')
      toast.error(data.message || 'Tài khoản không khả dụng.')
      setTimeout(() => {
        window.location.href = isAdminRoute ? '/admin/login' : '/login'
      }, 1200)
      return Promise.reject(error)
    }

    // Đã đăng nhập nhưng không đủ quyền (ví dụ user thường cố mở link admin).
    if (status === 403 && typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path.startsWith('/admin')) {
        toast.error(data?.message || 'Bạn không có quyền truy cập khu vực này.')
        setTimeout(() => {
          window.location.href = '/403'
        }, 800)
      }
    }

    if (status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname
      const isLoginPage = path === '/login' || path === '/register' || path === '/admin/login'
      const isAuthRoute =
        config.url?.includes('/auth/login') || config.url?.includes('/admin/login')

      if (!isAuthRoute && !isLoginPage) {
        localStorage.removeItem('HDG-auth-storage')
        const isAdminRoute = window.location.pathname.startsWith('/admin')
        toast.error('Phi\u00ean \u0111\u0103ng nh\u1eadp \u0111\xe3 h\u1ebft h\u1ea1n.')

        setTimeout(() => {
          window.location.href = isAdminRoute ? '/admin/login' : '/login'
        }, 1500)
      }
    }

    if (status >= 500) {
      toast.error('L\u1ed7i h\u1ec7 th\u1ed1ng', {
        description: `M\xe1y ch\u1ee7 g\u1eb7p s\u1ef1 c\u1ed1 (HTTP ${status}). Vui l\xf2ng th\u1eed l\u1ea1i sau.`,
      })
    }

    return Promise.reject(error)
  }
)

export default api as ApiClient
