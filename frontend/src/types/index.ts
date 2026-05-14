// ── Enums ──────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'serving'
  | 'completed'
  | 'cancelled'

export type UserRole = 'admin' | 'user'
export type UserTier = 'regular' | 'silver' | 'gold' | 'vip'
export type PaymentMethod = 'cod' | 'vnpay' | 'momo' | 'bank'

export const TIER_LABELS: Record<UserTier, string> = {
  regular: 'Thường',
  silver:  'Silver',
  gold:    'Gold',
  vip:     'VIP',
}

export const TIER_DISCOUNTS: Record<UserTier, number> = {
  regular: 0,
  silver:  5,
  gold:    10,
  vip:     15,
}

// Đơn tối thiểu để được áp dụng giảm giá tier
export const TIER_MIN_ORDER = 1_000_000

export const TIER_STYLES: Record<UserTier, string> = {
  regular: 'bg-slate-100 text-slate-600',
  silver:  'bg-slate-200 text-slate-700',
  gold:    'bg-yellow-100 text-yellow-700',
  vip:     'bg-red-100 text-red-700',
}

// ── Models ─────────────────────────────────────────────────────────────────
export interface User {
  id: number
  name: string
  email: string
  /** Email trước khi đóng tài khoản (chỉ có khi đã xóa mềm) */
  deleted_original_email?: string | null
  deleted_at?: string | null
  avatar?: string | null
  phone?: string
  address?: string
  province_code?: string
  ward_code?: string
  role: UserRole
  tier: UserTier
  total_spent: number
  total_orders: number
  loyalty_points?: number
  is_active: boolean
  login_provider?: 'google' | 'password' | 'unknown'
  has_password?: boolean
  has_google?: boolean
  created_at?: string
  orders_count?: number
}

export interface LoyaltySummary {
  earned: number
  redeemed: number
  adjustment: number
  available: number
}

export interface LoyaltyTransaction {
  id: number
  type: 'earn' | 'redeem' | 'adjust'
  points: number
  source: string
  note?: string
  created_at: string
}

export interface LoyaltyReward {
  id: number
  name: string
  description?: string
  points_cost: number
  voucher_amount: number
  min_order_amount: number
  voucher_valid_days: number
  monthly_limit?: number | null
  is_active: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image?: string
  is_active: boolean
  sort_order: number
  parent_id?: number | null
  parent?: { id: number; name: string } | null
  products_count: number
  products?: { id: number; name: string; price: number; is_active: boolean; image?: string; stock: number }[]
}

export interface ProductOptionValue {
  id: number
  label: string
  price_extra: number
}

export interface ProductOption {
  id: number
  name: string
  is_required: boolean
  values: ProductOptionValue[]
}

export interface NutritionField {
  name: string
  value: string
}

export interface ProductImage {
  id: number
  url: string
  path?: string | null
  alt_text?: string | null
  is_primary?: boolean
  status?: 'active' | 'archived'
  sort_order?: number
}

export interface Product {
  id: number
  name: string
  slug: string
  description?: string
  long_description?: string
  price: number
  sale_price?: number | null
  final_price?: number
  cost_price?: number | null
  profit_per_unit?: number
  profit_margin?: number
  stock: number
  sold_count?: number
  image?: string
  images?: ProductImage[]
  extra_images?: Array<string | ProductImage>
  is_active: boolean
  is_featured: boolean
  is_available: boolean
  available_time: 'all' | 'morning' | 'afternoon' | 'evening'
  internal_note?: string
  nutrition?: Record<string, string> | null
  health_score?: number
  health_badges?: string[]
  rating_avg?: number
  reviews_count?: number
  category?: Category
  options?: ProductOption[]
  active_promotion?: {
    id: number
    name: string
    discount_type: string
    discount_value: number
    discount_label: string
  } | null
}

export interface OrderItem {
  id: number
  item_type?: 'product' | 'combo'
  combo_id?: number | null
  quantity: number
  price: number
  price_formatted: string
  cost_price?: number | null
  profit?: number
  subtotal: number
  subtotal_formatted: string
  options_snapshot?: {
    combo_name?: string
    selections?: Array<{ group_id: number; product_ids: number[] }>
    combo_items?: Array<{ product_id: number; name: string; effective_price: number; quantity: number }>
    base_price?: number
    discount_amount?: number
  } | null
  product?: Product
  combo?: { id: number; name: string; image?: string | null } | null
}

export interface Order {
  id: number
  customer_name: string
  customer_phone: string
  table_number?: string
  note?: string
  status: OrderStatus
  status_label: string
  cancel_policy?: {
    can_cancel: boolean
    reason: string
    hotline_required: boolean
    note: string
    countdown_seconds?: number | null
    can_request_manual_cancel?: boolean
  }
  cancel_reason?: string | null
  cancel_reject_reason_code?: string | null
  cancel_reject_reason_label?: string | null
  cancelled_at?: string | null
  cancel_requested_at?: string | null
  is_user_cancelled?: boolean
  /** Đơn từng gắn TK nhưng đã purge — khác khách vãng lai */
  customer_profile_removed?: boolean
  is_guest_order?: boolean
  /** Admin: email khách lúc đặt (để đối chiếu Gmail sau purge) */
  customer_email_snapshot?: string | null
  /** Admin: có user đang hoạt động trùng email snapshot (đăng ký lại cùng Gmail) */
  same_email_active_customer_exists?: boolean
  subtotal: number
  subtotal_formatted: string
  promotion_discount: number
  promotion_discount_formatted: string
  tier_discount: number
  tier_discount_formatted: string
  voucher_discount: number
  voucher_discount_formatted: string
  voucher_code?: string
  payment_method?: PaymentMethod | string
  total_price: number
  total_price_formatted: string
  total_cost?: number
  total_profit?: number
  created_at: string
  updated_at: string
  user?: User
  items?: OrderItem[]
  voucher?: Voucher
}

export interface ImportReceiptItem {
  id: number
  product_id: number
  quantity: number
  import_price: number
  subtotal: number
  product?: { id: number; name: string; image?: string; price: number }
}

export interface ImportReceipt {
  id: number
  code: string
  supplier?: string
  note?: string
  total_amount: number
  imported_at: string
  created_at: string
  user?: User
  items?: ImportReceiptItem[]
}

export type DiscountType = 'percent' | 'amount'
export type PromotionStatus = 'running' | 'expired'
export type VoucherApplyTo = 'all' | 'products'
export type VoucherTierRestriction = 'all' | 'silver' | 'gold' | 'vip'

export interface Promotion {
  id: number
  name: string
  product_id: number
  product?: Product
  discount_type: DiscountType
  discount_value: number
  discount_label: string
  min_order_amount?: number
  start_date: string
  end_date: string
  is_active: boolean
  is_running: boolean
  status: PromotionStatus
  created_at: string
  updated_at: string
}

export interface Voucher {
  id: number
  code: string
  name: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  discount_label: string
  max_discount?: number
  min_order_amount?: number
  apply_to: VoucherApplyTo
  usage_limit?: number
  usage_per_user: number
  used_count: number
  remaining?: number
  start_date: string
  end_date: string
  tier_restriction: VoucherTierRestriction
  is_active: boolean
  is_valid: boolean
  products?: Product[]
  created_at: string
  updated_at: string
}

// ── API Response wrappers ──────────────────────────────────────────────────
export interface PostTopic {
  id: number
  name: string
  slug: string
  description?: string
  status: 'active' | 'inactive'
  meta_title?: string
  meta_description?: string
  image_url?: string
  posts_count: number
  total_views?: number
  latest_posts?: any[]
  created_at: string
  updated_at: string
}

export interface Post {
  id: number
  title: string
  slug: string
  content?: string
  excerpt?: string
  image?: string
  status: 'draft' | 'published'
  is_featured: boolean
  topic_id?: number
  topic?: PostTopic
  view_count: number
  published_at?: string
  created_at: string
  updated_at: string
}

export interface Banner {
  id: number
  title: string
  image_path: string
  mobile_image_path?: string
  image_url?: string
  mobile_image_url?: string
  link_url?: string
  position:
    | 'slider'
    | 'home_center'
    | 'sidebar'
    | 'products'
    | 'combos'
    | 'promotions'
    | 'blog'
    | 'about'
    | 'contact'
    | 'global'
  positions?: Array<
    | 'slider'
    | 'home_center'
    | 'sidebar'
    | 'products'
    | 'combos'
    | 'promotions'
    | 'blog'
    | 'about'
    | 'contact'
    | 'global'
  >
  sort_order: number
  status: 'active' | 'inactive'
  start_date?: string
  end_date?: string
  click_count: number
  created_at: string
  updated_at: string
}

export interface Policy {
  id: number
  title: string
  slug: string
  icon?: string | null
  category: string
  content: string
  order: number
  is_active: boolean
  updated_by?: { id: number; name: string } | null
  updatedBy?: { id: number; name: string } | null
  updated_at: string
  created_at: string
}

// ── Menus ────────────────────────────────────────────────────────────────
export interface MenuItem {
  id: string | number // String for temp frontend IDs
  menu_id?: number
  title: string
  type: 'custom' | 'category' | 'topic' | 'page' | 'post' | 'product' | 'group'
  reference_id?: number | null
  url?: string | null
  icon?: string | null
  parent_id?: string | number | null
  sort_order: number
  is_active?: boolean | number | string
  children?: MenuItem[]
  created_at?: string
  updated_at?: string
}

export interface Menu {
  id: number
  name: string
  position: 'header' | 'footer' | 'mobile' | 'other'
  status?: number
  sort_order?: number
  items?: MenuItem[]
  parentItems?: MenuItem[]
  created_at: string
  updated_at: string
}

export interface MenuResources {
  categories: { id: number; name: string; slug: string }[]
  topics: { id: number; name: string; slug: string }[]
  pages: { id: number; title: string; slug: string }[]
  products: { id: number; name: string; slug: string }[]
  posts: { id: number; title: string; slug: string; topic_slug?: string }[]
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface Table {
  id: number
  name: string
  slug: string
  capacity: number
  area?: string
  status: 'available' | 'occupied' | 'reserved'
  current_order_id?: number | null
  current_order?: {
    id: number
    total?: number
    final_total?: number
    discount_amount?: number
    total_price?: number
    total_price_formatted?: string
    status: OrderStatus
    items?: OrderItem[]
  } | null
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  message: string
  user: User
  token: string
}
