'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { productService } from '@/services/product.service'
import type { Product } from '@/types'
import ProductDetailHeader from '../../../../../components/products/detail/ProductDetailHeader'
import ProductDetailTabs from '../../../../../components/products/detail/ProductDetailTabs'
import ProductQuickActions from '../../../../../components/products/detail/ProductQuickActions'

export default function ProductDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [stats, setStats]     = useState<{ total_orders: number; total_revenue: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async (showToast = false) => {
    try {
      const [p, s] = await Promise.all([
        productService.getById(Number(id)),
        productService.getStats(Number(id)),
      ])
      setProduct(p)
      setStats(s)
      setLastUpdated(new Date())
      if (showToast) {
        toast.success('Đã làm mới dữ liệu.')
      }
    } catch { toast.error('Không tải được sản phẩm.') }
    finally { setLoading(false) }
  }

  useEffect(() => { 
    load() 
    
    // Lắng nghe sự kiện product-updated để tự động refresh
    const handleProductUpdate = (e: CustomEvent) => {
      if (e.detail?.productId === Number(id)) {
        load()
      }
    }
    
    window.addEventListener('product-updated', handleProductUpdate as EventListener)
    return () => window.removeEventListener('product-updated', handleProductUpdate as EventListener)
  }, [id])

  const handleDelete = async () => {
    if (!product || !confirm(`Xoá "${product.name}"?`)) return
    try {
      await productService.remove(product.id)
      toast.success('Đã xoá sản phẩm.')
      router.push('/admin/products')
    } catch { toast.error('Xoá thất bại.') }
  }

  const handleClone = async () => {
    if (!product) return
    try {
      const cloned = await productService.clone(product.id)
      toast.success(`Đã clone thành "${cloned.name}".`)
      router.push(`/admin/products/${cloned.id}`)
    } catch { toast.error('Clone thất bại.') }
  }

  const handleQuickUpdate = async (patch: Partial<Pick<Product, 'is_active' | 'is_featured' | 'is_available'>>) => {
    if (!product) return
    try {
      const updated = await productService.quickUpdate(product.id, patch)
      setProduct(updated)
      toast.success('Đã cập nhật.')
    } catch { toast.error('Cập nhật thất bại.') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
      </div>
    )
  }

  if (!product) {
    return <div className="text-center py-32 text-slate-500">Không tìm thấy sản phẩm.</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </button>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      <ProductDetailHeader
        product={product}
        onEdit={() => router.push(`/admin/products/${product.id}/edit`)}
        onDelete={handleDelete}
        onClone={handleClone}
      />

      <ProductQuickActions product={product} onUpdate={handleQuickUpdate} />

      <ProductDetailTabs product={product} stats={stats} />
    </div>
  )
}
