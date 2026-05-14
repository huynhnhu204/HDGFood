'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Image as ImageIcon, Info, Loader2, Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'
import ImageUploaderV2 from '@/components/products/ImageUploaderV2'
import api from '@/services/api'
import { productService, type ProductPayload } from '@/services/product.service'
import type { Category, Product } from '@/types'

const EMPTY_FORM: ProductPayload = {
  category_id: 0,
  name: '',
  price: 0,
  image: '',
  extra_images: [],
}

export default function ProductImagesPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductPayload>(EMPTY_FORM)

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId]
  )
  const selectedImageStats = useMemo(() => {
    const images = ((form.extra_images ?? []) as Array<{ status?: 'active' | 'archived' } | string>)
    const normalized = images.map((img) => (typeof img === 'string' ? { status: 'active' as const } : img))
    const active = normalized.filter((img) => img.status !== 'archived').length
    const archived = normalized.filter((img) => img.status === 'archived').length
    return { total: normalized.length, active, archived }
  }, [form.extra_images])
  const selectedImageCount = selectedImageStats.total

  useEffect(() => {
    api.get<{ data: Category[] }>('/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await productService.getAll({
          search: search || undefined,
          category: catFilter || undefined,
          page,
        })
        if (!mounted) return
        setProducts(res.data)
        setLastPage(res.meta?.last_page ?? 1)

        if (!res.data.length) {
          setSelectedId(null)
          setForm(EMPTY_FORM)
          return
        }

        setSelectedId((prev) => {
          const keepCurrent = prev && res.data.some((item) => item.id === prev)
          return keepCurrent ? prev : res.data[0].id
        })
      } catch {
        toast.error('Không tải được danh sách sản phẩm.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [search, catFilter, page])

  useEffect(() => {
    if (!selectedProduct) {
      setForm(EMPTY_FORM)
      return
    }
    setForm((prev) => ({
      ...prev,
      category_id: selectedProduct.category?.id ?? prev.category_id ?? 0,
      name: selectedProduct.name,
      price: Number(selectedProduct.price ?? 0),
      image: selectedProduct.image ?? '',
      extra_images: selectedProduct.images ?? [],
    }))
  }, [selectedProduct])

  const setField = (k: keyof ProductPayload, v: unknown) => {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Quản lý hình ảnh sản phẩm</h1>
            <p className="mt-1 text-sm text-slate-500">
              Chọn sản phẩm, rồi thao tác upload, kéo-thả sắp xếp, đặt ảnh chính, archive hoặc xóa ảnh.
            </p>
          </div>
          <button
            type="button"
            disabled={!selectedProduct}
            onClick={() => selectedProduct && router.push(`/admin/products/${selectedProduct.id}/edit`)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" />
            Mở trang sửa sản phẩm
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng sản phẩm hiển thị</p>
            <p className="mt-1 text-xl font-black text-slate-800">{products.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đang chọn</p>
            <p className="mt-1 truncate text-sm font-bold text-slate-800">{selectedProduct?.name ?? 'Chưa chọn sản phẩm'}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số ảnh hiện có</p>
            <p className="mt-1 text-xl font-black text-slate-800">{selectedImageCount}</p>
            <p className="mt-1 text-xs text-slate-500">
              Active: <span className="font-bold text-emerald-600">{selectedImageStats.active}</span> - Archived:{' '}
              <span className="font-bold text-amber-600">{selectedImageStats.archived}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm xl:col-span-4">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-slate-600">Danh sách sản phẩm</h2>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Nhập tên sản phẩm..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#ed2a2a] focus:ring-2 focus:ring-red-100"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value ? Number(e.target.value) : '')
              setPage(1)
            }}
            className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#ed2a2a] focus:ring-2 focus:ring-red-100"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
              Không có sản phẩm phù hợp.
            </div>
          ) : (
            <div className="max-h-[64vh] space-y-2 overflow-y-auto pr-1">
              {products.map((product) => {
                const active = selectedId === product.id
                const totalImages = product.images?.length ?? 0
                const activeImages = product.images?.filter((img) => img.status !== 'archived').length ?? 0
                const archivedImages = product.images?.filter((img) => img.status === 'archived').length ?? 0
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedId(product.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-[#ed2a2a] bg-red-50'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{product.name}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <p className="truncate text-xs text-slate-500">{product.category?.name ?? 'Chưa phân loại'}</p>
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Đang dùng: {activeImages}
                        </span>
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          Lưu trữ: {archivedImages}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          Tổng: {totalImages}
                        </span>
                      </div>
                    </div>
                    {active && <span className="rounded-lg bg-[#ed2a2a] px-2 py-1 text-[10px] font-bold text-white">Đang chọn</span>}
                  </button>
                )
              })}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="font-semibold text-slate-500">
              Trang {page}/{lastPage}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-8">
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
            <div className="mb-1 inline-flex items-center gap-1 font-bold">
              <Info className="h-3.5 w-3.5" />
              Hướng dẫn nhanh
            </div>
            <p>1) Upload hoặc thêm URL ảnh, 2) Chọn ảnh chính, 3) Kéo-thả để đổi thứ tự, 4) Archive/Xóa khi cần.</p>
          </div>

          {!selectedId ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
              Vui lòng chọn một sản phẩm ở cột trái để quản lý ảnh.
            </div>
          ) : (
            <ImageUploaderV2 form={form} set={setField} productId={selectedId} />
          )}
        </section>
      </div>
    </div>
  )
}
