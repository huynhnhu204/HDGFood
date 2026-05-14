'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCartStore } from '@/store/useCartStore'

export default function TableSessionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const setTableId = useCartStore((s) => s.setTableId)
  const setTableSessionToken = useCartStore((s) => s.setTableSessionToken)

  useEffect(() => {
    const raw = params?.id
    const id = Number(raw)
    if (Number.isFinite(id) && id > 0) {
      const baseApi = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      fetch(`${baseApi}/tables/${id}/claim-session`, { method: 'POST' })
        .then((res) => res.json())
        .then((json) => {
          const token = json?.data?.session_token || null
          setTableId(id)
          setTableSessionToken(token)
          window.localStorage.setItem('HDG_table_id', String(id))
          if (token) window.localStorage.setItem('HDG_table_session_token', token)
          router.replace(`/?table_id=${id}`)
        })
        .catch(() => router.replace('/'))
      return
    }
    router.replace('/')
  }, [params, router, setTableId, setTableSessionToken])

  return null
}
