import type { TrashItemType } from '@/services/trash.service'

export const TRASH_TYPE_LABELS: Record<TrashItemType, string> = {
  product: 'Sản phẩm',
  category: 'Danh mục',
  combo: 'Combo',
  promotion: 'Khuyến mãi',
  voucher: 'Voucher',
  banner: 'Banner',
  post: 'Bài viết',
  post_topic: 'Chủ đề bài viết',
  table: 'Bàn',
  review: 'Đánh giá',
  policy: 'Chính sách',
  loyalty_reward: 'Loyalty reward',
  menu: 'Menu',
  member: 'Thành viên',
  product_image: 'Hình ảnh SP',
}

export const TRASH_MODULE_PATHS: Record<TrashItemType, string> = {
  product: '/admin/products',
  category: '/admin/categories',
  combo: '/admin/combos',
  promotion: '/admin/promotions',
  voucher: '/admin/vouchers',
  banner: '/admin/banners',
  post: '/admin/posts',
  post_topic: '/admin/post-topics',
  table: '/admin/tables',
  review: '/admin/reviews',
  policy: '/admin/policies',
  loyalty_reward: '/admin/loyalty-rewards',
  menu: '/admin/menus',
  member: '/admin/members',
  product_image: '/admin/product-images',
}
