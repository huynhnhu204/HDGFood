import api from '@/services/api'

export type TrashItemType =
  | 'product'
  | 'category'
  | 'combo'
  | 'promotion'
  | 'voucher'
  | 'banner'
  | 'post'
  | 'post_topic'
  | 'table'
  | 'review'
  | 'policy'
  | 'loyalty_reward'
  | 'menu'
  | 'member'
  | 'product_image'

export interface TrashItem {
  type: TrashItemType
  type_label: string
  id: number
  title: string
  subtitle: string | null
  deleted_at: string | null
  admin_path: string
}

export interface TrashSummary {
  counts: Record<string, number>
  total: number
  types: Array<{ type: string; label: string; admin_path: string }>
}

export const trashService = {
  async summary() {
    const res = await api.get<TrashSummary>('/admin/trash/summary')
    return res.data
  },

  async list(params?: {
    type?: string
    q?: string
    page?: number
    per_page?: number
  }) {
    const res = await api.get<{
      data: TrashItem[]
      meta: { current_page: number; last_page: number; per_page: number; total: number }
    }>('/admin/trash', { params })
    return res.data
  },

  async restore(type: TrashItemType, id: number) {
    const res = await api.post<{ message: string }>(`/admin/trash/${type}/${id}/restore`)
    return res.data
  },

  async purge(type: TrashItemType, id: number) {
    const res = await api.delete<{ message: string }>(`/admin/trash/${type}/${id}`)
    return res.data
  },
}
