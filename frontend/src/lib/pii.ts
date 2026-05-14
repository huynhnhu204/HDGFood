/** Hiển thị email/SĐT an toàn hơn trên UI công khai (sidebar, menu) — form chỉnh sửa vẫn dùng giá trị đầy đủ. */

export function maskEmail(email: string | undefined | null): string {
  if (!email?.trim()) return '—'
  const at = email.indexOf('@')
  if (at <= 0) return '***'
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (!domain) return '***'
  const head = local.slice(0, Math.min(2, local.length))
  const stars = '*'.repeat(Math.min(4, Math.max(1, local.length)))
  return `${head}${stars}@${domain}`
}

export function maskPhone(phone: string | undefined | null): string {
  if (!phone?.trim()) return '—'
  const digits = phone.replace(/\s/g, '')
  if (digits.length <= 4) return '*'.repeat(digits.length)
  return '*'.repeat(Math.min(digits.length - 4, 6)) + digits.slice(-4)
}
