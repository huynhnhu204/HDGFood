'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, X, RefreshCw, Package, ImageIcon, Tag, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { productService, type ProductPayload } from '@/services/product.service'
import api from '@/services/api'
import type { Category } from '@/types'
import NutritionConfig, { type NutritionData } from '@/components/products/NutritionConfig'
import ImageUploaderV2 from '@/components/products/ImageUploaderV2'

function slugify(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
}

const EMPTY_OPTION = () => ({ name: '', is_required: false, values: [{ label: '', price_extra: 0 }] })

export default function CreateProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [autoSlug, setAutoSlug] = useState(true)
  const [slug, setSlug] = useState('')
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set([0]))

  const [form, setForm] = useState<ProductPayload>({
    category_id: 0,
    name: '',
    description: '',
    price: 0,
    stock: 0,
    image: '',
    extra_images: [],
    is_active: true,
    is_featured: false,
    is_available: true,
    available_time: 'all',
    options: [],
    nutrition: {},
  })

  useEffect(() => {
    api.get<{ data: Category[] }>('/categories').then(r => setCategories(r.data.data)).catch(() => {})
  }, [])

  const set = useCallback((key: keyof ProductPayload, val: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      if (key === 'name' && autoSlug) setSlug(slugify(val))
      return next
    })
  }, [autoSlug])

  const validate = () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên sản phẩm'); return false }
    if (!form.category_id) { toast.error('Vui lòng chọn danh mục'); return false }
    if (!form.price || form.price <= 0) { toast.error('Giá phải lớn hơn 0'); return false }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = { ...form, slug: slug || undefined }
      const created = await productService.create(payload)
      toast.success('Tạo sản phẩm thành công! Hãy nhập kho để có hàng.')
      router.push(`/admin/inventory/imports/create`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setSaving(false) }
  }

  const addOption = () => {
    const newOpts = [...(form.options ?? []), EMPTY_OPTION()]
    set('options', newOpts)
    setExpandedOptions(prev => new Set([...prev, newOpts.length - 1]))
  }

  const removeOption = (i: number) => {
    set('options', (form.options ?? []).filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, key: string, val: any) => {
    const opts = [...(form.options ?? [])]
    ;(opts[i] as any)[key] = val
    set('options', opts)
  }

  const addValue = (oi: number) => {
    const opts = [...(form.options ?? [])]
    opts[oi].values.push({ label: '', price_extra: 0 })
    set('options', opts)
  }

  const removeValue = (oi: number, vi: number) => {
    const opts = [...(form.options ?? [])]
    opts[oi].values = opts[oi].values.filter((_, i) => i !== vi)
    set('options', opts)
  }

  const updateValue = (oi: number, vi: number, key: string, val: any) => {
    const opts = [...(form.options ?? [])]
    ;(opts[oi].values[vi] as any)[key] = val
    set('options', opts)
  }

  const inp = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ed2a2a] focus:ring-2 focus:ring-red-50 bg-white transition-all'

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800">Thêm sản phẩm mới</h1>
            <p className="text-xs text-slate-400 mt-0.5">Điền đầy đủ thông tin để tạo sản phẩm</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ed2a2a] text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-60 transition-colors shadow-lg shadow-red-500/20">
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Tạo sản phẩm'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Info */}
        <div className="lg:col-span-2 space-y-5">

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-blue-500" />
              <h2 className="font-bold text-slate-700 text-sm">Thông tin cơ bản</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên sản phẩm *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="VD: Phở bò tái chín..." className={inp} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Danh mục *</label>
                  <select value={form.category_id} onChange={e => set('category_id', Number(e.target.value))} className={inp}>
                    <option value={0}>-- Chọn danh mục --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Slug URL
                    <button type="button" onClick={() => setAutoSlug(!autoSlug)}
                      className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${autoSlug ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {autoSlug ? 'Tự động' : 'Thủ công'}
                    </button>
                  </label>
                  <div className="flex gap-2">
                    <input value={slug} readOnly={autoSlug} onChange={e => setSlug(e.target.value)}
                      className={`${inp} ${autoSlug ? 'bg-slate-50 text-slate-400' : ''}`}
                      placeholder="ten-san-pham" />
                    <button onClick={() => { setSlug(slugify(form.name)); setAutoSlug(true) }}
                      className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
                      <RefreshCw className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Mô tả ngắn</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} placeholder="Mô tả ngắn gọn về sản phẩm..." className={inp} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Mô tả chi tiết
                  <span className="ml-2 text-[10px] font-normal text-slate-400">Hiển thị ở "Sản phẩm đặc sắc" · Hỗ trợ HTML</span>
                </label>
                <textarea value={(form as any).long_description ?? ''} onChange={e => set('long_description' as any, e.target.value)}
                  rows={6} placeholder="Nhập mô tả chi tiết, nguyên liệu, cách chế biến..." className={inp} />
              </div>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-emerald-500" />
              <h2 className="font-bold text-slate-700 text-sm">Giá & Tồn kho</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Giá bán (đ) *</label>
                <input type="number" value={form.price || ''} onChange={e => set('price', Number(e.target.value))}
                  placeholder="0" className={inp} min={0} />
              </div>
            </div>
            {form.price > 0 && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-700 font-medium">
                  Giá hiển thị: <span className="font-black">{form.price.toLocaleString('vi-VN')}đ</span>
                </p>
              </div>
            )}
            {/* Flow hint */}
            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5">
              <span className="text-base shrink-0">📦</span>
              <div>
                <p className="text-xs font-bold text-amber-800">Tồn kho được quản lý qua Phiếu nhập kho</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Sau khi tạo sản phẩm → vào <span className="font-bold">Nhập kho</span> để thêm số lượng thực tế và giá vốn.
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-500" />
                <h2 className="font-bold text-slate-700 text-sm">Tùy chọn & Topping</h2>
              </div>
              <span className="text-xs text-slate-400">{(form.options ?? []).length} nhóm</span>
            </div>
            <div className="space-y-3">
              {(form.options ?? []).map((opt, oi) => (
                <div key={oi} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Option Header */}
                  <div className="flex items-center gap-2 p-3 bg-slate-50">
                    <input value={opt.name} onChange={e => updateOption(oi, 'name', e.target.value)}
                      placeholder="Tên nhóm (VD: Size, Topping...)"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-[#ed2a2a]" />
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={opt.is_required} onChange={e => updateOption(oi, 'is_required', e.target.checked)}
                        className="accent-[#ed2a2a]" />
                      Bắt buộc
                    </label>
                    <button onClick={() => setExpandedOptions(prev => {
                      const s = new Set(prev); s.has(oi) ? s.delete(oi) : s.add(oi); return s
                    })} className="p-1 text-slate-400 hover:text-slate-600">
                      {expandedOptions.has(oi) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => removeOption(oi)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Option Values */}
                  {expandedOptions.has(oi) && (
                    <div className="p-3 space-y-2">
                      {opt.values.map((v, vi) => (
                        <div key={vi} className="flex gap-2 items-center">
                          <input value={v.label} onChange={e => updateValue(oi, vi, 'label', e.target.value)}
                            placeholder="Tên giá trị (VD: Nhỏ, Vừa, Lớn)"
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#ed2a2a]" />
                          <div className="relative">
                            <input type="number" value={v.price_extra || ''} onChange={e => updateValue(oi, vi, 'price_extra', Number(e.target.value))}
                              placeholder="0" min={0}
                              className="w-28 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#ed2a2a]" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">+đ</span>
                          </div>
                          <button onClick={() => removeValue(oi, vi)} className="p-1 text-slate-300 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addValue(oi)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1">
                        <Plus className="w-3.5 h-3.5" /> Thêm giá trị
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addOption}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:border-[#ed2a2a] hover:text-[#ed2a2a] transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Thêm nhóm tùy chọn
              </button>
            </div>
          </div>

          {/* Nutrition */}
          <NutritionConfig
            value={(form.nutrition as NutritionData) ?? {}}
            onChange={data => set('nutrition', data)}
          />
        </div>

        {/* Right: Image & Settings */}
        <div className="space-y-5">
          {/* Image */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-pink-500" />
              <h2 className="font-bold text-slate-700 text-sm">Hình ảnh</h2>
            </div>
            <ImageUploaderV2 form={form} set={set} />
          </div>

          {/* Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-slate-700 text-sm">Cài đặt</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: 'is_active', label: 'Mở bán công khai', desc: 'Hiển thị cho khách hàng' },
                { key: 'is_featured', label: 'Sản phẩm nổi bật', desc: 'Hiển thị ở trang chủ' },
                { key: 'is_available', label: 'Còn hàng', desc: 'Khách có thể đặt món' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                  <div onClick={() => set(key as keyof ProductPayload, !(form as any)[key])}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${(form as any)[key] ? 'bg-[#ed2a2a]' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form as any)[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              ))}

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-600 mb-2">Thời gian bán</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'all', label: 'Cả ngày' },
                    { value: 'morning', label: 'Sáng' },
                    { value: 'afternoon', label: 'Chiều' },
                    { value: 'evening', label: 'Tối' },
                  ].map(t => (
                    <button key={t.value} onClick={() => set('available_time', t.value as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.available_time === t.value ? 'bg-red-50 border-[#ed2a2a] text-[#ed2a2a]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-800 rounded-2xl p-5 text-white">
            <h3 className="font-bold text-sm mb-3 text-slate-300">Tóm tắt</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Tên</span>
                <span className="font-semibold truncate max-w-[140px]">{form.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Giá</span>
                <span className="font-bold text-emerald-400">{form.price ? form.price.toLocaleString('vi-VN') + 'đ' : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tồn kho</span>
                <span className="text-amber-400 font-semibold text-xs">Chưa có → Nhập kho sau</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tùy chọn</span>
                <span className="font-semibold">{(form.options ?? []).length} nhóm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trạng thái</span>
                <span className={`font-bold ${form.is_active ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {form.is_active ? 'Đang bán' : 'Tạm ẩn'}
                </span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={saving}
              className="w-full mt-4 py-3 bg-[#ed2a2a] rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-60 transition-colors">
              {saving ? 'Đang lưu...' : 'Tạo sản phẩm'}
            </button>

            {/* Flow guide */}
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flow sau khi tạo</p>
              {[
                { step: '1', icon: '✅', text: 'Tạo sản phẩm', done: true },
                { step: '2', icon: '📦', text: 'Nhập kho → có hàng', done: false },
                { step: '3', icon: '💰', text: 'Bán hàng → trừ tồn', done: false },
              ].map(s => (
                <div key={s.step} className={`flex items-center gap-2 text-xs ${s.done ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{s.icon}</span>
                  <span className="font-medium">{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick link to import */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-600 mb-1">Bước tiếp theo</p>
            <p className="text-[11px] text-slate-400 mb-3">Sau khi tạo SP, vào Nhập kho để thêm số lượng thực tế</p>
            <button onClick={() => router.push('/admin/inventory/imports/create')}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2">
              📦 Tạo phiếu nhập kho
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
