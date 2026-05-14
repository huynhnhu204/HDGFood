'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Tag, Package, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { categoryService } from '@/services/category.service'
import type { Category } from '@/types'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function CategoryDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [cat, setCat]     = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    categoryService.getById(Number(id))
      .then(setCat).catch(() => toast.error('Không tải được danh mục.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
    </div>
  )
  if (!cat) return <div className="text-center py-32 text-slate-500">Không tìm thấy danh mục.</div>

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="flex gap-5 p-6">
          {cat.image
            ? <img src={cat.image} alt={cat.name} className="w-24 h-24 rounded-2xl object-cover border shrink-0" />
            : <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0"><Tag className="w-10 h-10 text-slate-300" /></div>
          }
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{cat.name}</h1>
                <p className="text-sm font-mono text-slate-400 mt-0.5">{cat.slug}</p>
                {cat.parent && <p className="text-sm text-slate-500 mt-1">Thuộc: <span className="font-medium">{cat.parent.name}</span></p>}
              </div>
              {cat.is_active
                ? <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Hiển thị
                  </span>
                : <span className="px-3 py-1.5 bg-slate-100 border text-slate-500 rounded-xl text-sm font-medium">🙈 Đang ẩn</span>
              }
            </div>
            {cat.description && <p className="text-sm text-slate-600 mt-3">{cat.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
              <span>📦 {cat.products_count} sản phẩm</span>
              <span>🔢 Thứ tự: {cat.sort_order}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-6 py-3 bg-slate-50 border-t">
          <button onClick={() => router.push(`/admin/categories/${cat.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            <Pencil className="w-4 h-4" /> Sửa danh mục
          </button>
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Sản phẩm trong danh mục</h2>
          <button onClick={() => router.push(`/admin/products?category=${cat.id}`)}
            className="text-sm text-blue-600 hover:underline">Xem tất cả →</button>
        </div>
        {!cat.products?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Package className="w-8 h-8 mb-2" />
            <p className="text-sm">Chưa có sản phẩm nào.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Sản phẩm</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Giá</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Kho</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cat.products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-9 h-9 rounded-lg object-cover border" />
                        : <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Package className="w-4 h-4 text-slate-400" /></div>
                      }
                      <span className="font-medium text-slate-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">{fmt(p.price)}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{p.stock}</td>
                  <td className="px-4 py-3 text-center">
                    {p.is_active
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Đang bán</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Ẩn</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => router.push(`/admin/products/${p.id}`)} className="text-xs text-blue-600 hover:underline">Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
