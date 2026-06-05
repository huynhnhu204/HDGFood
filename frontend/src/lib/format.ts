/**
 * Định dạng số tiền theo chuẩn Việt Nam (làm tròn, ngăn cách hàng nghìn).
 * Ví dụ: 123456.7 -> "123.457"
 */
export function formatPrice(value?: number | null): string {
  return Math.round(Number(value) || 0).toLocaleString('vi-VN')
}

/**
 * Định dạng số tiền kèm đơn vị đồng.
 * Ví dụ: 123456 -> "123.456₫"
 */
export function formatCurrency(value?: number | null): string {
  return `${formatPrice(value)}₫`
}
