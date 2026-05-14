import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:  null,
      token: null,

      setAuth: (user, token) => {
        set({ user, token })
        // Cookie cho middleware: path '/' để mọi route (vd. /profile) đều gửi kèm request.
        const opts = { expires: 7, path: '/', sameSite: 'lax' as const }
        const cookieName = user.role === 'admin' ? 'HDG_token_admin' : 'HDG_token_user'
        Cookies.set(cookieName, token, opts)
        Cookies.set('HDG_role', user.role, opts)
      },

      clearAuth: () => {
        set({ user: null, token: null })
        const p = { path: '/' }
        Cookies.remove('HDG_token_admin', p)
        Cookies.remove('HDG_token_user', p)
        Cookies.remove('HDG_role', p)
      },

      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'HDG-auth-storage',
    }
  )
)
