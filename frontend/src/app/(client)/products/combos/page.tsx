import { redirect } from 'next/navigation'

/** Chuẩn URL SEO: /products/combos → cùng nội dung lọc Combo */
export default function ProductsCombosPage() {
  redirect('/products?combo=1')
}
