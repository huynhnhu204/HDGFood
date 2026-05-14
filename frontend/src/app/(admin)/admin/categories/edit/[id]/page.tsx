'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { categoryService } from '@/services/category.service'
import type { Category } from '@/types'
import CategoryForm from '@/components/categories/CategoryForm'

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    categoryService.getById(Number(id))
      .then(setCategory).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
    </div>
  )
  if (!category) return <div className="text-center py-32 text-slate-500">Không tìm thấy danh mục.</div>

  return <CategoryForm category={category} />
}
