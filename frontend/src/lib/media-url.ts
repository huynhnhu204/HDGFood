const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '')

export function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  if (path.startsWith('/storage/http://') || path.startsWith('/storage/https://')) {
    return path.replace('/storage/', '')
  }

  const cleanPath = path.replace(/^\/+/, '')
  return `${API_BASE}/storage/${cleanPath}`
}
