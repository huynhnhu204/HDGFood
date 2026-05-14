'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          prompt: () => void
        }
      }
    }
  }
}

interface Props {
  onSuccess?: () => void
  label?: string
}

export default function GoogleLoginButton({ onSuccess, label = 'Tiếp tục với Google' }: Props) {
  const btnRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [renderKey, setRenderKey] = useState(0)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return

    // Reuse global GIS script to avoid duplicate append/remove race.
    let script = document.querySelector<HTMLScriptElement>('script[data-google-gsi="true"]')
    const handleLoad = () => setScriptLoaded(true)

    if (!script) {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.setAttribute('data-google-gsi', 'true')
      script.addEventListener('load', handleLoad)
      document.head.appendChild(script)
    } else if (window.google) {
      setScriptLoaded(true)
    } else {
      script.addEventListener('load', handleLoad)
    }

    return () => {
      script?.removeEventListener('load', handleLoad)
    }
  }, [clientId])

  useEffect(() => {
    if (!scriptLoaded || !window.google || !btnRef.current || !clientId) return
    const id = window.google?.accounts?.id
    if (!id?.initialize || !id?.renderButton) return

    // Defer một tick để đảm bảo layout đã có width (mobile đôi khi offsetWidth = 0 lúc render).
    const t = window.setTimeout(() => {
      const el = btnRef.current
      if (!el) return

      id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
      })

      const width =
        Math.max(200, Math.floor(el.clientWidth || el.offsetWidth || 0) || 320)

      try {
        // renderButton sẽ tự thay thế nút cũ nếu gọi nhiều lần
        id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          width,
          text: 'continue_with',
          locale: 'vi',
        // Mobile hay bị chặn popup => đổi sang redirect để tránh lỗi GIS_POPUP_BLOCKED
        ux_mode: window.innerWidth < 640 ? 'redirect' : 'popup',
        })
      } catch {
        // Không hard fail để tránh trang bị "lỗi trắng" trên mobile
      }
    }, 0)

    return () => window.clearTimeout(t)
  }, [scriptLoaded, clientId, renderKey])

  // Nếu user xoay màn hình hoặc layout thay đổi, render lại nút theo width mới.
  useEffect(() => {
    if (!scriptLoaded) return
    const onResize = () => setRenderKey((k) => k + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [scriptLoaded])

  const handleCredentialResponse = async (response: { credential: string }) => {
    setLoading(true)
    try {
      const res = await authService.loginWithGoogle(response.credential)
      toast.success(`Chào mừng ${res.user.name}!`)
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.assign('/')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Đăng nhập Google thất bại.')
    } finally {
      setLoading(false)
    }
  }

  if (!clientId) {
    return (
      <div className="w-full py-3.5 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 text-sm cursor-not-allowed opacity-50">
        <GoogleIcon />
        Google OAuth chưa được cấu hình
      </div>
    )
  }

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-10">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-[#ed2a2a] rounded-full animate-spin" />
        </div>
      )}
      {/* Google renders its button here */}
      <div ref={btnRef} className="w-full" style={{ minHeight: 44 }} />
      {/* Fallback button nếu Google script chưa load */}
      {!scriptLoaded && (
        <button
          type="button"
          disabled
          className="w-full py-3.5 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-600 text-sm font-medium bg-white hover:bg-slate-50 transition-colors"
        >
          <GoogleIcon />
          {label}
        </button>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
