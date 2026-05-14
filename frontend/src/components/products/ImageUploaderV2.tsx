'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { AlertCircle, Archive, Camera, GripVertical, ImagePlus, Link2, Loader2, RotateCcw, Star, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/services/api'
import { productService, type ProductPayload } from '@/services/product.service'

interface Props {
  form: ProductPayload
  set: (k: keyof ProductPayload, v: unknown) => void
  productId?: number
}

type GalleryImage = {
  id?: number
  url: string
  path?: string | null
  alt_text?: string | null
  status?: 'active' | 'archived'
  is_primary?: boolean
}

interface UploadingItem {
  id: string
  file: File
  status: 'uploading' | 'error'
  error?: string
}

const ACCEPTED_TYPES = { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] }
const MAX_SIZE = 2 * 1024 * 1024

const normalizeImage = (img: string | GalleryImage): GalleryImage =>
  typeof img === 'string' ? { url: img, status: 'active' } : { ...img, status: img.status ?? 'active', alt_text: img.alt_text ?? '' }

const id = () => Math.random().toString(36).slice(2, 10)

export default function ImageUploaderV2({ form, set, productId }: Props) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState<UploadingItem[]>([])
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null)
  const [dragOverGalleryIdx, setDragOverGalleryIdx] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const extraImages = useMemo(
    () => (((form as any).extra_images ?? []) as Array<string | GalleryImage>).map(normalizeImage),
    [form]
  )

  const setExtraImages = useCallback((images: GalleryImage[]) => set('extra_images' as any, images), [set])
  const displayImages = useMemo(
    () => (showArchived ? extraImages : extraImages.filter((img) => img.status !== 'archived')),
    [extraImages, showArchived]
  )
  const imageKey = (img: GalleryImage) => (img.id ? `id:${img.id}` : `url:${img.url}`)
  const getImageByDisplayIndex = (idx: number) => displayImages[idx]
  const findImageIndexInAll = (target: GalleryImage) =>
    extraImages.findIndex((img) => (target.id ? img.id === target.id : img.url === target.url))

  useEffect(() => {
    if (!productId) return
    productService.getImages(productId).then((images) => {
      const active = images.filter((img) => img.status !== 'archived')
      setExtraImages(active)
      const primary = active.find((img) => img.is_primary)
      if (primary?.url) set('image', primary.url)
    }).catch(() => {})
  }, [productId, set, setExtraImages])

  const uploadFile = useCallback(async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/admin/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return { url: res.data.url as string, path: (res.data.path as string | undefined) ?? null }
  }, [])

  const onDrop = useCallback(async (accepted: File[], rejected: FileRejection[]) => {
    for (const r of rejected) {
      setUploading((prev) => [...prev, { id: id(), file: r.file, status: 'error', error: 'File không hợp lệ hoặc > 2MB.' }])
    }
    for (const file of accepted) {
      const itemId = id()
      setUploading((prev) => [...prev, { id: itemId, file, status: 'uploading' }])
      try {
        const uploaded = await uploadFile(file)
        if (productId) {
          const created = await productService.addImages(productId, [{ url: uploaded.url, path: uploaded.path }])
          setExtraImages([...extraImages, ...created.map(normalizeImage)])
        } else {
          setExtraImages([...extraImages, { url: uploaded.url, path: uploaded.path, status: 'active' }])
        }
      } catch {
        toast.error(`Upload "${file.name}" thất bại.`)
      } finally {
        setUploading((prev) => prev.filter((u) => u.id !== itemId))
      }
    }
  }, [extraImages, productId, setExtraImages, uploadFile])

  const dropzone = useDropzone({ onDrop, accept: ACCEPTED_TYPES, maxSize: MAX_SIZE, multiple: true })
  const dropzoneInputProps = dropzone.getInputProps()
  const { value: _dropzoneValue, defaultValue: _dropzoneDefaultValue, ...safeDropzoneInputProps } =
    dropzoneInputProps as typeof dropzoneInputProps & { value?: string; defaultValue?: string }

  const addByUrl = async () => {
    const url = urlInput.trim()
    if (!url.startsWith('http')) return toast.error('URL ảnh không hợp lệ.')
    try {
      if (productId) {
        const created = await productService.addImages(productId, [{ url }])
        setExtraImages([...extraImages, ...created.map(normalizeImage)])
      } else {
        setExtraImages([...extraImages, { url, status: 'active' }])
      }
      setUrlInput('')
    } catch {
      toast.error('Thêm ảnh URL thất bại.')
    }
  }

  const setAsMain = async (url: string) => {
    const picked = extraImages.find((img) => img.url === url)
    if (!picked) return
    const wasArchived = picked.status === 'archived'
    const oldMain = form.image
    const next = extraImages
      .filter((img) => img.url !== url)
      .map((img) => ({ ...img, status: img.status ?? 'active' }))
    if (oldMain) next.push({ url: oldMain, status: 'active' })
    set('image', url)
    setExtraImages(next)
    toast.success(wasArchived ? 'Đã khôi phục ảnh và đặt làm ảnh chính.' : 'Đã đặt ảnh chính.')
    if (productId && picked?.id) {
      if (wasArchived) {
        await productService.updateImage(productId, picked.id, { status: 'active' }).catch(() => toast.error('Không thể khôi phục ảnh từ archived.'))
      }
      await productService.updateImage(productId, picked.id, { is_primary: true }).catch(() => toast.error('Không thể đặt ảnh chính.'))
    }
  }

  const removeImage = async (idx: number, mode: 'archive' | 'delete') => {
    const target = getImageByDisplayIndex(idx)
    if (!target) return
    const confirmed = window.confirm(
      mode === 'archive'
        ? 'Bạn có chắc muốn archive ảnh này?'
        : 'Bạn có chắc muốn xóa cứng ảnh này?'
    )
    if (!confirmed) return
    if (productId && target.id) {
      await productService.removeImage(productId, target.id, mode).catch(() => toast.error('Thao tác thất bại.'))
    }
    if (mode === 'archive') {
      setExtraImages(extraImages.map((img) => (img.id === target.id ? { ...img, status: 'archived' } : img)))
      toast.success('Đã archive ảnh. Bạn có thể Restore.')
    } else {
      setExtraImages(extraImages.filter((img) => img.id !== target.id && img.url !== target.url))
      toast.success('Đã xóa ảnh.')
    }
    setSelectedKeys(new Set())
  }

  const toggleSelect = (img: GalleryImage) => {
    const key = imageKey(img)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedKeys(new Set(displayImages.map((img) => imageKey(img))))
  }

  const clearSelection = () => setSelectedKeys(new Set())

  const runBulkAction = async (action: 'archive' | 'delete' | 'restore') => {
    if (selectedKeys.size === 0) return
    const targets = displayImages.filter((img) => selectedKeys.has(imageKey(img)))
    if (targets.length === 0) return

    const confirmed = window.confirm(
      action === 'archive'
        ? `Archive ${targets.length} ảnh đã chọn?`
        : action === 'delete'
          ? `Xóa cứng ${targets.length} ảnh đã chọn?`
          : `Restore ${targets.length} ảnh đã chọn?`
    )
    if (!confirmed) return

    if (productId) {
      for (const img of targets) {
        if (!img.id) continue
        try {
          if (action === 'restore') {
            await productService.updateImage(productId, img.id, { status: 'active' })
          } else {
            await productService.removeImage(productId, img.id, action)
          }
        } catch {
          toast.error(`Thao tác thất bại với ảnh ${img.id}.`)
        }
      }
    }

    if (action === 'restore') {
      const keys = new Set(targets.map((img) => imageKey(img)))
      setExtraImages(extraImages.map((img) => (keys.has(imageKey(img)) ? { ...img, status: 'active' } : img)))
    } else if (action === 'archive') {
      const keys = new Set(targets.map((img) => imageKey(img)))
      setExtraImages(extraImages.map((img) => (keys.has(imageKey(img)) ? { ...img, status: 'archived' } : img)))
    } else {
      const keys = new Set(targets.map((img) => imageKey(img)))
      setExtraImages(extraImages.filter((img) => !keys.has(imageKey(img))))
    }

    toast.success(`Đã ${action === 'restore' ? 'restore' : action} ${targets.length} ảnh.`)
    clearSelection()
  }

  const updateMeta = async (idx: number, patch: Partial<GalleryImage>) => {
    const targetDisplay = getImageByDisplayIndex(idx)
    const targetIdx = targetDisplay ? findImageIndexInAll(targetDisplay) : -1
    if (targetIdx < 0) return
    const cloned = [...extraImages]
    const target = cloned[targetIdx]
    if (!target) return
    cloned[targetIdx] = { ...target, ...patch }
    setExtraImages(cloned)
    if (productId && target.id) {
      await productService.updateImage(productId, target.id, { alt_text: cloned[targetIdx].alt_text, status: cloned[targetIdx].status }).catch(() => toast.error('Lưu metadata thất bại.'))
    }
    if (patch.status) {
      toast.success(`Đã đổi trạng thái ảnh sang "${patch.status}".`)
    }
  }

  const onDragEnd = async () => {
    if (dragSourceIdx === null || dragOverGalleryIdx === null || dragSourceIdx === dragOverGalleryIdx) return
    const activeOnly = [...extraImages].filter((img) => img.status !== 'archived')
    const reordered = [...activeOnly]
    const [moved] = reordered.splice(dragSourceIdx, 1)
    reordered.splice(dragOverGalleryIdx, 0, moved)
    const archived = extraImages.filter((img) => img.status === 'archived')
    setExtraImages([...reordered, ...archived])
    if (productId) {
      const orders = reordered.map((img, i) => ({ id: img.id, sort_order: i })).filter((x): x is { id: number; sort_order: number } => typeof x.id === 'number')
      if (orders.length) await productService.reorderImages(productId, orders).catch(() => toast.error('Lưu thứ tự thất bại.'))
    }
    setDragSourceIdx(null)
    setDragOverGalleryIdx(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-2">Ảnh chính</label>
        {form.image ? (
          <div className="relative rounded-xl overflow-hidden border border-red-200">
            <img src={form.image} alt="main" className="w-full aspect-square object-cover" />
            <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1"><Star className="w-3 h-3 fill-white" />MAIN</div>
            <button type="button" onClick={() => set('image', '')} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => dropzone.open()} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-8 text-slate-500">
            <Camera className="w-6 h-6 mx-auto mb-2" /> Upload ảnh rồi chọn MAIN
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-bold">Album ảnh</label>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 flex items-center gap-1">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Hiện archived
          </label>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button type="button" onClick={() => setMode('upload')} className={`px-2 py-1 text-xs rounded ${mode === 'upload' ? 'bg-white' : ''}`}><Upload className="w-3 h-3 inline mr-1" />Upload</button>
            <button type="button" onClick={() => setMode('url')} className={`px-2 py-1 text-xs rounded ${mode === 'url' ? 'bg-white' : ''}`}><Link2 className="w-3 h-3 inline mr-1" />URL</button>
          </div>
        </div>
      </div>

      {displayImages.length > 0 && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button type="button" onClick={selectAllVisible} className="px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50">
              Chọn tất cả
            </button>
            <button type="button" onClick={clearSelection} className="px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50">
              Bỏ chọn
            </button>
          </div>
          <span className="text-slate-500">Đã chọn: {selectedKeys.size}</span>
        </div>
      )}

      {selectedKeys.size > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={() => runBulkAction('archive')} className="px-2.5 py-1.5 bg-slate-700 text-white rounded-md">
            Archive đã chọn
          </button>
          <button type="button" onClick={() => runBulkAction('restore')} className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-md">
            Restore đã chọn
          </button>
          <button type="button" onClick={() => runBulkAction('delete')} className="px-2.5 py-1.5 bg-red-600 text-white rounded-md">
            Xóa đã chọn
          </button>
        </div>
      )}

      {mode === 'upload' ? (
        <div key="upload-mode" {...dropzone.getRootProps()} className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer">
          <input {...safeDropzoneInputProps} />
          <ImagePlus className="w-5 h-5 mx-auto mb-1 text-slate-500" />
          <p className="text-xs text-slate-500">Kéo thả hoặc click để upload</p>
        </div>
      ) : (
        <div key="url-mode" className="flex gap-2">
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="https://..." />
          <button type="button" onClick={addByUrl} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-sm">Thêm</button>
        </div>
      )}

      {uploading.map((u) => (
        <div key={u.id} className="text-xs border border-slate-200 rounded-lg px-2 py-1 flex items-center gap-2">
          {u.status === 'uploading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertCircle className="w-3 h-3 text-red-500" />}
          <span className="truncate">{u.status === 'error' ? u.error : `Đang upload ${u.file.name}`}</span>
        </div>
      ))}

      {displayImages.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {displayImages.map((img, idx) => (
              <div
                key={`${img.id ?? 'new'}-${idx}`}
                draggable={img.status !== 'archived'}
                onDragStart={() => setDragSourceIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverGalleryIdx(idx) }}
                onDragEnd={onDragEnd}
                className={`relative border rounded-xl overflow-hidden group ${dragOverGalleryIdx === idx ? 'ring-2 ring-red-400' : ''}`}
              >
                <label className="absolute z-10 top-1.5 left-1.5">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(imageKey(img))}
                    onChange={() => toggleSelect(img)}
                    className="w-3.5 h-3.5 accent-red-500"
                  />
                </label>
                <img src={img.url} alt={`img-${idx}`} className="w-full aspect-square object-cover" />
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] rounded px-1">{idx + 1}</div>
                {img.status === 'archived' && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] rounded px-1.5 py-0.5">
                    archived
                  </div>
                )}
                <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100"><GripVertical className="w-4 h-4 text-white" /></div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                  <button type="button" onClick={() => setAsMain(img.url)} className="p-1.5 bg-amber-400 rounded-full text-white"><Star className="w-3 h-3" /></button>
                  <button type="button" onClick={() => removeImage(idx, 'archive')} className="p-1.5 bg-slate-700 rounded-full text-white"><Archive className="w-3 h-3" /></button>
                  {img.status === 'archived' && (
                    <button type="button" onClick={() => updateMeta(idx, { status: 'active' })} className="p-1.5 bg-emerald-500 rounded-full text-white"><RotateCcw className="w-3 h-3" /></button>
                  )}
                  <button type="button" onClick={() => removeImage(idx, 'delete')} className="p-1.5 bg-red-500 rounded-full text-white"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {displayImages.map((img, idx) => (
              <div key={`meta-${img.id ?? idx}`} className="grid grid-cols-3 gap-2">
                <input value={img.alt_text ?? ''} onChange={(e) => updateMeta(idx, { alt_text: e.target.value })} className="col-span-2 border border-slate-200 rounded-lg px-2 py-1 text-xs" placeholder={`Alt text ảnh #${idx + 1}`} />
                <select value={img.status ?? 'active'} onChange={(e) => updateMeta(idx, { status: e.target.value as 'active' | 'archived' })} className="border border-slate-200 rounded-lg px-2 py-1 text-xs">
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
