'use client'

import { useEffect, useState } from 'react'

/**
 * Chỉ render children ở phía client.
 * Dùng để tránh hydration mismatch khi browser extension
 * (LastPass, 1Password...) inject attributes vào DOM trước React.
 */
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <>{children}</>
}
