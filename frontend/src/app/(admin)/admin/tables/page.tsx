'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, Users, LayoutGrid, Info, 
  ChefHat, Loader2, Search, Filter, 
  MapPin, Coffee, Utensils
} from 'lucide-react'
import { toast } from 'sonner'
import { tableService } from '@/services/table.service'
import type { Table } from '@/types'
import Pusher from 'pusher-js'

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

const formatMoney = (value?: number | null) => (Number(value ?? 0)).toLocaleString('vi-VN')

export default function TableListPage() {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('all')
  const [highlightTableId, setHighlightTableId] = useState<number | null>(null)

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!key || !cluster) return

    const pusher = new Pusher(key, { cluster })
    const channel = pusher.subscribe('hdg.tables')
    channel.bind('table.workflow.updated', (payload: any) => {
      setHighlightTableId(Number(payload.table_id))
      toast.info(`[Realtime] ${payload.table_name}: ${payload.action}`, {
        action: payload.order_id ? {
          label: 'Xem đơn',
          onClick: () => router.push(`/admin/orders/${payload.order_id}`),
        } : undefined,
      })
      fetchTables()
      setTimeout(() => setHighlightTableId(null), 7000)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('hdg.tables')
      pusher.disconnect()
    }
  }, [])

  const fetchTables = async () => {
    try {
      const data = await tableService.getAll()
      setTables(data)
    } catch {
      toast.error('Không thể tải danh sách bàn')
    } finally {
      setLoading(false)
    }
  }

  const areas = ['all', ...Array.from(new Set(tables.map(t => t.area).filter(Boolean)))]

  const filteredTables = tables.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchesArea = filterArea === 'all' || t.area === filterArea
    return matchesSearch && matchesArea
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-5 lg:p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 flex items-center gap-3">
            <LayoutGrid className="w-7 h-7 text-[#ed2a2a]" />
            Quản Lý Sơ Đồ Bàn
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Quản lý vị trí ngồi & Đơn hàng tại quán</p>
        </div>

        <Link 
          href="/admin/tables/create"
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#ed2a2a] text-white rounded-2xl text-[14px] font-black shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          Thêm Bàn Mới
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative group lg:col-span-2">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#ed2a2a] transition-colors" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên bàn (VD: Bàn 01)..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-red-50/50 focus:border-[#ed2a2a] transition-all"
          />
        </div>

        <div className="relative group">
          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors" />
          <select 
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-700 outline-none appearance-none focus:ring-4 focus:ring-red-50/50 focus:border-[#ed2a2a] transition-all"
          >
            {areas.map(area => (
              <option key={area} value={area}>
                {area === 'all' ? 'Tất cả khu vực' : area}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white px-6 py-4 border border-slate-200 rounded-2xl flex items-center justify-between">
           <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tổng cộng</span>
           <span className="text-lg font-black text-slate-800">{filteredTables.length} Bàn</span>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#ed2a2a] mb-4" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Đang tải sơ đồ bàn...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredTables.map(table => {
            const config = STATUS_CONFIG[table.status]
            const StatusIcon = config.icon

            return (
              <div 
                key={table.id}
                onClick={() => router.push(`/admin/tables/${table.id}`)}
                className={`group relative bg-white border rounded-[2rem] p-5 cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center ${config.border} ${highlightTableId === table.id ? 'ring-4 ring-rose-300 animate-pulse' : ''}`}
              >
                {/* Visual Representation of Table */}
                <div className={`w-16 h-16 rounded-3xl ${config.bg} ${config.text} flex items-center justify-center mb-4 ring-8 ring-transparent group-hover:ring-slate-50 transition-all shadow-sm`}>
                   <StatusIcon className="w-8 h-8" />
                </div>

                <h3 className="text-base font-black text-slate-800 mb-1">{table.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{table.area || 'Không xác định'}</p>

                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${config.bg} ${config.text} border ${config.border} mb-4`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                    {config.label}
                </div>

                <div className="mt-auto w-full pt-4 border-t border-slate-100 flex items-center justify-between">
                   <div className="flex items-center gap-1 text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{table.capacity}</span>
                   </div>
                   {table.current_order && (
                      <span className="text-xs font-black text-[#ed2a2a]">
                        {formatMoney(
                          table.current_order.total_price ??
                          table.current_order.final_total ??
                          table.current_order.total ??
                          0
                        )}đ
                      </span>
                   )}
                </div>

                {/* Fast Action (Hidden on mobile) */}
                <button className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-opacity">
                   <Info className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-8 py-10">
         {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
           <div key={key} className="flex items-center gap-2">
             <div className={`w-4 h-4 rounded-lg ${cfg.bg} border ${cfg.border} ring-2 ring-white ring-offset-2 ring-offset-slate-100`} />
             <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{cfg.label}</span>
           </div>
         ))}
      </div>
    </div>
  )
}
