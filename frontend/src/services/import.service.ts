import api from './api'
import type { ImportReceipt, PaginatedResponse } from '@/types'

export interface ImportItemPayload {
  product_id: number
  quantity: number
  import_price: number
}

export interface ImportPayload {
  supplier?: string
  note?: string
  imported_at?: string
  items: ImportItemPayload[]
}

export interface ImportExcelRowPayload {
  product_id?: number
  product_name?: string
  quantity: number | string
  import_price: number | string
}

export const importService = {
  async getAll(params?: { search?: string; supplier?: string; date_from?: string; date_to?: string; per_page?: number; page?: number }) {
    const res = await api.get<PaginatedResponse<ImportReceipt>>('/admin/inventory/imports', { params })
    return res.data
  },

  async getById(id: number) {
    const res = await api.get<{ data: ImportReceipt }>(`/admin/inventory/imports/${id}`)
    return res.data.data
  },

  async create(data: ImportPayload) {
    const res = await api.post<{ data: ImportReceipt }>('/admin/inventory/imports', data)
    return res.data.data
  },

  async importExcel(data: {
    supplier?: string
    note?: string
    imported_at?: string
    rows: ImportExcelRowPayload[]
  }) {
    const res = await api.post('/admin/inventory/imports/import', data)
    return res.data as {
      message: string
      created: boolean
      invalid_rows: Array<{ row: number; message: string }>
      data?: ImportReceipt
    }
  },

  async remove(id: number) {
    await api.delete(`/admin/inventory/imports/${id}`)
  },
}
