'use client'

import type { Order } from '@/types'

// In hóa đơn trực tiếp bằng window.print() với nội dung động
export default function PrintInvoiceButton({ order }: { order: Order }) {
  const handlePrint = () => {
    const items = order.items
      ?.map(
        (item) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.product?.name ?? '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${item.price.toLocaleString('vi-VN')}₫</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${item.subtotal.toLocaleString('vi-VN')}₫</td>
        </tr>`
      )
      .join('') ?? ''

    const html = `
      <html><head><title>Hóa đơn #${order.id}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}h2{color:#c80d0d}table{width:100%;border-collapse:collapse}</style>
      </head><body>
        <h2>HDG Food - Hóa đơn #${order.id}</h2>
        <p><strong>Khách hàng:</strong> ${order.customer_name}</p>
        <p><strong>SĐT:</strong> ${order.customer_phone}</p>
        <p><strong>Ngày đặt:</strong> ${order.created_at}</p>
        <hr/>
        <table>
          <thead><tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Sản phẩm</th>
            <th style="padding:8px;text-align:center">SL</th>
            <th style="padding:8px;text-align:right">Đơn giá</th>
            <th style="padding:8px;text-align:right">Thành tiền</th>
          </tr></thead>
          <tbody>${items}</tbody>
        </table>
        <hr/>
        <p style="text-align:right;font-size:18px"><strong>Tổng cộng: ${order.total_price.toLocaleString('vi-VN')}₫</strong></p>
      </body></html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.print()
  }

  return (
    <button
      onClick={handlePrint}
      title="In hóa đơn"
      className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
      🖨️ In
    </button>
  )
}
