import api from './api'
import type { ImportReceipt, PaginatedResponse } from '@/types'

export interface ImportReceiptPayload {
  supplier?: string
  note?: string
  imported_at?: string
  items: {
    product_id: number
    quantity: number
    import_price: number
  }[]
}

export const importReceiptService = {
  // Danh sách phiếu nhập kho — hỗ trợ tìm kiếm, lọc, phân trang
  async list(params?: {
    search?: string
    supplier?: string
    date_from?: string
    date_to?: string
    page?: number
    per_page?: number
  }) {
    const res = await api.get<PaginatedResponse<ImportReceipt>>('/admin/inventory/imports', {
      params,
    })
    return res.data
  },

  // Chi tiết 1 phiếu nhập kho
  async show(id: number) {
    const res = await api.get<{ data: ImportReceipt }>(`/admin/inventory/imports/${id}`)
    return res.data.data
  },

  // Tạo phiếu nhập kho mới
  async create(data: ImportReceiptPayload) {
    const res = await api.post<{ data: ImportReceipt }>('/admin/inventory/imports', data)
    return res.data.data
  },

  // Xóa phiếu nhập kho
  async delete(id: number) {
    await api.delete(`/admin/inventory/imports/${id}`)
  },
}
