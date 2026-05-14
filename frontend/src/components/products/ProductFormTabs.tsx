'use client'

import { useState } from 'react'
import { Plus, X, ImagePlus, Star } from 'lucide-react'
import type { Category } from '@/types'
import type { ProductPayload } from '@/services/product.service'
import { TABS, TIME_OPTS, type TabId, type OptionDraft } from './types'
import OptionGroup from './OptionGroup'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

interface Props {
  tab: TabId
  setTab: (t: TabId) => void
  form: ProductPayload
  set: (k: keyof ProductPayload, v: unknown) => void
  categories: Category[]
  addOption: () => void
  removeOption: (i: number) => void
  updateOption: (i: number, patch: Partial<OptionDraft>) => void
  addValue: (oi: number) => void
  removeValue: (oi: number, vi: number) => void
  updateValue: (oi: number, vi: number, patch: Partial<{ label: string; price_extra: number }>) => void
}

export default function ProductFormTabs({
  tab, setTab, form, set, categories,
  addOption, removeOption, updateOption, addValue, removeValue, updateValue,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* ── Tabs Dropdown (Mobile) ── */}
      <div className="block lg:hidden p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Thiết lập thông tin</label>
        <div className="relative">
          <select 
            value={tab} 
            onChange={(e) => setTab(e.target.value as TabId)}
            className="w-full text-base font-bold text-slate-800 border border-slate-200 rounded-xl py-3.5 pl-4 pr-10 focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] appearance-none cursor-pointer bg-white shadow-sm transition-all"
          >
            {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {/* ── Tabs Row (Desktop) ── */}
      <div className="hidden lg:flex border-b border-slate-100 bg-white">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-8 py-4 text-[15px] font-bold whitespace-nowrap transition-all border-b-2 ${
              tab === t.id
                ? 'border-[#ed2a2a] text-[#ed2a2a] bg-red-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6 lg:p-8 space-y-6">

        {/* ── Thông tin ── */}
        {tab === 'info' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tên sản phẩm <span className="text-[#ed2a2a]">*</span></label>
              <input
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="VD: Trà sữa Matcha Nhật Bản"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Danh mục <span className="text-[#ed2a2a]">*</span></label>
              <select
                value={form.category_id}
                onChange={e => set('category_id', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all bg-slate-50 focus:bg-white cursor-pointer"
              >
                <option value={0} disabled>-- Vui lòng chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Mô tả ngắn
                <span className="ml-2 text-xs font-medium text-slate-400">— Nổi bật, súc tích (1-2 câu)</span>
              </label>
              <textarea
                rows={3} value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
                placeholder="VD: Trà sữa matcha đậm vị trà, thơm béo vị sữa, phù hợp cho ngày hè..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all resize-none bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Mô tả chi tiết (Bài viết)
                <span className="ml-2 text-xs font-medium text-slate-400">— Hiển thị ở trang chi tiết sản phẩm</span>
              </label>
              <textarea
                rows={8} value={(form as any).long_description ?? ''}
                onChange={e => set('long_description' as any, e.target.value)}
                placeholder="Viết đầy đủ về nguyên liệu, nguồn gốc hương vị, bí quyết pha chế..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] transition-all resize-none bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* ── Giá ── */}
        {tab === 'price' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Giá gốc (đ) <span className="text-[#ed2a2a]">*</span></label>
              <input
                type="number" min={0} value={form.price || ''}
                onChange={e => set('price', Number(e.target.value))}
                placeholder="VD: 55000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] bg-slate-50 focus:bg-white transition-all font-semibold text-slate-800"
              />
              {form.price > 0 && <p className="text-[13px] font-bold text-[#ed2a2a] mt-1.5">{fmt(form.price)}</p>}
            </div>
            
            <div className="p-4 sm:p-5 bg-amber-50/80 border border-amber-100 rounded-2xl">
              <label className="block text-sm font-bold text-amber-900 mb-2">
                Giá khuyến mãi (Sẽ xếp chồng lên giá gốc)
                <span className="ml-2 text-[11px] font-bold text-amber-600/70 uppercase tracking-widest">— Tùy chọn</span>
              </label>
              <input
                type="number" min={0} value={form.sale_price || ''}
                onChange={e => set('sale_price', e.target.value ? Number(e.target.value) : null)}
                placeholder="VD: 35000"
                className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 bg-white transition-all font-semibold text-amber-900"
              />
              {form.sale_price && form.price > 0 && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold shadow-sm">
                  <span>🤑 Tiết kiệm {fmt(form.price - (form.sale_price ?? 0))}</span>
                  <span className="bg-white/50 px-1.5 py-0.5 rounded-md">- {Math.round((1 - (form.sale_price ?? 0) / form.price) * 100)}%</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Kho hàng</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number" min={0} value={form.stock ?? 0}
                  onChange={e => set('stock', Number(e.target.value))}
                  disabled={form.is_available}
                  placeholder="Số lượng"
                  className="w-full sm:flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 transition-all font-medium"
                />
                <label className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50 transition-colors bg-white">
                  <input
                    type="checkbox" checked={form.is_available ?? true}
                    onChange={e => set('is_available', e.target.checked)}
                    className="w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a] cursor-pointer"
                  />
                  Luôn có sẵn hàng
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Tuỳ chọn ── */}
        {tab === 'options' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 sm:p-5">
              <p className="text-[13px] font-medium text-blue-800 leading-relaxed">
                💡 Sử dụng Tuỳ chọn (Options) để tạo <strong className="font-bold">Kích thước (Size)</strong>, <strong className="font-bold">Thêm Topping</strong>, hay <strong className="font-bold">Mức đường/đá</strong> cho sản phẩm này. Khách hàng sẽ phải lựa chọn khi đưa vào giỏ hàng.
              </p>
            </div>
            {(form.options as OptionDraft[] ?? []).map((opt, oi) => (
              <OptionGroup
                key={oi} opt={opt} oi={oi}
                onUpdate={updateOption} onRemove={removeOption}
                onAddValue={addValue} onRemoveValue={removeValue} onUpdateValue={updateValue}
              />
            ))}
            <button
              type="button" onClick={addOption}
              className="group flex flex-col items-center gap-2 w-full p-6 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 hover:border-[#ed2a2a] hover:text-[#ed2a2a] hover:bg-red-50/30 transition-all cursor-pointer bg-slate-50/50"
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold">Thêm một Nhóm Tuỳ Chọn mới</span>
            </button>
          </div>
        )}

        {/* ── Hình ảnh ── */}
        {tab === 'image' && (
          <div className="animate-in fade-in duration-300">
            <ImageTab form={form} set={set} />
          </div>
        )}

        {/* ── Cài đặt ── */}
        {tab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-4 p-5 py-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors bg-white shadow-sm">
                <input type="checkbox" checked={form.is_active ?? true} onChange={e => set('is_active', e.target.checked)} className="mt-1 w-4 h-4 text-green-500 accent-green-500 cursor-pointer" />
                <div>
                  <p className="text-[15px] font-bold text-slate-800">Hiển thị & Bán</p>
                  <p className="text-[13px] font-medium text-slate-500 mt-1">Sản phẩm xuất hiện công khai trên trang web khách hàng.</p>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 py-4 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-colors bg-amber-50/30 shadow-sm">
                <input type="checkbox" checked={form.is_featured ?? false} onChange={e => set('is_featured', e.target.checked)} className="mt-1 w-4 h-4 text-amber-500 accent-amber-500 cursor-pointer" />
                <div>
                  <p className="text-[15px] font-bold text-amber-900 flex items-center gap-1.5"><Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Đóng dấu Nổi bật</p>
                  <p className="text-[13px] font-medium text-amber-700/70 mt-1">Gắn nhãn đặc biệt và tăng thứ hạng trên Trang chủ.</p>
                </div>
              </label>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6">
              <label className="block text-sm font-bold text-slate-800 mb-3">⏰ Khung giờ tự động bán</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TIME_OPTS.map(t => (
                  <label
                    key={t.value}
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all shadow-sm ${
                      form.available_time === t.value ? 'border-[#ed2a2a] bg-red-50/50 shadow-red-500/10' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio" name="available_time" value={t.value}
                      checked={form.available_time === t.value}
                      onChange={() => set('available_time', t.value)}
                      className="w-4 h-4 text-[#ed2a2a] accent-[#ed2a2a]"
                    />
                    <span className="text-[14px] font-bold text-slate-700">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">📝 Ghi chú lưu ý (Nội bộ)</label>
              <textarea
                rows={4} value={form.internal_note ?? ''}
                onChange={e => set('internal_note', e.target.value)}
                placeholder='Nhập những lưu ý khi pha chế, quản lý kho hoặc ghi chú từ quản lý (Chỉ riêng NV Bếp và Admin xem được)'
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] bg-slate-50 focus:bg-white resize-none transition-all"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── ImageTab ──────────────────────────────────────────────────────────────
function ImageTab({ form, set }: { form: ProductPayload; set: (k: keyof ProductPayload, v: unknown) => void }) {
  const [urlInput, setUrlInput] = useState('')
  const extraImages: string[] = (form as any).extra_images ?? []

  const addExtraImage = () => {
    const url = urlInput.trim()
    if (!url) return
    set('extra_images' as any, [...extraImages, url])
    setUrlInput('')
  }

  const removeExtra = (idx: number) =>
    set('extra_images' as any, extraImages.filter((_, i) => i !== idx))

  const setAsMain = (url: string) => {
    const oldMain = form.image
    const newExtra = extraImages.filter(u => u !== url)
    if (oldMain) newExtra.push(oldMain)
    set('image', url)
    set('extra_images' as any, newExtra)
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-3.5 sm:py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#ed2a2a]/10 focus:border-[#ed2a2a] bg-slate-50 focus:bg-white transition-all font-medium"

  return (
    <div className="space-y-8">
      {/* Ảnh chính */}
      <div className="bg-slate-50/50 p-5 sm:p-6 border border-slate-200 rounded-2xl">
        <label className="block text-sm font-bold text-slate-800 mb-2.5">
          Link Ảnh Trực Tiếp (Thumb) <span className="text-[#ed2a2a]">*</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={form.image ?? ''} onChange={e => set('image', e.target.value)}
            placeholder="Dán đường dẫn ảnh: https://.../hinh.jpg"
            className={inputCls + " flex-1"}
          />
        </div>
        
        {form.image && (
          <div className="relative mt-4 w-full max-w-[200px] sm:w-48 aspect-square rounded-2xl overflow-hidden border-[3px] border-[#ed2a2a] shadow-lg shadow-red-500/20 group">
            <img src={form.image} alt="main" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-[#ed2a2a] text-white text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 fill-white" /> MAIN
            </div>
            <button type="button" onClick={() => set('image', '')}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-[#ed2a2a] transition-colors shadow-sm opacity-0 group-hover:opacity-100 sm:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Ảnh Gallery */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-2">
          Album Hình Ảnh Thêm
          <span className="ml-2 text-[12px] font-medium text-slate-400">— Tùy chọn (Càng nhiều ảnh càng tăng tỉ lệ chốt sale)</span>
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExtraImage())}
            placeholder="Dán Link Ảnh Album rồi nhấn Thêm/Enter..."
            className={inputCls + " flex-1"}
          />
          <button type="button" onClick={addExtraImage}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors shadow-sm">
            <ImagePlus className="w-5 h-5" /> Thêm vào Album
          </button>
        </div>

        {extraImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
            {extraImages.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square shadow-sm">
                <img src={url} alt={`extra-${idx}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 lg:opacity-0">
                  <button type="button" onClick={() => setAsMain(url)}
                    title="Đặt làm Ảnh Chính"
                    className="w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center text-white hover:bg-yellow-500 shadow-lg transform hover:scale-110 transition-all">
                    <Star className="w-4.5 h-4.5" />
                  </button>
                  <button type="button" onClick={() => removeExtra(idx)}
                    title="Xóa"
                    className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 shadow-lg transform hover:scale-110 transition-all">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))}
            {/* Phím bấm dự phòng thêm nhanh */}
            <button type="button" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Dán Link Ảnh Album rồi nhấn Thêm/Enter..."]')?.focus()}
              className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all">
              <ImagePlus className="w-6 h-6" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Thêm mới</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
