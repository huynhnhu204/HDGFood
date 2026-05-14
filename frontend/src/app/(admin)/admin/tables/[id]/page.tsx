'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, Edit, Trash2, LayoutGrid, Plus,
  Users, MapPin, Coffee, Utensils, 
  ChefHat, Loader2, QrCode, Receipt,
  Trash, ArrowRightLeft, CheckCircle2,
  Clock, CreditCard, X
} from 'lucide-react'
import { toast } from 'sonner'
import { tableService } from '@/services/table.service'
import { productService } from '@/services/product.service'
import type { Product, Table } from '@/types'

const STATUS_CONFIG = {
  available: {
    label: 'Trống',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    icon: Coffee
  },
  occupied: {
    label: 'Đang ngồi',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    icon: Utensils
  },
  reserved: {
    label: 'Chờ thanh toán',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-600',
    dot: 'bg-rose-500',
    icon: ChefHat
  }
}

export default function TableDetailPage() {
  const router = useRouter()
  const { id } = useParams()
  const [table, setTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [productKeyword, setProductKeyword] = useState('')
  const [productOptions, setProductOptions] = useState<Product[]>([])
  const [selectedItems, setSelectedItems] = useState<Array<{ product: Product; quantity: number }>>([])

  useEffect(() => {
    fetchTableDetail()
  }, [id])

  const fetchTableDetail = async () => {
    try {
      const data = await tableService.getById(Number(id))
      setTable(data)
    } catch {
      toast.error('Không thể tìm thấy thông tin bàn')
      router.push('/admin/tables')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa bàn này?')) return
    try {
      await tableService.delete(Number(id))
      toast.success('Đã xóa bàn thành công')
      router.push('/admin/tables')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xóa bàn')
    }
  }

  const handleUpdateStatus = async (status: 'available' | 'occupied' | 'reserved') => {
    setUpdating(true)
    try {
      await tableService.updateStatus(Number(id), status)
      toast.success('Cập nhật trạng thái thành công')
      fetchTableDetail()
    } catch {
      toast.error('Cập nhật thất bại')
    } finally {
      setUpdating(false)
    }
  }

  const handleCompletePayment = async () => {
    setUpdating(true)
    try {
      await tableService.completePayment(Number(id), 'cod')
      toast.success('Đã hoàn tất thu tiền và giải phóng bàn')
      fetchTableDetail()
    } catch {
      toast.error('Hoàn tất thanh toán thất bại')
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    if (!addItemModalOpen) return
    const t = window.setTimeout(async () => {
      try {
        const res = await productService.getAll({ search: productKeyword || undefined, page: 1 })
        setProductOptions(res.data || [])
      } catch {
        setProductOptions([])
      }
    }, 250)
    return () => window.clearTimeout(t)
  }, [addItemModalOpen, productKeyword])

  const addProductToDraft = (product: Product) => {
    setSelectedItems((prev) => {
      const found = prev.find((p) => p.product.id === product.id)
      if (found) {
        return prev.map((p) => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const handleSubmitAddItems = async () => {
    if (!table || selectedItems.length === 0) return
    setUpdating(true)
    try {
      await tableService.addItems(
        table.id,
        selectedItems.map((item) => ({ product_id: item.product.id, quantity: item.quantity }))
      )
      toast.success('Đã thêm món vào đơn hiện tại.')
      setAddItemModalOpen(false)
      setSelectedItems([])
      setProductKeyword('')
      fetchTableDetail()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể thêm món.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading || !table) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#ed2a2a] mb-4" />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu bàn...</p>
      </div>
    )
  }

  const config = STATUS_CONFIG[table.status]
  const StatusIcon = config.icon
  const orderSubtotal = Number(
    table.current_order?.total ??
    table.current_order?.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0) ??
    table.current_order?.total_price ??
    0
  )
  const orderFinalTotal = Number(
    table.current_order?.final_total ??
    table.current_order?.total_price ??
    orderSubtotal
  )
  const orderDiscount = Math.max(0, Number(table.current_order?.discount_amount ?? (orderSubtotal - orderFinalTotal)))
  const formatMoney = (value: number) => `${Number.isFinite(value) ? value.toLocaleString() : '0'}đ`
  
  // URL to order from this table (Conceptual for QR)
  const orderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu?table_id=${table.id}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(orderUrl)}`

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-5 rounded-[2rem] shadow-sm flex items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin/tables')} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-3">
             {table.name}
             {updating && <Loader2 className="w-4 h-4 animate-spin text-[#ed2a2a]" />}
          </h1>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => router.push(`/admin/tables/${id}/edit`)}
             className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-90"
           >
              <Edit className="w-5 h-5" />
           </button>
           <button 
             onClick={handleDelete}
             className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 transition-all active:scale-90"
           >
              <Trash2 className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Summary and QR (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center">
             <div className={`w-24 h-24 rounded-[2.5rem] ${config.bg} ${config.text} flex items-center justify-center mb-6 ring-8 ring-slate-50 shadow-sm`}>
                <StatusIcon className="w-12 h-12" />
             </div>
             <h2 className="text-2xl font-black text-slate-800 mb-1">{table.name}</h2>
             <p className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest mb-6">
                <MapPin className="w-4 h-4" /> {table.area || 'Mặc định'}
             </p>

             <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-slate-50 rounded-3xl p-4 flex flex-col items-center justify-center border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                   <Users className="w-6 h-6 text-slate-400 group-hover:text-[#ed2a2a] mb-2 transition-colors" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sức chứa</span>
                   <span className="text-lg font-black text-slate-700">{table.capacity}</span>
                </div>
                <div className={`rounded-3xl p-4 flex flex-col items-center justify-center border group hover:shadow-lg transition-all ${config.bg} ${config.border}`}>
                   <StatusIcon className="w-6 h-6 mb-2" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{config.label}</span>
                   <span className="text-sm font-black whitespace-nowrap">Trạng thái</span>
                </div>
             </div>

             {/* Dynamic Actions based on Status */}
             <div className="w-full space-y-3">
                {table.status === 'available' && (
                  <button 
                    onClick={() => handleUpdateStatus('occupied')}
                    className="w-full py-4 bg-[#ed2a2a] text-white rounded-[1.5rem] text-sm font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                  >
                    Mở bàn
                  </button>
                )}
                {table.status === 'occupied' && (
                  <button 
                    onClick={() => handleUpdateStatus('reserved')}
                    className="w-full py-4 bg-rose-500 text-white rounded-[1.5rem] text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                  >
                    Gọi thanh toán
                  </button>
                )}
                {table.status === 'reserved' && (
                  <button
                    onClick={handleCompletePayment}
                    className="w-full py-4 bg-emerald-600 text-white rounded-[1.5rem] text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    Đã thu tiền & Trả bàn
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    disabled={table.status === 'reserved'}
                    onClick={() => handleUpdateStatus('reserved')}
                    className="py-3.5 bg-amber-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-30"
                  >
                    Chờ TT
                  </button>
                  <button className="py-3.5 bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Chuyển
                  </button>
                </div>
             </div>
          </div>

          {/* QR Code Card */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center group">
             <div className="flex items-center gap-3 mb-6 w-full px-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-[#ed2a2a] group-hover:text-white transition-colors">
                   <QrCode className="w-4 h-4" />
                </div>
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">QR Code Gọi Món</h3>
             </div>

             <div className="w-full aspect-square bg-slate-50 border-4 border-slate-100 rounded-3xl p-4 flex items-center justify-center relative overflow-hidden group/qr">
                <img 
                   src={qrUrl} 
                   alt={`QR code for ${table.name}`}
                   className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover/qr:scale-105"
                />
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] opacity-0 group-hover/qr:opacity-100 transition-opacity flex flex-col items-center justify-center p-6">
                   <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">Quét để khám phá<br/>Thực đơn HDG Food</p>
                </div>
             </div>
             
             <button className="mt-6 flex items-center gap-2 text-[11px] font-black text-[#ed2a2a] uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                <Receipt className="w-4 h-4" /> Tải về Folder In Bàn
             </button>
          </div>
        </div>

        {/* Right: Current Order Details (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 border border-slate-200 shadow-sm min-h-[500px]">
             <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                      <Receipt className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Đơn Hàng Hiện Tại</h3>
                      {table.current_order ? (
                        <p className="text-xs font-bold text-slate-400">Order ID #HDG-{table.current_order.id}</p>
                      ) : (
                        <p className="text-xs font-bold text-slate-400">Bàn này chưa có đơn hàng hoạt động</p>
                      )}
                   </div>
                </div>

                {table.current_order && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-green-600">
                     <Clock className="w-4 h-4" />
                     <span className="text-xs font-black uppercase tracking-widest">Đang phục vụ</span>
                  </div>
                )}
             </div>

             {table.current_order ? (
                <div className="space-y-8">
                   {/* Table items */}
                   <div className="space-y-4">
                      {table.current_order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between group py-1">
                           {(() => {
                             const isCombo = item.item_type === 'combo'
                             const itemImage = isCombo ? item.combo?.image : item.product?.image
                             const itemName = isCombo
                               ? (item.combo?.name || item.options_snapshot?.combo_name || 'Combo')
                               : (item.product?.name || 'Món')
                             const comboItems = item.options_snapshot?.combo_items || []
                             return (
                           <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl bg-slate-50 p-1 border border-slate-100 overflow-hidden">
                                <img src={itemImage || '/placeholder-dish.png'} className="w-full h-full object-cover rounded-xl" />
                             </div>
                             <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-black text-slate-700 leading-none truncate">{itemName}</h4>
                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${
                                      isCombo
                                        ? 'border-violet-200 bg-violet-50 text-violet-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    {isCombo ? 'Combo' : 'Món'}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-slate-400">SL: x{item.quantity}</p>
                                {isCombo && comboItems.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {comboItems.map((ci, ciIdx) => (
                                      <span
                                        key={`${ci.product_id}-${ciIdx}`}
                                        className="rounded-md border border-violet-100 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
                                      >
                                        {ci.name} x{ci.quantity}
                                      </span>
                                    ))}
                                  </div>
                                )}
                             </div>
                           </div>
                             )
                           })()}
                           <span className="text-[14px] font-black text-slate-800">
                              {(item.price * item.quantity).toLocaleString()}đ
                           </span>
                        </div>
                      ))}
                   </div>

                   {/* Total Summary */}
                   <div className="pt-8 border-t-2 border-dashed border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Tạm tính:</span>
                         <span className="text-base font-bold text-slate-600">{formatMoney(orderSubtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Giảm giá:</span>
                         <span className="text-base font-bold text-emerald-600">-{formatMoney(orderDiscount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Thuế (0%):</span>
                         <span className="text-base font-bold text-slate-600">0đ</span>
                      </div>
                      <div className="flex items-center justify-between pt-4">
                         <span className="text-lg font-black text-slate-800 uppercase tracking-widest">Tổng thanh toán:</span>
                         <div className="text-right">
                           <div className="text-2xl font-black text-[#ed2a2a] leading-none mb-1">
                              {formatMoney(orderFinalTotal)}
                           </div>
                           <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">Đã bao gồm giảm giá hiện tại</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setAddItemModalOpen(true)}
                        className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[13px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all"
                      >
                         <Plus className="w-5 h-5" /> Gọi thêm món
                      </button>
                      <button className="flex items-center justify-center gap-2 py-4 bg-[#ed2a2a] text-white rounded-[1.5rem] text-[13px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                         <CreditCard className="w-5 h-5" /> Tính Tiền →
                      </button>
                   </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
                      <ChefHat className="w-10 h-10 text-slate-200 animate-pulse" />
                   </div>
                   <p className="text-lg font-black text-slate-700 mb-2">Sẵn sàng phục vụ!</p>
                   <p className="text-[13px] font-medium text-slate-400 max-w-xs leading-relaxed">
                     Bàn hiện tại không có đơn hàng nào. Hãy chuyển trạng thái sang 
                     <span className="font-bold text-[#ed2a2a]"> "Có khách" </span> 
                     để bắt đầu khởi tạo thực đơn.
                   </p>
                </div>
             )}
          </div>
          
          <div className="bg-blue-50/50 rounded-[2.5rem] p-8 border border-blue-100 flex items-start gap-5">
             <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
             </div>
             <div>
                <h4 className="text-[13px] font-black text-slate-700 uppercase tracking-[0.2em] mb-2">Trạng thái bếp</h4>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Tất cả các món đang gọi của bàn này đều đã được xác nhận. Nhân viên có thể thực hiện thanh toán trực tiếp tại quầy hoặc in hóa đơn tạm tính gửi khách.
                </p>
             </div>
          </div>
        </div>
      </div>

      {addItemModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAddItemModalOpen(false)} />
          <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">Gọi thêm món cho {table.name}</h3>
              <button onClick={() => setAddItemModalOpen(false)} className="p-2 rounded-xl border border-slate-200 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <input
                  value={productKeyword}
                  onChange={(e) => setProductKeyword(e.target.value)}
                  placeholder="Tìm món ăn..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-3"
                />
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {productOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProductToDraft(p)}
                      className="w-full text-left rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{Number(p.price || 0).toLocaleString()}đ</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Món đã chọn</p>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {selectedItems.length === 0 ? (
                    <p className="text-sm text-slate-400">Chưa chọn món nào.</p>
                  ) : selectedItems.map((item) => (
                    <div key={item.product.id} className="rounded-xl border border-slate-200 p-2.5">
                      <p className="text-sm font-semibold text-slate-800">{item.product.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedItems((prev) => prev.map((x) => x.product.id === item.product.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}
                          className="w-7 h-7 rounded-lg border border-slate-200"
                        >-</button>
                        <span className="text-sm font-bold min-w-8 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedItems((prev) => prev.map((x) => x.product.id === item.product.id ? { ...x, quantity: x.quantity + 1 } : x))}
                          className="w-7 h-7 rounded-lg border border-slate-200"
                        >+</button>
                        <button
                          type="button"
                          onClick={() => setSelectedItems((prev) => prev.filter((x) => x.product.id !== item.product.id))}
                          className="ml-auto text-xs font-semibold text-rose-500"
                        >Bỏ</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={updating || selectedItems.length === 0}
                  onClick={handleSubmitAddItems}
                  className="mt-4 w-full rounded-xl bg-[#ed2a2a] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {updating ? 'Đang thêm món...' : 'Xác nhận gọi thêm món'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
