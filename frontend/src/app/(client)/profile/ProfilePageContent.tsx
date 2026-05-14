'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  UserCircle, Package, Lock, Heart, LogOut,
  Shield, Star, Crown, Award, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { profileService } from '@/services/profile.service'
import PersonalInfoForm from '@/components/profile/PersonalInfoForm'
import OrderHistory from '@/components/profile/OrderHistory'
import ChangePassword from '@/components/profile/ChangePassword'
import WishlistTab from '@/components/profile/WishlistTab'
import LoyaltyTab from '@/components/profile/LoyaltyTab'
import { maskEmail } from '@/lib/pii'

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; border: string }> = {
  regular: { label: 'Member',  color: 'text-slate-600',  bg: 'bg-slate-100',    icon: Shield, border: 'border-slate-200' },
  silver:  { label: 'Silver',  color: 'text-slate-700',  bg: 'bg-slate-200',    icon: Star,   border: 'border-slate-300' },
  gold:    { label: 'Gold',    color: 'text-yellow-700', bg: 'bg-yellow-100',   icon: Crown,  border: 'border-yellow-300' },
  vip:     { label: 'VIP',     color: 'text-red-700',    bg: 'bg-red-100',      icon: Award,  border: 'border-red-300' },
}

type TabKey = 'info' | 'orders' | 'password' | 'wishlist' | 'loyalty'

const MENU_ITEMS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'info',     label: 'Thông tin cá nhân',  icon: UserCircle },
  { key: 'orders',   label: 'Đơn hàng của tôi',   icon: Package },
  { key: 'loyalty',  label: 'Điểm thưởng',        icon: Star },
  { key: 'password', label: 'Đổi mật khẩu',       icon: Lock },
  { key: 'wishlist', label: 'Yêu thích',           icon: Heart },
]

export default function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, clearAuth, setAuth } = useAuthStore()

  // Không gọi persist trong initializer: SSR không có persist / hasHydrated → lỗi "undefined".
  const [authHydrated, setAuthHydrated] = useState(false)

  const initialTab = (searchParams.get('tab') as TabKey) || 'info'
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [stats, setStats] = useState({ total_orders: 0, total_spent: 0, wishlist_count: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = useAuthStore.persist
    if (!p?.hasHydrated) {
      setAuthHydrated(true)
      return
    }
    if (p.hasHydrated()) {
      setAuthHydrated(true)
      return
    }
    const unsub = p.onFinishHydration(() => setAuthHydrated(true))
    return unsub
  }, [])

  // Chỉ phụ thuộc user?.id: loadStats() gọi setAuth() làm object user mới → nếu deps là [user] sẽ lặp vô hạn /profile.
  useEffect(() => {
    if (!authHydrated) return
    if (!user) {
      router.push('/login')
      return
    }
    loadStats()
  }, [authHydrated, user?.id, router])

  useEffect(() => {
    const tab = searchParams.get('tab') as TabKey
    if (tab && MENU_ITEMS.some(m => m.key === tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const loadStats = async () => {
    try {
      const data = await profileService.getProfile()
      setStats({
        total_orders: data.stats?.total_orders ?? 0,
        total_spent: Number(data.stats?.total_spent ?? 0),
        wishlist_count: data.stats?.wishlist_count ?? 0,
      })
      // Đồng bộ user từ server (địa chỉ/tier/…) để tab Thông tin khớp DB và tránh lỗi API im lặng.
      const raw = typeof window !== 'undefined' ? localStorage.getItem('HDG-auth-storage') : null
      const token = raw ? (JSON.parse(raw)?.state?.token as string | null) : null
      if (token && data.user) setAuth(data.user, token)
    } catch (e: any) {
      if (e?.response?.status === 403 && e?.response?.data?.reason === 'account_disabled') return
      const msg = e?.response?.data?.message || 'Không tải được thông tin tài khoản (API /profile).'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key)
    router.push(`/profile?tab=${key}`, { scroll: false })
  }

  const handleLogout = () => {
    clearAuth()
    toast.success('Đã đăng xuất thành công')
    router.push('/')
  }

  if (!authHydrated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin mb-4" />
        <span className="font-bold text-slate-500 uppercase tracking-widest text-sm">Đang tải...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin mb-4" />
        <span className="font-bold text-slate-500 uppercase tracking-widest text-sm">Đang chuyển hướng...</span>
      </div>
    )
  }

  const tierInfo = TIER_CONFIG[user.tier] || TIER_CONFIG.regular
  const TierIcon = tierInfo.icon

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 mt-24 lg:mt-28 pb-28 lg:pb-10">
      {/* Mobile Tab Bar */}
      <div className="lg:hidden mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.key
            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(item.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border-2 ${
                  isActive
                    ? 'bg-[#ed2a2a] text-white border-[#ed2a2a] shadow-lg shadow-red-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#ed2a2a]/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ═══ SIDEBAR (25%) ═══ */}
        <aside className="hidden lg:block lg:w-[280px] flex-shrink-0 space-y-6">
          {/* User Card */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-[#ed2a2a] to-[#ff6b6b] p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-3 shadow-lg overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-9 h-9 text-white" />
                  )}
                </div>
                <h3 className="font-black text-lg leading-tight truncate">{user.name}</h3>
                <p className="text-white/70 text-sm font-medium truncate mt-0.5" title={user.email}>
                  {maskEmail(user.email)}
                </p>
              </div>
            </div>

            {/* Tier Badge */}
            <div className="p-4 border-b border-slate-100">
              <div className={`flex items-center gap-3 p-3 rounded-xl ${tierInfo.bg} ${tierInfo.border} border`}>
                <TierIcon className={`w-6 h-6 ${tierInfo.color}`} />
                <div>
                  <span className={`text-sm font-black ${tierInfo.color}`}>{tierInfo.label}</span>
                  <p className="text-[11px] font-bold text-slate-500">
                    Đã chi: {stats.total_spent.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-4 text-center">
                <span className="block text-2xl font-black text-slate-800">{stats.total_orders}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Đơn hàng</span>
              </div>
              <div className="p-4 text-center">
                <span className="block text-2xl font-black text-slate-800">{stats.wishlist_count}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Yêu thích</span>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-3 space-y-1">
            {MENU_ITEMS.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => handleTabChange(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                    isActive
                      ? 'bg-red-50 text-[#ed2a2a] shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#ed2a2a]' : 'text-slate-400'}`} />
                  {item.label}
                  {item.key === 'orders' && stats.total_orders > 0 && (
                    <span className={`ml-auto text-[11px] font-black px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-[#ed2a2a] text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {stats.total_orders}
                    </span>
                  )}
                </button>
              )
            })}

            <div className="h-px bg-slate-100 my-2" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all text-left"
            >
              <LogOut className="w-5 h-5" />
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* ═══ CONTENT (75%) ═══ */}
        <main className="flex-1 min-w-0">
          {activeTab === 'info' && (
            <PersonalInfoForm
              user={user}
              onUpdated={(updatedUser) => {
                // Sync to Zustand store
                const raw = localStorage.getItem('HDG-auth-storage')
                const token = raw ? JSON.parse(raw)?.state?.token : null
                if (token) setAuth(updatedUser, token)
                loadStats()
              }}
            />
          )}
          {activeTab === 'orders' && <OrderHistory />}
          {activeTab === 'loyalty' && <LoyaltyTab />}
          {activeTab === 'password' && <ChangePassword />}
          {activeTab === 'wishlist' && <WishlistTab />}
        </main>
      </div>
    </div>
  )
}