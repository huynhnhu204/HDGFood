import api from './api'
import type { PaginatedResponse, Product } from '@/types'

export interface ProductPayload {
  category_id: number
  name: string
  description?: string
  long_description?: string
  price: number
  sale_price?: number | null
  stock?: number
  image?: string
  extra_images?: Array<
    | string
    | {
        id?: number
        url: string
        path?: string | null
        alt_text?: string | null
        is_primary?: boolean
        status?: 'active' | 'archived'
        sort_order?: number
      }
  >
  is_active?: boolean
  is_featured?: boolean
  is_available?: boolean
  available_time?: 'all' | 'morning' | 'afternoon' | 'evening'
  internal_note?: string
  stock_note?: string
  nutrition?: { [key: string]: string }
  options?: {
    name: string
    is_required: boolean
    values: { label: string; price_extra: number }[]
  }[]
}

export interface ProductImagePayload {
  id: number
  url: string
  path?: string | null
  alt_text?: string | null
  is_primary?: boolean
  status?: 'active' | 'archived'
  sort_order?: number
}

export const productService = {
  /** GET /api/products — public list */
  async getAll(params?: { 
    category?: number
    search?: string
    page?: number
    sort?: string
    min_price?: number
    max_price?: number
    rating?: number
    province_id?: string
    district_id?: string
    ward_id?: string
  }) {
    const res = await api.get<PaginatedResponse<Product>>('/products', { params })
    return res.data
  },

  /** GET /api/products/{id} — public detail */
  async getById(id: number) {
    const res = await api.get<{ data: Product }>(`/products/${id}`)
    return res.data.data
  },

  /** GET /api/products/{slug} — public detail by slug */
  async getBySlug(slug: string) {
    const res = await api.get<{ data: Product }>(`/products/${slug}`)
    return res.data.data
  },

  /** POST /api/admin/products — admin action */
  async create(data: ProductPayload) {
    const res = await api.post<{ data: Product }>('/admin/products', data)
    return res.data.data
  },

  /** PUT /api/admin/products/{id} — admin action */
  async update(id: number, data: Partial<ProductPayload>) {
    const res = await api.put<{ data: Product }>(`/admin/products/${id}`, data)
    return res.data.data
  },

  /** DELETE /api/admin/products/{id} — admin action */
  async remove(id: number) {
    await api.delete(`/admin/products/${id}`)
  },

  /** POST /api/admin/products/bulk-delete — admin action */
  async bulkDelete(ids: number[]) {
    const res = await api.post<{
      message: string
      blocked?: Array<{ id: number; name: string }>
    }>('/admin/products/bulk-delete', { ids })
    return res.data
  },

  /** POST /api/admin/products/import — admin action */
  async importRows(rows: Array<Record<string, any>>) {
    const res = await api.post('/admin/products/import', { rows })
    return res.data as {
      message: string
      created_count: number
      failed_count: number
      errors: Array<{ row: number; message: string }>
    }
  },

  /** POST /api/admin/products/{id}/clone — admin action */
  async clone(id: number) {
    const res = await api.post<{ data: Product }>(`/admin/products/${id}/clone`)
    return res.data.data
  },

  /** GET /api/admin/products/{id}/stats — admin action */
  async getStats(id: number): Promise<{ total_orders: number; total_revenue: number }> {
    const res = await api.get(`/admin/products/${id}/stats`)
    return res.data
  },

  /** GET /api/admin/products/{id}/inventory-logs — admin action */
  async getInventoryLogs(id: number, page: number = 1) {
    const res = await api.get(`/admin/products/${id}/inventory-logs`, { params: { page } })
    return res.data
  },

  /** POST /api/admin/products/{id}/inventory-logs — admin action */
  async addInventoryLog(id: number, data: { change: number; note: string }) {
    const res = await api.post(`/admin/products/${id}/inventory-logs`, data)
    return res.data
  },

  /** PATCH /admin/products/{id} (Partial update like toggle) */
  async quickUpdate(id: number, data: Partial<Pick<ProductPayload, 'is_active' | 'is_featured' | 'is_available'>>) {
    const res = await api.patch<{ data: Product }>(`/admin/products/${id}`, data)
    return res.data.data
  },

  async getImages(id: number) {
    const res = await api.get<{ data: ProductImagePayload[] }>(`/admin/products/${id}/images`)
    return res.data.data
  },

  async addImages(
    id: number,
    images: Array<{
      url: string
      path?: string | null
      alt_text?: string | null
      is_primary?: boolean
      status?: 'active' | 'archived'
    }>
  ) {
    const res = await api.post<{ data: ProductImagePayload[] }>(`/admin/products/${id}/images`, { images })
    return res.data.data
  },

  async reorderImages(id: number, orders: Array<{ id: number; sort_order: number }>) {
    const res = await api.patch<{ data: ProductImagePayload[] }>(`/admin/products/${id}/images/reorder`, { orders })
    return res.data.data
  },

  async updateImage(
    id: number,
    imageId: number,
    data: Partial<Pick<ProductImagePayload, 'alt_text' | 'is_primary' | 'status' | 'sort_order'>>
  ) {
    const res = await api.patch<{ data: ProductImagePayload }>(`/admin/products/${id}/images/${imageId}`, data)
    return res.data.data
  },

  async removeImage(id: number, imageId: number, mode: 'archive' | 'delete' = 'archive') {
    await api.delete(`/admin/products/${id}/images/${imageId}`, { params: { mode } })
  },
}
