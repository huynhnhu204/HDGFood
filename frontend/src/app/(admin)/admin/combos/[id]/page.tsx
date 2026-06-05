'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Percent, DollarSign, Search, X, Check,
  CalendarDays, Tag, AlertCircle, Package, Grid3X3, Plus, Trash2,
  ChevronDown, Image as ImageIcon, Clock, RefreshCw, Power, PowerOff
} from 'lucide-react'
import { toast } from 'sonner'
import { comboAdminService } from '@/services/admin/combo-admin.service'
import api from '@/services/api'
import type { Product } from '@/types'
import type { Combo } from '@/types/combo'

/* ── Helpers ───────────────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

const toSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const normalizeImageUrl = (raw: string): string => {
  const value = raw.trim()
  if (!value) return ''
  if (value.startsWith('//')) return `https:${value}`
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return value
  return `https://${value}`
}

const isValidImageUrl = (value: string): boolean => {
  if (!value) return true
  if (value.startsWith('/')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function toLocalDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

interface FormErrors {
  name?: string
  discount_value?: string
  start_date?: string
  end_date?: string
  groups?: string
  [key: string]: string | undefined
}

interface GroupForm {
  id?: number
  name: string
  description: string
  min_required: number
  max_required: number
  products: Array<{
    product_id: number
    quantity: number
  }>
}

type PickerTarget = { type: 'core' } | { type: 'group'; index: number } | null

type ApiComboProduct = {
  product_id?: number
  quantity?: number
  product?: { id: number }
}

type ApiComboGroup = {
  id?: number
  name?: string
  description?: string | null
  min_required?: number
  max_required?: number
  products?: ApiComboProduct[]
  comboProducts?: ApiComboProduct[]
  combo_products?: ApiComboProduct[]
}

const extractGroupProducts = (group: ApiComboGroup): Array<{ product_id: number; quantity: number }> => {
  const rawProducts = group.products ?? group.comboProducts ?? group.combo_products ?? []
  return rawProducts
    .map((p) => {
      const productId = Number(p.product_id ?? p.product?.id ?? 0)
      if (!productId) return null
      return {
        product_id: productId,
        quantity: Math.max(1, Number(p.quantity || 1)),
      }
    })
    .filter((item): item is { product_id: number; quantity: number } => item !== null)
}

export default function EditComboPage() {
  const router = useRouter()
  const params = useParams()
  const comboId = Number(params.id)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState<PickerTarget>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [imageUrl, setImageUrl] = useState('')
  const [combo, setCombo] = useState<Combo | null>(null)
  const [coreGroupId, setCoreGroupId] = useState<number | undefined>(undefined)
  const [coreProducts, setCoreProducts] = useState<Array<{ product_id: number; quantity: number }>>([])

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    start_date: '',
    end_date: '',
    is_active: true,
    show_on_homepage: false,
  })

  const [groups, setGroups] = useState<GroupForm[]>([])

  /* ── Load combo data ── */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [comboRes, productsRes] = await Promise.all([
          comboAdminService.getById(comboId),
          api.get<{ data: Product[] }>('/products?per_page=1000')
        ])
        
        const comboData = comboRes.data as Combo & {
          groups?: ApiComboGroup[]
          activeGroups?: ApiComboGroup[]
          active_groups?: ApiComboGroup[]
        }
        const apiGroups: ApiComboGroup[] =
          comboData.groups ?? comboData.activeGroups ?? comboData.active_groups ?? []
        const normalizedGroups = apiGroups.map((g) => ({
          id: Number(g.id || 0),
          name: g.name || '',
          description: g.description || '',
          min_required: Math.max(0, Number(g.min_required || 0)),
          max_required: Math.max(0, Number(g.max_required || 0)),
          products: extractGroupProducts(g),
        }))

        setCombo({
          ...comboData,
          groups: normalizedGroups as Combo['groups'],
        })
        
        // Load products
        setProducts(productsRes.data.data)
        
        // Set form data
        setForm({
          name: comboData.name,
          slug: comboData.slug || '',
          description: comboData.description || '',
          discount_type: comboData.discount_type,
          discount_value: String(comboData.discount_value),
          start_date: comboData.start_date ? toLocalDateTime(new Date(comboData.start_date)) : '',
          end_date: comboData.end_date ? toLocalDateTime(new Date(comboData.end_date)) : '',
          is_active: comboData.is_active,
          show_on_homepage: Boolean(comboData.show_on_homepage),
        })
        
        setImageUrl(comboData.image || '')
        
        // Set groups from combo data: tách nhóm món chính theo đúng bảng
        if (normalizedGroups.length > 0) {
          const coreCandidate = normalizedGroups.find(
            (g) => g.name.trim().toLowerCase() === 'món trong combo'
          ) || normalizedGroups[0]

          setCoreGroupId(coreCandidate?.id)
          setCoreProducts(
            (coreCandidate?.products || []).map((p) => ({
              product_id: p.product_id,
              quantity: Math.max(1, Number(p.quantity || 1)),
            }))
          )

          const optionGroups = normalizedGroups.filter((g) => g.id !== coreCandidate?.id)
          setGroups(optionGroups.map(g => ({
            id: g.id,
            name: g.name,
            description: g.description || '',
            min_required: g.min_required,
            max_required: g.max_required,
            products: g.products.map(p => ({
              product_id: p.product_id,
              quantity: Math.max(1, Number(p.quantity || 1)),
            })),
          })))
        }
      } catch (err) {
        toast.error('Không tải được thông tin combo.')
        router.push('/admin/combos')
      } finally {
        setLoading(false)
      }
    }
    
    if (comboId) {
      loadData()
    }
  }, [comboId])

  /* ── Setter ── */
  const set = useCallback((k: string, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(prev => {
      if (prev[k]) { const n = { ...prev }; delete n[k]; return n }
      return prev
    })
  }, [])

  /* ── Product filtering ── */
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const q = productSearch.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.category?.name?.toLowerCase().includes(q)
    )
  }, [products, productSearch])

  /* ── Group operations ── */
  const addGroup = () => {
    setGroups(prev => [...prev, {
      name: '',
      description: '',
      min_required: 1,
      max_required: 1,
      products: []
    }])
  }

  const updateGroup = (index: number, data: Partial<GroupForm>) => {
    setGroups(prev => prev.map((g, i) => i === index ? { ...g, ...data } : g))
  }

  const removeGroup = async (index: number) => {
    const group = groups[index]
    if (group.id) {
      // Delete from server
      if (!confirm('Xóa nhóm này khỏi combo?')) return
      try {
        await comboAdminService.deleteGroup(comboId, group.id)
        toast.success('Đã xóa nhóm.')
      } catch {
        toast.error('Xóa nhóm thất bại.')
        return
      }
    }
    setGroups(prev => prev.filter((_, i) => i !== index))
  }

  /* ── Toggle product in group ── */
  const toggleProductInGroup = (groupIndex: number, productId: number) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== groupIndex) return g
      const isExist = g.products.some(item => item.product_id === productId)
      if (isExist) {
        return { ...g, products: g.products.filter(item => item.product_id !== productId) }
      }
      return { ...g, products: [...g.products, { product_id: productId, quantity: 1 }] }
    }))
  }

  const updateProductQuantity = (groupIndex: number, productId: number, nextQty: number) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== groupIndex) return g
      return {
        ...g,
        products: g.products.map(item =>
          item.product_id === productId ? { ...item, quantity: Math.max(1, nextQty) } : item
        ),
      }
    }))
  }

  const toggleCoreProduct = (productId: number) => {
    setCoreProducts((prev) => {
      const exists = prev.some((item) => item.product_id === productId)
      if (exists) return prev.filter((item) => item.product_id !== productId)
      return [...prev, { product_id: productId, quantity: 1 }]
    })
  }

  const updateCoreProductQuantity = (productId: number, nextQty: number) => {
    setCoreProducts((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity: Math.max(1, nextQty) } : item
      )
    )
  }

  /* ── Calculate base price preview ── */
  const basePricePreview = useMemo(() => {
    const coreTotal = coreProducts.reduce((sum, item) => {
      const p = products.find(pr => pr.id === item.product_id)
      if (!p) return sum
      return sum + (p.sale_price || p.price) * item.quantity
    }, 0)

    const optionTotal = groups.reduce((sum, g) => {
      return sum + g.products.reduce((groupSum, item) => {
        const p = products.find(pr => pr.id === item.product_id)
        if (!p) return groupSum
        return groupSum + (p.sale_price || p.price) * item.quantity
      }, 0)
    }, 0)
    return coreTotal + optionTotal
  }, [coreProducts, groups, products])

  const discountPreview = useMemo(() => {
    if (!form.discount_value || !basePricePreview) return null
    const val = parseFloat(form.discount_value)
    if (isNaN(val) || val <= 0) return null

    if (form.discount_type === 'percent') {
      if (val > 100) return null
      return Math.round(basePricePreview * val / 100)
    } else {
      return Math.min(val, basePricePreview)
    }
  }, [form.discount_value, form.discount_type, basePricePreview])

  const finalPricePreview = basePricePreview - (discountPreview || 0)

  /* ── Validate ── */
  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên combo.'
    if (coreProducts.length === 0) e.groups = 'Vui lòng thêm ít nhất 1 món trong combo.'
    groups.forEach((g, i) => {
      if (!g.name.trim()) e[`group_${i}_name`] = `Nhóm ${i + 1}: Vui lòng nhập tên nhóm.`
      if (g.products.length === 0) e[`group_${i}_products`] = `Nhóm ${i + 1}: Vui lòng chọn ít nhất 1 sản phẩm.`
      if (g.min_required > g.max_required) e[`group_${i}_min`] = `Nhóm ${i + 1}: Tối thiểu không được lớn hơn tối đa.`
    })
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      e.discount_value = 'Vui lòng nhập giá trị giảm hợp lệ.'
    }
    if (form.discount_type === 'percent' && parseFloat(form.discount_value) > 100) {
      e.discount_value = 'Giảm giá % không được vượt quá 100%.'
    }
    if (form.start_date && form.end_date && new Date(form.start_date) >= new Date(form.end_date)) {
      e.end_date = 'Ngày kết thúc phải sau ngày bắt đầu.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!validate()) { toast.error('Vui lòng kiểm tra lại các trường bắt buộc.'); return }

    setSaving(true)
    try {
      // Update combo basic info
      const normalizedImage = normalizeImageUrl(imageUrl)
      if (!isValidImageUrl(normalizedImage)) {
        toast.error('Link ảnh chưa hợp lệ. Vui lòng dùng URL http/https.')
        setSaving(false)
        return
      }

      await comboAdminService.update(comboId, {
        name: form.name,
        slug: form.slug ? toSlug(form.slug) : undefined,
        description: form.description || undefined,
        image: normalizedImage !== '' ? normalizedImage : null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        is_active: form.is_active,
        show_on_homepage: form.show_on_homepage,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      })
      
      const syncGroupProducts = async (
        groupId: number,
        nextItems: Array<{ product_id: number; quantity: number }>,
        currentItems: Array<{ product_id: number; quantity?: number }>
      ) => {
        const currentMap = new Map<number, number>(
          (currentItems || []).map((p) => [p.product_id, Math.max(1, Number(p.quantity || 1))])
        )
        const nextMap = new Map<number, number>(
          nextItems.map((item) => [item.product_id, Math.max(1, Number(item.quantity || 1))])
        )

        const toAdd = [...nextMap.entries()]
          .filter(([pid]) => !currentMap.has(pid))
          .map(([product_id, quantity]) => ({ product_id, quantity }))
        if (toAdd.length > 0) await comboAdminService.addProducts(comboId, groupId, toAdd)

        const toRemove = [...currentMap.keys()].filter((pid) => !nextMap.has(pid))
        for (const pid of toRemove) {
          try { await comboAdminService.removeProduct(comboId, groupId, pid) } catch {}
        }

        const toUpdateQty = [...nextMap.entries()].filter(([pid, qty]) => {
          const currentQty = currentMap.get(pid)
          return currentQty !== undefined && currentQty !== qty
        })
        for (const [pid, qty] of toUpdateQty) {
          try {
            await comboAdminService.removeProduct(comboId, groupId, pid)
            await comboAdminService.addProducts(comboId, groupId, [{ product_id: pid, quantity: qty }])
          } catch {}
        }
      }

      // Sync core group (món trong combo)
      let ensuredCoreGroupId = coreGroupId
      if (!ensuredCoreGroupId) {
        const coreGroupRes = await comboAdminService.addGroup(comboId, {
          name: 'Món trong combo',
          description: 'Nhóm món mặc định của combo',
          min_required: coreProducts.length,
          max_required: coreProducts.length,
        })
        ensuredCoreGroupId = coreGroupRes.data?.id
        setCoreGroupId(ensuredCoreGroupId)
      } else {
        await comboAdminService.updateGroup(comboId, ensuredCoreGroupId, {
          name: 'Món trong combo',
          description: 'Nhóm món mặc định của combo',
          min_required: coreProducts.length,
          max_required: coreProducts.length,
        })
      }

      if (ensuredCoreGroupId) {
        const currentCoreProducts = combo?.groups?.find((g) => g.id === ensuredCoreGroupId)?.products || []
        await syncGroupProducts(ensuredCoreGroupId, coreProducts, currentCoreProducts)
      }

      // Sync option groups and products
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i]
        if (g.id) {
          // Update existing group
          await comboAdminService.updateGroup(comboId, g.id, {
            name: g.name,
            description: g.description || undefined,
            min_required: g.min_required,
            max_required: g.max_required,
          })
        } else {
          // Create new group
          const groupRes = await comboAdminService.addGroup(comboId, {
            name: g.name,
            description: g.description || undefined,
            min_required: g.min_required,
            max_required: g.max_required,
          })
          g.id = groupRes.data?.id || i + 1
        }
        
        // Update products in option group
        if (g.id) {
          const currentGroup = combo?.groups?.find(cg => cg.id === g.id)
          await syncGroupProducts(g.id, g.products, currentGroup?.products || [])
        }
      }
      
      toast.success('Đã cập nhật combo thành công!')
      router.push('/admin/combos')
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const se: FormErrors = {}
        Object.keys(err.response.data.errors).forEach(k => { se[k] = err.response.data.errors[k][0] })
        setErrors(se)
        toast.error('Dữ liệu không hợp lệ.')
      } else {
        toast.error(err.response?.data?.message || 'Có lỗi xảy ra.')
      }
    } finally {
      setSaving(false)
    }
  }

  /* ── Toggle combo status ── */
  const handleToggle = async () => {
    try {
      await comboAdminService.toggle(comboId)
      toast.success('Đã cập nhật trạng thái.')
      setForm(prev => ({ ...prev, is_active: !prev.is_active }))
    } catch {
      toast.error('Cập nhật thất bại.')
    }
  }

  /* ── Delete combo ── */
  const handleDelete = async () => {
    if (!confirm('Xóa vĩnh viễn combo này? Hành động này không thể hoàn tác.')) return
    try {
      await comboAdminService.delete(comboId)
      toast.success('Đã xóa combo.')
      router.push('/admin/combos')
    } catch {
      toast.error('Xóa thất bại.')
    }
  }

  const inputCls = (field?: string) =>
    `w-full border rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 outline-none bg-slate-50/80 focus:bg-white
     ${field && errors[field] ? 'border-red-300 ring-4 ring-red-50 focus:border-[#ed2a2a]' : 'border-slate-200 focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50'}`

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="flex items-center gap-1.5 mt-1.5 text-[12px] font-bold text-[#ed2a2a]">
        <AlertCircle className="w-3.5 h-3.5" />
        {errors[field]}
      </p>
    ) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-[#ed2a2a]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/combos" className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#ed2a2a] transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Sửa Combo</h1>
            <p className="text-[13px] font-medium text-slate-400 mt-0.5">{combo?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggle} className={`p-2.5 rounded-xl border transition-all shadow-sm ${form.is_active ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
            {form.is_active ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
          </button>
          <button onClick={handleDelete} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 transition-all shadow-sm">
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary text-xs">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 lg:w-[65%] space-y-6">
          {/* Card 1: Thông tin */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
               <Grid3X3 className="w-4.5 h-4.5 text-violet-600" />
               <h2 className="text-[15px] font-black text-slate-800">Thông tin combo</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên combo *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Combo Trưa Văn Phòng" className={inputCls('name')} />
                <FieldError field="name" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Slug (URL)</label>
                <input
                  value={form.slug}
                  onChange={e => set('slug', toSlug(e.target.value))}
                  placeholder="auto-generated"
                  className={inputCls()}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Mô tả ngắn về combo..." className={inputCls()} />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Hình ảnh (URL ngoài)</label>
                <div className="flex gap-3">
                  {imageUrl && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                      <button onClick={() => setImageUrl('')} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      value={imageUrl} 
                      onChange={e => setImageUrl(e.target.value)}
                      onBlur={e => setImageUrl(normalizeImageUrl(e.target.value))}
                      placeholder="https://... (URL ảnh, Cloudinary, Imgur, ...)"
                      className={inputCls()}
                    />
                    <p className="mt-1 text-[11px] text-slate-400 font-medium">
                      Co the dan link anh ben ngoai. Neu thieu https:// he thong se tu bo sung.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Cài đặt giảm giá */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
               <Tag className="w-4.5 h-4.5 text-rose-600" />
               <h2 className="text-[15px] font-black text-slate-800">Cài đặt giảm giá</h2>
            </div>
            <div className="p-6 space-y-5">
               <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => set('discount_type', 'percent')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.discount_type === 'percent' ? 'border-[#ed2a2a] bg-red-50/20' : 'border-slate-100'}`}>
                    <Percent className={`w-5 h-5 ${form.discount_type === 'percent' ? 'text-[#ed2a2a]' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Giảm theo %</span>
                  </button>
                  <button type="button" onClick={() => set('discount_type', 'fixed')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.discount_type === 'fixed' ? 'border-[#ed2a2a] bg-red-50/20' : 'border-slate-100'}`}>
                    <DollarSign className={`w-5 h-5 ${form.discount_type === 'fixed' ? 'text-[#ed2a2a]' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Giảm số tiền</span>
                  </button>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Mức giảm *</label>
                 <input type="number" value={form.discount_value} onChange={e => set('discount_value', e.target.value)} className={inputCls('discount_value')} />
                 <FieldError field="discount_value" />
               </div>
            </div>
          </div>

          {/* Card 3: Thời gian */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
               <CalendarDays className="w-4.5 h-4.5 text-blue-600" />
               <h2 className="text-[15px] font-black text-slate-800">Thời gian áp dụng</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-5">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ngày bắt đầu</label>
                  <input type="datetime-local" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls('start_date')} />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ngày kết thúc</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls('end_date')} />
                  <FieldError field="end_date" />
               </div>
            </div>
          </div>

          {/* Card 4: Món trong combo */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-4.5 h-4.5 text-[#ed2a2a]" />
                <h2 className="text-[15px] font-black text-slate-800">Món trong combo ({coreProducts.length})</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProductPicker({ type: 'core' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-[#ed2a2a] rounded-lg text-xs font-bold border border-red-200 hover:bg-red-100 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm món
              </button>
            </div>
            <div className="p-6 space-y-3">
              <FieldError field="groups" />
              {coreProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">
                  Chưa có món nào trong combo.
                </div>
              ) : (
                coreProducts.map((item) => {
                  const p = products.find((pr) => pr.id === item.product_id)
                  if (!p) return null
                  return (
                    <div key={item.product_id} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-2.5 py-2">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-white border border-red-100 shrink-0">
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</p>
                        <p className="text-[11px] font-semibold text-red-600">{fmt(Number(p.sale_price || p.price || 0))}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-1 py-0.5 text-[11px]">
                        <button type="button" onClick={() => updateCoreProductQuantity(item.product_id, item.quantity - 1)} className="px-1 text-red-700">-</button>
                        <span className="min-w-5 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => updateCoreProductQuantity(item.product_id, item.quantity + 1)} className="px-1 text-red-700">+</button>
                      </div>
                      <button onClick={() => toggleCoreProduct(item.product_id)} className="p-1 hover:bg-red-100 rounded-md transition-colors text-red-700">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Card 5: Option nhóm sản phẩm */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-4.5 h-4.5 text-emerald-600" />
                <h2 className="text-[15px] font-black text-slate-800">Option nhóm ({groups.length})</h2>
              </div>
              <button onClick={addGroup} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-all">
                <Plus className="w-3.5 h-3.5" /> Thêm nhóm
              </button>
            </div>
            <div className="p-6 space-y-4">
              <FieldError field="groups" />
              
              {groups.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Grid3X3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có nhóm nào. Nhấn "Thêm nhóm" để bắt đầu.</p>
                </div>
              ) : (
                groups.map((group, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">Nhóm {index + 1} {group.id ? '(đã tồn tại)' : '(mới)'}</span>
                      <button onClick={() => removeGroup(index)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên nhóm *</label>
                        <input 
                          value={group.name} 
                          onChange={e => updateGroup(index, { name: e.target.value })} 
                          placeholder="VD: Chọn 1 món chính"
                          className={inputCls(`group_${index}_name`)} 
                        />
                        <FieldError field={`group_${index}_name`} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Mô tả</label>
                        <input 
                          value={group.description} 
                          onChange={e => updateGroup(index, { description: e.target.value })} 
                          placeholder="Mô tả nhóm (tùy chọn)"
                          className={inputCls()} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Tối thiểu *</label>
                        <input 
                          type="number" 
                          min="0"
                          value={group.min_required} 
                          onChange={e => updateGroup(index, { min_required: parseInt(e.target.value) || 0 })} 
                          className={inputCls(`group_${index}_min`)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Tối đa *</label>
                        <input 
                          type="number" 
                          min="0"
                          value={group.max_required} 
                          onChange={e => updateGroup(index, { max_required: parseInt(e.target.value) || 0 })} 
                          className={inputCls()} 
                        />
                        <FieldError field={`group_${index}_min`} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Sản phẩm ({group.products.length}) *</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {group.products.map(item => {
                          const pid = item.product_id
                          const p = products.find(pr => pr.id === pid)
                          return p ? (
                            <div key={pid} className="flex items-center gap-2 pl-2 pr-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-xs font-bold">
                              <span>{p.name}</span>
                              <div className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-1 py-0.5 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => updateProductQuantity(index, pid, item.quantity - 1)}
                                  className="px-1 text-emerald-700"
                                >
                                  -
                                </button>
                                <span className="min-w-5 text-center">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateProductQuantity(index, pid, item.quantity + 1)}
                                  className="px-1 text-emerald-700"
                                >
                                  +
                                </button>
                              </div>
                              <button onClick={() => toggleProductInGroup(index, pid)} className="p-1 hover:bg-emerald-100 rounded-md transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : null
                        })}
                        <button 
                          type="button" 
                          onClick={() => setShowProductPicker({ type: 'group', index })} 
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-all"
                        >
                          <ChevronDown className="w-3 h-3" /> Thêm sản phẩm
                        </button>
                      </div>
                      <FieldError field={`group_${index}_products`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-[35%] space-y-6">
           {/* Card: Trạng thái */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
              <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</h3>
              <div className="flex gap-2">
                 <button onClick={() => set('is_active', true)} className={`flex-1 py-3 rounded-xl border-2 text-xs font-black transition-all ${form.is_active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}>KÍCH HOẠT</button>
                 <button onClick={() => set('is_active', false)} className={`flex-1 py-3 rounded-xl border-2 text-xs font-black transition-all ${!form.is_active ? 'border-slate-500 bg-slate-50 text-slate-700' : 'border-slate-100 text-slate-400'}`}>ĐỂ NHÁP</button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Hiển thị ở trang chủ</p>
                  <p className="text-[11px] text-slate-400">Tích để combo xuất hiện tại mục Combo Tiết Kiệm</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('show_on_homepage', !form.show_on_homepage)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.show_on_homepage ? 'bg-[#ed2a2a]' : 'bg-slate-300'}`}
                  aria-label="Toggle show on homepage"
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${form.show_on_homepage ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
           </div>

           {/* Card: Tóm tắt */}
           <div className="bg-[#1e293b] rounded-2xl shadow-xl p-6 text-white space-y-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tóm tắt combo</h3>
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Option nhóm:</span><span className="font-bold">{groups.length}</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Món chính:</span><span className="font-bold">{coreProducts.length} món</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Option items:</span><span className="font-bold">{groups.reduce((sum, g) => sum + g.products.length, 0)} món</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Tổng SL:</span><span className="font-bold">{coreProducts.reduce((s, i) => s + i.quantity, 0) + groups.reduce((sum, g) => sum + g.products.reduce((s, item) => s + item.quantity, 0), 0)}</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Giá gốc:</span><span className="font-bold">{fmt(basePricePreview)}</span></div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Giảm:</span>
                    <span className="font-black text-red-400 text-lg">
                       {form.discount_type === 'percent' ? `-${form.discount_value}%` : `-${fmt(Number(form.discount_value) || 0)}`}
                       {discountPreview ? ` (${fmt(discountPreview)})` : ''}
                    </span>
                 </div>
                 <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                    <span className="font-bold">Giá combo:</span>
                    <span className="text-2xl font-black text-emerald-400">{fmt(finalPricePreview)}</span>
                 </div>
              </div>
              <button 
                onClick={handleSubmit} 
                disabled={saving} 
                className="w-full py-4 bg-[#ed2a2a] hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
              >
                 {saving ? 'Đang xử lý...' : 'Lưu thay đổi'}
              </button>
           </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showProductPicker !== null && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowProductPicker(null)}>
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-black text-slate-800">
                      {showProductPicker.type === 'core'
                        ? 'Chọn món trong combo'
                        : `Chọn sản phẩm cho option ${showProductPicker.index + 1}`}
                    </h3>
                    <button onClick={() => setShowProductPicker(null)} className="p-2 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input autoFocus value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Tìm kiếm sản phẩm..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-[#ed2a2a]" />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Không tìm thấy sản phẩm nào.</p>
                    </div>
                  ) : filteredProducts.map(p => {
                    const isSelected = showProductPicker.type === 'core'
                      ? coreProducts.some((item) => item.product_id === p.id)
                      : (groups[showProductPicker.index]?.products.some(item => item.product_id === p.id) || false)
                    return (
                      <button
                        key={p.id}
                        onClick={() => showProductPicker.type === 'core' ? toggleCoreProduct(p.id) : toggleProductInGroup(showProductPicker.index, p.id)}
                        className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${isSelected ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50 border border-transparent'}`}
                      >
                         <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {p.image && <img src={p.image} className="w-full h-full object-cover" />}
                         </div>
                         <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-slate-800">{p.name}</p>
                            <p className="text-xs font-medium text-slate-400">{fmt(p.sale_price || p.price)}</p>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                         </div>
                      </button>
                    )
                  })}
               </div>
               <div className="p-6 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-400">
                    {showProductPicker.type === 'core'
                      ? coreProducts.length
                      : (groups[showProductPicker.index]?.products.length || 0)} sản phẩm đã chọn
                  </p>
                  <button onClick={() => setShowProductPicker(null)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Hoàn tất</button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
