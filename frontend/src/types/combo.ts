// Combo Types

export interface Combo {
  id: number
  name: string
  slug: string
  description: string | null
  image: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number
  base_price: number
  final_price: number
  is_active: boolean
  show_on_homepage?: boolean
  start_date: string | null
  end_date: string | null
  is_running?: boolean
  total_base_price?: number
  total_discount?: number
  groups: ComboGroup[]
  /** Tùy API: dùng cho sắp xếp bán chạy */
  sold_count?: number
  created_at: string
  updated_at: string
}

export interface ComboGroup {
  id: number
  combo_id: number
  name: string
  description: string | null
  min_required: number
  max_required: number
  sort_order: number
  products: ComboProduct[]
}

export interface ComboProduct {
  id: number
  combo_group_id: number
  product_id: number
  name: string
  slug: string
  image: string
  price: number
  final_price: number
  quantity?: number
  price_override: number | null
  effective_price: number
}

export interface ComboSelection {
  group_id: number
  product_ids: number[]
}

export interface ComboCalculationRequest {
  combo_id: number
  selections: ComboSelection[]
}

export interface ComboCalculationItem {
  product_id: number
  name: string
  effective_price: number
  quantity: number
}

export interface ComboCalculation {
  combo_id: number
  items: ComboCalculationItem[]
  base_price: number
  discount_amount: number
  final_price: number
}

export interface ComboCreateInput {
  name: string
  slug?: string
  description?: string
  image?: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  is_active?: boolean
  show_on_homepage?: boolean
  start_date?: string
  end_date?: string
  groups?: {
    name: string
    description?: string
    min_required: number
    max_required: number
  }[]
}

export interface ComboUpdateInput {
  name?: string
  slug?: string
  description?: string
  image?: string
  discount_type?: 'percent' | 'fixed'
  discount_value?: number
  is_active?: boolean
  show_on_homepage?: boolean
  start_date?: string
  end_date?: string
}

// Cart combo item type
export interface CartComboItem {
  comboId: number
  comboName: string
  comboImage: string
  selections: ComboSelection[]
  items: ComboCalculationItem[]
  basePrice: number
  discountAmount: number
  finalPrice: number
}