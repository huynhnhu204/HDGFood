'use client'

import { useParams } from 'next/navigation'
import ProductCreateForm from '@/components/products/ProductCreateForm'

export default function ProductEditPage() {
  const params = useParams()
  const id = Number(params.id)
  
  if (!id) return null

  return (
    <div className="max-w-6xl mx-auto">
       <ProductCreateForm productId={id} />
    </div>
  )
}
