'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, MapPin, Phone, User, 
  CreditCard, Truck, MessageSquare, 
  Ticket, Wallet, CheckCircle2, 
  ChevronDown, ChevronUp, Loader2, Star
} from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/authStore'
import AddressForm from '@/components/checkout/AddressForm'
import CheckoutDeliveryPanel from '@/components/checkout/CheckoutDeliveryPanel'
import DeliveryMapPicker, { type DeliveryLocation } from '@/components/checkout/DeliveryMapPicker'
import api from '@/services/api'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { voucherService } from '@/services/voucher.service'
import type { Voucher } from '@/types'
import type { CheckoutPaymentMethod } from '@/lib/payment-flow'
import {
  checkoutCtaLabel,
  DEFAULT_CHECKOUT_PAYMENT,
  VNPAY_MIN_AMOUNT,
  canUseVnpay,
  vnpayMinAmountMessage,
} from '@/lib/payment-flow'
import { buildCheckoutBill, meetsMinDeliveryOrder, minDeliveryOrderMessage, MIN_DELIVERY_ORDER_AMOUNT } from '@/lib/checkout-bill'
import { deliveryService } from '@/services/delivery.service'
import { TIER_LABELS, type UserTier } from '@/types'
import { paymentService } from '@/services/payment.service'
import PaymentMethodPicker from '@/components/payment/PaymentMethodPicker'
import { tableService } from '@/services/table.service'
import Pusher from 'pusher-js'

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { items, clearCart, tableId, tableSessionToken, reconcilePrices } = useCartStore()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMobileSummary, setShowMobileSummary] = useState(false)
  const [deliveryType, setDeliveryType] = useState<'self' | 'other'>('self') // self = giao cho tôi, other = giao cho người khác
  const [selfLocationMode, setSelfLocationMode] = useState<'saved' | 'other'>('saved')
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([])
  const [showVoucherSuggestions, setShowVoucherSuggestions] = useState(false)
  const [validatingVoucher, setValidatingVoucher] = useState(false)
  const [appliedVoucherDiscount, setAppliedVoucherDiscount] = useState(0)

  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [addressDetails, setAddressDetails] = useState<any>(null)
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null)
  const [note, setNote] = useState('')
  const [shippingMethod, setShippingMethod] = useState('standard') // standard | express
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>(DEFAULT_CHECKOUT_PAYMENT)
  const [voucherCode, setVoucherCode] = useState('')
  const [usePoints, setUsePoints] = useState(false)
  const [requestingPayment, setRequestingPayment] = useState(false)
  /** Giao hàng vs tại bàn — mặc định giao hàng khi vào checkout */
  const [orderMode, setOrderMode] = useState<'delivery' | 'dine_in'>('delivery')
  const [minDeliveryOrderAmount, setMinDeliveryOrderAmount] = useState(MIN_DELIVERY_ORDER_AMOUNT)
  const isDineIn = orderMode === 'dine_in' && Boolean(tableId)
  const [currentTableOrder, setCurrentTableOrder] = useState<null | {
    id: number
    status: string
    total: number
    discount_amount: number
    final_total: number
    items: Array<{ id: number; name: string; image?: string | null; quantity: number; price: number; subtotal: number }>
  }>(null)

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    if (params.get('dine_in') === '1' && tableId) {
      setOrderMode('dine_in')
    } else {
      setOrderMode('delivery')
    }
    // Auto-fill nếu user đã đăng nhập và chọn "Giao cho tôi"
    if (user && deliveryType === 'self') {
       setName(user.name || '')
       setPhone(user.phone || '')
       if (user.address) {
         setAddress(user.address)
         setSelfLocationMode('saved')
       } else {
         setSelfLocationMode('other')
       }
    }
    // Fetch available vouchers
    fetchAvailableVouchers()
    deliveryService.getConfig()
      .then((config) => {
        if (config.min_order_amount > 0) {
          setMinDeliveryOrderAmount(config.min_order_amount)
        }
      })
      .catch(() => {})
  }, [user, deliveryType, tableId])

  const switchToDelivery = () => {
    setOrderMode('delivery')
    setDeliveryLocation(null)
  }

  const switchToDineIn = () => {
    if (!tableId) return
    setOrderMode('dine_in')
    setDeliveryLocation(null)
  }

  const handleDeliveryTypeSelf = () => {
    setDeliveryType('self')
    setOrderMode('delivery')
    setDeliveryLocation(null)
    if (user?.address) {
      setAddress(user.address)
      setSelfLocationMode('saved')
    } else {
      setSelfLocationMode('other')
    }
  }

  const handleDeliveryTypeOther = () => {
    setDeliveryType('other')
    setOrderMode('delivery')
    setName('')
    setPhone('')
    setAddress('')
    setAddressDetails(null)
    setDeliveryLocation(null)
    setSelfLocationMode('other')
  }

  const handleSelfLocationSaved = () => {
    setSelfLocationMode('saved')
    if (user?.address) {
      setAddress(user.address)
      setAddressDetails({
        provinceCode: user.province_code,
        wardCode: user.ward_code,
        fullAddress: user.address,
      })
    }
    setDeliveryLocation(null)
  }

  const handleSelfLocationOther = () => {
    setSelfLocationMode('other')
    setAddress('')
    setAddressDetails(null)
    setDeliveryLocation(null)
  }

  // Re-validate voucher when cart items change
  useEffect(() => {
    if (voucherCode && appliedVoucherDiscount > 0 && mounted) {
      // Debounce re-validation to avoid too many API calls
      const timer = setTimeout(() => {
        applyVoucher(voucherCode)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [items.length, isDineIn, currentTableOrder?.final_total, mounted])

  const fetchAvailableVouchers = async () => {
    try {
      const vouchers = await voucherService.getPublicVouchers({ status: 'active', limit: 10 })
      setAvailableVouchers(vouchers)
    } catch (error) {
      console.error('Failed to fetch vouchers:', error)
    }
  }

  const applyVoucher = async (code: string) => {
    if (!code.trim()) {
      toast.error('Vui lòng nhập mã giảm giá')
      return
    }

    setValidatingVoucher(true)
    try {
      const cartSubtotal = items.reduce(
        (s, item) => s + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
        0,
      )
      const currentSubtotal = Math.round(Math.max(0, cartSubtotal) * 100) / 100
      const productIds = items.map(item => item.productId).filter(Boolean)
      const result = await voucherService.validate(code, currentSubtotal, productIds)
      
      if (result.valid) {
        setVoucherCode(code)
        setAppliedVoucherDiscount(result.discount)
        toast.success('Áp dụng mã thành công!', {
          description: `Giảm ${result.discount.toLocaleString()}đ`
        })
        setShowVoucherSuggestions(false)
      }
    } catch (error: any) {
      toast.error('Mã không hợp lệ', {
        description: error.response?.data?.message || 'Không thể áp dụng mã này'
      })
      setAppliedVoucherDiscount(0)
    } finally {
      setValidatingVoucher(false)
    }
  }

  const removeVoucher = () => {
    setVoucherCode('')
    setAppliedVoucherDiscount(0)
    toast.info('Đã xóa mã giảm giá')
  }

  // Calculations
  const userPoints = user?.loyalty_points || 0

  const bill = useMemo(
    () =>
      buildCheckoutBill({
        items,
        isDineIn,
        shippingMethod: shippingMethod as 'standard' | 'express',
        appliedVoucherDiscount,
        usePoints,
        userPoints,
        userTier: (user?.tier as UserTier | undefined) ?? null,
        tableOrderFinalTotal: currentTableOrder?.final_total,
      }),
    [
      items,
      isDineIn,
      shippingMethod,
      appliedVoucherDiscount,
      usePoints,
      userPoints,
      user?.tier,
      currentTableOrder?.final_total,
    ],
  )

  const {
    lines: billLines,
    cartSubtotal: subtotal,
    shippingFee,
    comboOriginalTotal,
    comboDiscountTotal,
    tierDiscount,
    voucherDiscount,
    pointsDiscount,
    payableTotal: total,
    tableOrderTotal: existingTableTotal,
    tablePlusCartDisplayTotal,
  } = bill

  const meetsMinDelivery = isDineIn || meetsMinDeliveryOrder(subtotal, minDeliveryOrderAmount)
  const deliveryShortfall = Math.max(0, minDeliveryOrderAmount - subtotal)

  useEffect(() => {
    if (paymentMethod === 'vnpay' && !canUseVnpay(total)) {
      setPaymentMethod('cod')
    }
  }, [total, paymentMethod])

  useEffect(() => {
    if (!tableId) {
      setCurrentTableOrder(null)
      return
    }
    const fetchCurrentOrder = async () => {
      try {
        const order = await tableService.getCurrentOrder(Number(tableId))
        setCurrentTableOrder(order)
      } catch {
        setCurrentTableOrder(null)
      }
    }
    fetchCurrentOrder()
    const timer = window.setInterval(fetchCurrentOrder, 12000)

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1'
    let pusher: Pusher | null = null
    let channel: any = null
    if (key) {
      pusher = new Pusher(key, { cluster })
      channel = pusher.subscribe('hdg.tables')
      channel.bind('table.workflow.updated', (payload: any) => {
        if (Number(payload?.table_id) === Number(tableId) && ['order_appended', 'order_created'].includes(String(payload?.action))) {
          fetchCurrentOrder()
          toast.info('Đơn tại bàn vừa được cập nhật.')
        }
      })
    }

    return () => {
      window.clearInterval(timer)
      if (channel && pusher) {
        channel.unbind_all()
        pusher.unsubscribe('hdg.tables')
        pusher.disconnect()
      }
    }
  }, [tableId])

  if (!mounted) return null

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50">
         <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
            <Truck className="w-10 h-10 text-slate-300" />
         </div>
         <h2 className="text-2xl font-black text-slate-900 uppercase italic">Giỏ hàng trống</h2>
         <p className="text-slate-500 mt-2 mb-8">Vui lòng chọn món trước khi thanh toán nhé!</p>
         <Link href="/" className="px-8 py-4 bg-[#ed2a2a] text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-colors shadow-xl shadow-red-500/20">
            Quay lại thực đơn
         </Link>
      </div>
    )
  }

  const handleCheckout = async () => {
    // Validation based on delivery type
    if (isDineIn) {
      if (!(deliveryType === 'self' && user) && (!name.trim() || !phone.trim())) {
        toast.error('Lỗi thông tin', { description: 'Vui lòng điền Họ tên và SĐT để xác nhận đơn tại bàn.' })
        return
      }
    } else if (deliveryType === 'self' && user) {
      // Nếu giao cho tôi, dùng thông tin user
      if (!user.name || !user.phone) {
        toast.error('Lỗi thông tin', { description: 'Vui lòng cập nhật đầy đủ thông tin tài khoản trước khi đặt hàng.' })
        return
      }
      // Nếu user chưa có địa chỉ, yêu cầu nhập
      if (!deliveryLocation?.confirmed || !deliveryLocation?.withinRadius) {
        toast.error('Chưa xác nhận vị trí', {
          description: deliveryLocation?.withinRadius === false
            ? (deliveryLocation?.message || 'Vui lòng chọn vị trí trong vùng giao hàng.')
            : 'Vui lòng ghim vị trí và bấm "Xác nhận & lưu vị trí giao hàng".',
        })
        return
      }
      if (!addressDetails?.provinceCode || !addressDetails?.districtCode || !addressDetails?.wardCode) {
        toast.error('Chưa đủ địa chỉ', {
          description: 'Vui lòng kiểm tra Tỉnh/Quận/Phường sau khi ghim vị trí (chọn thủ công nếu chưa tự điền).',
        })
        return
      }
      if (selfLocationMode === 'other' && !address.trim() && !deliveryLocation.resolvedAddress) {
        toast.error('Lỗi địa chỉ', { description: 'Vui lòng xác nhận địa chỉ giao hàng trên bản đồ.' })
        return
      }
    } else {
      // Nếu giao cho người khác hoặc chưa đăng nhập, validate form
      if (!name.trim() || !phone.trim()) {
        toast.error('Lỗi thông tin', { description: 'Vui lòng điền Họ tên và SĐT người nhận.' })
        return
      }
      if (!deliveryLocation?.confirmed || !deliveryLocation?.withinRadius) {
        toast.error('Chưa xác nhận vị trí', {
          description: deliveryLocation?.withinRadius === false
            ? (deliveryLocation?.message || 'Vui lòng chọn vị trí trong vùng giao hàng.')
            : 'Vui lòng ghim vị trí và bấm "Xác nhận & lưu vị trí giao hàng".',
        })
        return
      }
      if (!addressDetails?.provinceCode || !addressDetails?.districtCode || !addressDetails?.wardCode) {
        toast.error('Chưa đủ địa chỉ', {
          description: 'Vui lòng kiểm tra Tỉnh/Quận/Phường sau khi ghim vị trí (chọn thủ công nếu chưa tự điền).',
        })
        return
      }
      if (!address.trim() && !deliveryLocation?.resolvedAddress) {
        toast.error('Lỗi địa chỉ', { description: 'Vui lòng xác nhận địa chỉ giao hàng trên bản đồ.' })
        return
      }
    }

    if (!isDineIn && !meetsMinDeliveryOrder(subtotal, minDeliveryOrderAmount)) {
      toast.error('Đơn giao hàng chưa đủ giá trị', {
        description: minDeliveryOrderMessage(minDeliveryOrderAmount),
      })
      return
    }

    if (paymentMethod === 'vnpay' && !canUseVnpay(total)) {
      toast.error(vnpayMinAmountMessage())
      return
    }

    setLoading(true)

    try {
      // 1. Đồng bộ giá và tồn kho trước khi đặt (Sync)
      const regularItems = items.filter(item => !item.isCombo)
      if (regularItems.length > 0) {
        const syncRes = await api.post('/cart/sync', { items: regularItems })
        if (syncRes.data.alerts && syncRes.data.alerts.length > 0) {
           toast.error('Có sự thay đổi trong giỏ hàng', { description: syncRes.data.alerts.join(', ') })
           setLoading(false)
           return
        }
        const validItems = syncRes.data?.valid_items as Array<{
          productId: number
          price: number
          options?: Record<string, unknown> | null
          is_price_changed?: boolean
        }> | undefined
        if (validItems?.length) {
          reconcilePrices(
            validItems.map((v) => ({
              productId: v.productId,
              price: Number(v.price),
              options: v.options ?? null,
            })),
          )
          if (validItems.some((v) => v.is_price_changed)) {
            toast.info('Giá món đã được cập nhật theo thực đơn hiện tại.')
          }
        }
      }

      // 2. Format đơn hàng gửi lên backend
      const payload = {
        customer_name: deliveryType === 'self' && user ? user.name : name,
        customer_phone: deliveryType === 'self' && user ? user.phone : phone,
        table_number: isDineIn ? String(tableId) : undefined,
        table_session_token: isDineIn ? (tableSessionToken || null) : null,
        shipping_address: isDineIn ? null : (
          deliveryType === 'self' && user
            ? (deliveryLocation?.confirmed && deliveryLocation.resolvedAddress
                ? deliveryLocation.resolvedAddress
                : selfLocationMode === 'saved'
                  ? (user.address || address)
                  : address)
            : (deliveryLocation?.resolvedAddress || address)
        ),
        delivery_latitude: isDineIn ? null : deliveryLocation?.latitude,
        delivery_longitude: isDineIn ? null : deliveryLocation?.longitude,
        delivery_province_code: isDineIn ? null : (
          deliveryType === 'self' && selfLocationMode === 'saved'
            ? user?.province_code
            : addressDetails?.provinceCode
        ),
        delivery_district_code: isDineIn ? null : addressDetails?.districtCode,
        delivery_ward_code: isDineIn ? null : (
          deliveryType === 'self' && selfLocationMode === 'saved'
            ? user?.ward_code
            : addressDetails?.wardCode
        ),
        shipping_method: isDineIn ? 'dine_in' : shippingMethod,
        payment_method: paymentMethod,
        shipping_fee: isDineIn ? 0 : shippingFee,
        note: note,
        voucher_code: voucherCode || null,
        user_id: user?.id || null,
        items: items.map(item => {
          if (item.isCombo && item.comboId) {
            return {
              type: 'combo',
              combo_id: item.comboId,
              quantity: item.quantity,
              selections: item.comboSelections || [],
            }
          }
          return {
            type: 'product',
            product_id: item.productId,
            quantity: item.quantity,
          }
        })
      }

      const orderEndpoint = user ? '/orders' : '/orders/guest'
      const res = await api.post(orderEndpoint, payload)

      try {
        const orderId = Number(res?.data?.data?.id)
        if (orderId) {
          const orderBill = {
            createdAt: new Date().toISOString(),
            items: items.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.price || 0),
              subtotal: Number(item.price || 0) * Number(item.quantity || 1),
              isCombo: Boolean(item.isCombo),
            })),
            existingTableTotal: Number(existingTableTotal || 0),
            subtotal: Number(subtotal || 0),
            shippingFee: Number(shippingFee || 0),
            comboDiscountTotal: Number(comboDiscountTotal || 0),
            tierDiscount: Number(tierDiscount || 0),
            voucherDiscount: Number(voucherDiscount || 0),
            pointsDiscount: Number(pointsDiscount || 0),
            total: Number(total || 0),
            voucherCode: voucherCode || '',
            paymentMethod,
          }
          window.sessionStorage.setItem(`order_bill_${orderId}`, JSON.stringify(orderBill))
          const checkoutPhone = deliveryType === 'self' && user ? (user.phone || phone) : phone
          if (checkoutPhone) {
            window.sessionStorage.setItem(`order_checkout_phone_${orderId}`, checkoutPhone)
          }
        }
      } catch {
        // Không chặn flow nếu lưu bill tạm thất bại
      }
      
      const createdOrder = res?.data?.data as
        | { id?: number; payment_method?: string; total_price?: number }
        | undefined
      const orderId = Number(createdOrder?.id)
      const orderPayable = Math.round(Number(createdOrder?.total_price ?? total))
      const checkoutPhone = deliveryType === 'self' && user ? (user.phone || phone) : phone

      if (paymentMethod === 'vnpay' && orderId) {
        if (!canUseVnpay(orderPayable)) {
          clearCart()
          toast.warning(vnpayMinAmountMessage(), {
            description: `Đơn đã tạo. Chọn COD hoặc đặt đơn mới với tổng từ ${VNPAY_MIN_AMOUNT.toLocaleString('vi-VN')}đ.`,
          })
          router.push(
            `/checkout/success?order_id=${orderId}&payment_method=vnpay&total=${orderPayable}`,
          )
          return
        }
        try {
          const { payment_url } = await paymentService.createVnpayPayment(
            orderId,
            checkoutPhone || undefined,
            Boolean(user),
          )
          clearCart()
          toast.success('Chuyển sang cổng VNPay...')
          window.location.href = payment_url
          return
        } catch (vnpayErr: unknown) {
          const msg = (vnpayErr as { response?: { data?: { message?: string } } })?.response?.data?.message
          clearCart()
          toast.error('Không mở được VNPay', { description: msg || 'Kiểm tra cấu hình VNPAY trên server.' })
          router.push(
            `/checkout/success?order_id=${orderId}&payment_method=vnpay&total=${orderPayable}`,
          )
          return
        }
      }

      clearCart()
      toast.success('Đặt hàng thành công!')
      router.push(`/checkout/success?order_id=${orderId}&payment_method=${paymentMethod}&total=${total}`)

    } catch (error: any) {
      toast.error('Lỗi đặt hàng', { 
         description: error.response?.data?.message || 'Không thể tạo đơn hàng, vui lòng thử lại.' 
      })
      setLoading(false)
    }
  }

  const handleRequestPayment = async () => {
    if (!tableId) return
    setRequestingPayment(true)
    try {
      await api.post(`/tables/${tableId}/request-payment`, { session_token: tableSessionToken })
      toast.success('Đã gửi yêu cầu thanh toán tới quầy.')
    } catch {
      toast.error('Không gửi được yêu cầu thanh toán.')
    } finally {
      setRequestingPayment(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 lg:pb-0">
      <div className="container mx-auto max-w-6xl px-4 lg:px-6">
        
        {/* Simple Header */}
        <div className="py-6 lg:py-8 flex items-center justify-between">
           <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-[#ed2a2a] transition-colors font-bold text-sm">
              <ArrowLeft className="w-4 h-4" /> Tiếp tục chọn món
           </Link>
           <h1 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-slate-900 italic">Thanh toán</h1>
        </div>

        {/* Mobile: Order Summary Toggle */}
        <div className="lg:hidden bg-white mb-6 -mx-4 px-4 border-y border-slate-100">
           <button 
             onClick={() => setShowMobileSummary(!showMobileSummary)}
             className="w-full py-4 flex items-center justify-between text-sm font-black uppercase text-[#ed2a2a]"
           >
              <span className="flex items-center gap-2">
                 <Ticket className="w-4 h-4" /> 
                 {showMobileSummary ? 'Ẩn tóm tắt đơn hàng' : 'Hiển thị tóm tắt đơn hàng'}
              </span>
              <div className="flex items-center gap-2 font-black italic text-lg">
                 {total.toLocaleString()}đ
                 {showMobileSummary ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
           </button>
           
           <AnimatePresence>
              {showMobileSummary && (
                <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="overflow-hidden"
                >
                   <div className="pb-6 border-t border-slate-100 pt-4">
                      {billLines.map((line) => {
                         const item = items.find((i) => i.id === line.id)
                         return (
                         <div key={line.id} className="flex gap-4 py-2">
                           <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 overflow-hidden relative border border-slate-200">
                             <img src={item?.image} className="w-full h-full object-cover" alt="" />
                             <span className="absolute -top-1 -right-1 bg-slate-900 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black">{line.quantity}</span>
                           </div>
                           <div className="flex-1 min-w-0">
                             <h4 className="text-xs font-black uppercase text-slate-900 line-clamp-1">{line.name}</h4>
                             {item?.options && <p className="text-[10px] text-slate-500 uppercase">{Object.values(item.options).join(', ')}</p>}
                             <p className="text-[10px] text-slate-400 mt-0.5">{line.unitPrice.toLocaleString()}đ × {line.quantity}</p>
                           </div>
                           <div className="text-sm font-black text-slate-900 shrink-0 italic">
                              {line.lineTotal.toLocaleString()}đ
                           </div>
                         </div>
                      )})}
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* MAIN LAYOUT: 60 / 40 */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: Form (60%) */}
          <div className="flex-1 space-y-8">
             
             {/* 1. Thông tin giao hàng */}
             <section className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-[#ed2a2a] flex items-center gap-2">
                   <User className="w-4 h-4" /> Thông tin nhận hàng
                </h2>

                <CheckoutDeliveryPanel
                  tableId={tableId}
                  orderMode={orderMode}
                  deliveryType={deliveryType}
                  selfLocationMode={selfLocationMode}
                  user={user ? { name: user.name, phone: user.phone, address: user.address } : null}
                  onOrderModeChange={(mode) => (mode === 'delivery' ? switchToDelivery() : switchToDineIn())}
                  onDeliveryTypeChange={(type) => (type === 'self' ? handleDeliveryTypeSelf() : handleDeliveryTypeOther())}
                  onSelfLocationModeChange={(mode) => (mode === 'saved' ? handleSelfLocationSaved() : handleSelfLocationOther())}
                  onEditProfile={() => router.push('/profile?tab=info')}
                />

                {/* Ghim vị trí */}
                {orderMode === 'delivery' && user && deliveryType === 'self' && (
                  <DeliveryMapPicker
                    key={`self-${selfLocationMode}`}
                    savedAddressHint={selfLocationMode === 'saved' && user.address ? user.address : undefined}
                    autoLocate={selfLocationMode === 'other'}
                    onLocationChange={setDeliveryLocation}
                    onAddressResolved={(addr) => setAddress(addr)}
                  />
                )}

                {/* Địa chỉ chi tiết — hiện sau khi xác nhận vị trí trên bản đồ */}
                {orderMode === 'delivery' && user && deliveryType === 'self' && deliveryLocation?.confirmed && (
                  <AddressForm
                    hideMap
                    fillFromLocation={deliveryLocation}
                    onAddressChange={(addr) => {
                      setAddress(addr.fullAddress)
                      setAddressDetails(addr)
                    }}
                    onAddressResolved={setAddress}
                  />
                )}

                {/* Form đặt hộ hoặc khách chưa đăng nhập */}
                {orderMode === 'delivery' && (deliveryType === 'other' || !user) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                       <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase text-slate-500">Họ và tên *</label>
                          <input 
                             type="text" value={name} onChange={e => setName(e.target.value)}
                             className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-sm"
                             placeholder="Tên người nhận..."
                             required
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase text-slate-500">Số điện thoại *</label>
                          <input 
                             type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                             className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-sm"
                             placeholder="Số điện thoại liên lạc..."
                             required
                          />
                       </div>
                    </div>

                    {/* Address Form Component */}
                    <div className="pt-4">
                       <AddressForm 
                         onAddressChange={(addr) => {
                           setAddress(addr.fullAddress)
                           setAddressDetails(addr)
                           if (addr.deliveryLocation) {
                             setDeliveryLocation(addr.deliveryLocation)
                           }
                         }}
                         onDeliveryLocationChange={setDeliveryLocation}
                         onAddressResolved={(addr) => setAddress(addr)}
                       />
                    </div>
                  </>
                )}

                <div className="space-y-2 pt-4">
                   <label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      Ghi chú đơn hàng <MessageSquare className="w-3 h-3 text-slate-400" />
                   </label>
                   <textarea 
                      value={note} onChange={e => setNote(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-sm resize-none min-h-[80px]"
                      placeholder="Lấy thêm tương ớt, giao trước 12h..."
                   />
                </div>
             </section>

             {/* 2. Phương thức vận chuyển */}
             {orderMode === 'delivery' ? (
             <section className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-4">
                   <Truck className="w-4 h-4 text-emerald-500" /> Vận chuyển
                </h2>
                {!meetsMinDelivery && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    <p className="text-sm font-bold">
                      Đơn giao hàng tối thiểu {minDeliveryOrderAmount.toLocaleString('vi-VN')}₫ (chưa tính phí ship).
                    </p>
                    <p className="mt-1 text-xs text-amber-800/90">
                      Giỏ hàng hiện tại {subtotal.toLocaleString('vi-VN')}₫ — cần thêm {deliveryShortfall.toLocaleString('vi-VN')}₫ món để đặt giao hàng.
                    </p>
                    <Link
                      href="/"
                      className="mt-3 inline-flex text-xs font-black uppercase tracking-wider text-[#ed2a2a] hover:underline"
                    >
                      Quay lại chọn thêm món →
                    </Link>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${shippingMethod === 'standard' ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <input type="radio" className="hidden" name="shipping" checked={shippingMethod === 'standard'} onChange={() => setShippingMethod('standard')} />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shippingMethod === 'standard' ? 'border-emerald-500' : 'border-slate-300'}`}>
                               {shippingMethod === 'standard' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                            </div>
                            <span className="font-black text-sm text-slate-900 uppercase">Giao tiêu chuẩn</span>
                         </div>
                         <span className="font-bold text-emerald-600">15.000đ</span>
                      </div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 pl-8">Trong vòng 1-2 tiếng, bán kính ~25km từ quán</p>
                   </label>

                   <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${shippingMethod === 'express' ? 'border-[#ed2a2a] bg-red-50/30' : 'border-slate-100 hover:border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <input type="radio" className="hidden" name="shipping" checked={shippingMethod === 'express'} onChange={() => setShippingMethod('express')} />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shippingMethod === 'express' ? 'border-[#ed2a2a]' : 'border-slate-300'}`}>
                               {shippingMethod === 'express' && <div className="w-2.5 h-2.5 bg-[#ed2a2a] rounded-full" />}
                            </div>
                            <span className="font-black text-sm text-[#ed2a2a] uppercase">Giao Hỏa Tốc</span>
                         </div>
                         <span className="font-bold text-[#ed2a2a]">30.000đ</span>
                      </div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 pl-8">Giao nhanh dưới 30 phút</p>
                   </label>
                </div>
             </section>
             ) : null}

             {/* 3. Phương thức thanh toán */}
             <section className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-4">
                   <CreditCard className="w-4 h-4 text-blue-500" /> Thanh toán
                </h2>
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  payableTotal={total}
                />
             </section>

          </div>

          {/* RIGHT COLUMN: Order Summary (40%) */}
          <div className="w-full lg:w-[400px] shrink-0 space-y-6 hidden lg:block">
             <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 sticky top-32">
                <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 border-b border-slate-100 pb-6 mb-6">
                   Tóm tắt đơn hàng
                </h2>

                {/* Items */}
                <div className="space-y-4 max-h-[40vh] overflow-y-auto scrollbar-hide mb-6 border-b border-slate-100 pb-6">
                   {billLines.map((line) => {
                      const item = items.find((i) => i.id === line.id)
                      return (
                      <div key={line.id} className="flex gap-4 group">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 shrink-0 overflow-hidden relative">
                          <img src={item?.image} alt={line.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">{line.quantity}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                           <h4 className="text-xs font-bold uppercase text-slate-900 line-clamp-1">{line.name}</h4>
                           {item?.options && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">{Object.values(item.options).join(', ')}</p>}
                           <p className="text-[10px] text-slate-400 mt-0.5">{line.unitPrice.toLocaleString()}đ × {line.quantity}</p>
                           <div className="font-bold text-red-500 italic text-sm mt-1">{line.lineTotal.toLocaleString()}đ</div>
                        </div>
                      </div>
                   )})}
                </div>

                {/* Voucher */}
                <div className="mb-6 space-y-3">
                   <div className="flex gap-2">
                     <input 
                        type="text" value={voucherCode} onChange={e => {
                          setVoucherCode(e.target.value.toUpperCase())
                          // Reset discount when user changes code
                          if (appliedVoucherDiscount > 0) {
                            setAppliedVoucherDiscount(0)
                          }
                        }}
                        placeholder="Mã giảm giá..."
                        className="flex-1 p-3 bg-white border border-slate-200/70 rounded-xl text-sm font-bold uppercase focus:border-slate-400 outline-none transition-all"
                        onFocus={() => setShowVoucherSuggestions(true)}
                     />
                     {voucherDiscount > 0 ? (
                       <button 
                          onClick={removeVoucher}
                          className="px-6 bg-red-100 text-[#ed2a2a] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-200 transition-colors"
                       >
                          Xóa
                       </button>
                     ) : (
                       <button 
                          onClick={() => applyVoucher(voucherCode)}
                          disabled={validatingVoucher || !voucherCode.trim()}
                         className="px-6 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                       >
                          {validatingVoucher ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Áp dụng
                       </button>
                     )}
                   </div>
                   {voucherDiscount > 0 && (
                     <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                       <p className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                         <CheckCircle2 className="w-3 h-3"/> Áp dụng mã thành công
                       </p>
                       <span className="text-sm font-black text-emerald-600">
                         -{voucherDiscount.toLocaleString()}đ
                       </span>
                     </div>
                   )}
                   
                   {/* Voucher Suggestions */}
                   <AnimatePresence>
                     {showVoucherSuggestions && availableVouchers.length > 0 && (
                       <motion.div
                         initial={{ opacity: 0, y: -10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -10 }}
                         className="relative"
                       >
                         <div className="absolute top-0 left-0 right-0 z-10 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto">
                           <div className="p-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
                             <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                               <Ticket className="w-4 h-4 text-[#ed2a2a]" />
                               Mã giảm giá có sẵn
                             </h4>
                             <button 
                               onClick={() => setShowVoucherSuggestions(false)}
                               className="text-slate-400 hover:text-slate-600"
                             >
                               <ChevronUp className="w-4 h-4" />
                             </button>
                           </div>
                           <div className="p-2 space-y-2">
                             {availableVouchers.map((voucher) => (
                               <button
                                 key={voucher.id}
                                 onClick={() => {
                                   setVoucherCode(voucher.code)
                                   applyVoucher(voucher.code)
                                 }}
                                 className="w-full p-3 bg-gradient-to-r from-[#ed2a2a]/5 to-amber-50 border border-[#ed2a2a]/20 rounded-xl hover:border-[#ed2a2a] transition-all text-left group"
                               >
                                 <div className="flex items-start justify-between gap-3">
                                   <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2 mb-1">
                                       <span className="px-2 py-0.5 bg-[#ed2a2a] text-white rounded text-[10px] font-black uppercase tracking-wider">
                                         {voucher.code}
                                       </span>
                                       {voucher.discount_type === 'percent' ? (
                                         <span className="text-xs font-black text-[#ed2a2a]">
                                           -{voucher.discount_value}%
                                         </span>
                                       ) : (
                                         <span className="text-xs font-black text-[#ed2a2a]">
                                           -{voucher.discount_value.toLocaleString()}đ
                                         </span>
                                       )}
                                     </div>
                                     <p className="text-[11px] font-bold text-slate-600 line-clamp-1">
                                       {voucher.name}
                                     </p>
                                     {voucher.min_order_amount && (
                                       <p className="text-[10px] text-slate-400 mt-1">
                                         Đơn tối thiểu: {voucher.min_order_amount.toLocaleString()}đ
                                       </p>
                                     )}
                                   </div>
                                   <div className="shrink-0 w-6 h-6 rounded-full bg-white border-2 border-slate-200 group-hover:border-[#ed2a2a] group-hover:bg-[#ed2a2a] flex items-center justify-center transition-all">
                                     <CheckCircle2 className="w-3 h-3 text-transparent group-hover:text-white transition-colors" />
                                   </div>
                                 </div>
                               </button>
                             ))}
                           </div>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>

                {/* Loyalty Points */}
                {user && userPoints > 0 && (
                   <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-600 flex items-center justify-center"><Star className="w-4 h-4 fill-amber-500 text-amber-500" /></div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-amber-700">Điểm HDG</p>
                            <p className="text-[10px] font-bold text-amber-600">Bạn có {userPoints} điểm</p>
                         </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={usePoints} onChange={() => setUsePoints(!usePoints)} />
                        <div className="w-9 h-5 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                   </div>
                )}

                {/* Calculation */}
                <div className="space-y-3 font-bold text-sm text-slate-500 mb-6">
                   {tableId && currentTableOrder && (
                     <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2">
                         Đơn hiện tại tại bàn #{tableId} (server)
                       </p>
                       <div className="max-h-36 overflow-y-auto space-y-1.5">
                         {currentTableOrder.items.map((item) => (
                           <div key={item.id} className="flex items-center justify-between text-xs">
                             <span className="font-semibold text-slate-700 line-clamp-1">{item.name} x{item.quantity}</span>
                             <span className="font-bold text-slate-800">{Number(item.subtotal || 0).toLocaleString()}đ</span>
                           </div>
                         ))}
                       </div>
                      <div className="mt-2 border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between"><span className="text-slate-500">Tạm tính </span><span className="font-semibold text-slate-700">{Number(currentTableOrder.total || 0).toLocaleString()}đ</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Giảm giá</span><span className="font-semibold text-emerald-700">-{Number(currentTableOrder.discount_amount || 0).toLocaleString()}đ</span></div>
                        <div className="flex items-center justify-between text-[12px] text-[#ed2a2a]"><span className="font-bold">Tổng</span><span className="font-bold">{Number(currentTableOrder.final_total || 0).toLocaleString()}đ</span></div>
                       </div>
                     </div>
                   )}
                   <div className="flex justify-between">
                     <span className="uppercase text-[11px] tracking-widest">Tạm tính món</span>
                      <span className="text-slate-900 font-black">{subtotal.toLocaleString()}đ</span>
                   </div>
                   {comboDiscountTotal > 0 && (
                     <div className="flex justify-between text-violet-600">
                       <span className="uppercase text-[11px] tracking-widest">Giảm combo (đã vào giá)</span>
                       <span className="font-black">-{comboDiscountTotal.toLocaleString()}đ</span>
                     </div>
                   )}
                   {comboDiscountTotal > 0 && (
                     <div className="flex justify-between text-[11px] text-violet-500/90">
                       <span>Giá gốc combo</span>
                       <span>{comboOriginalTotal.toLocaleString()}đ</span>
                     </div>
                   )}
                   <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Khuyến mãi SP</span>
                      <span>Đã tính vào đơn giá từng dòng</span>
                   </div>
                   {tierDiscount > 0 && user?.tier && (
                     <div className="flex justify-between text-indigo-600">
                       <span className="uppercase text-[11px] tracking-widest">Ưu đãi {TIER_LABELS[user.tier as UserTier]}</span>
                       <span className="font-black">- {tierDiscount.toLocaleString()}đ</span>
                     </div>
                   )}
                   {!isDineIn && (
                   <div className="flex justify-between">
                      <span className="uppercase text-[11px] tracking-widest">Phí vận chuyển</span>
                      <span className="text-slate-900 font-black">{shippingFee.toLocaleString()}đ</span>
                   </div>
                   )}
                   {voucherDiscount > 0 && (
                     <div className="flex justify-between text-[#ed2a2a]">
                        <span className="uppercase text-[11px] tracking-widest flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          Mã {voucherCode}
                        </span>
                        <span className="font-black">- {voucherDiscount.toLocaleString()}đ</span>
                     </div>
                   )}
                   {pointsDiscount > 0 && (
                     <div className="flex justify-between text-amber-500">
                        <span className="uppercase text-[11px] tracking-widest">Dùng điểm</span>
                        <span className="font-black">- {pointsDiscount.toLocaleString()}đ</span>
                     </div>
                   )}
                   {(tierDiscount > 0 || voucherDiscount > 0 || pointsDiscount > 0) && (
                     <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                       <div className="flex justify-between text-emerald-700 text-[12px]">
                         <span className="font-black uppercase tracking-wider">Tổng giảm</span>
                         <span className="font-black">- {(tierDiscount + voucherDiscount + pointsDiscount).toLocaleString()}đ</span>
                       </div>
                       <div className="mt-1 flex justify-between text-[11px] text-emerald-700/90">
                         <span>Sau giảm{!isDineIn ? ' (chưa ship)' : ''}</span>
                         <span className="font-bold">{Math.max(0, subtotal - tierDiscount - voucherDiscount - pointsDiscount).toLocaleString()}đ</span>
                       </div>
                     </div>
                   )}
                   {isDineIn && existingTableTotal > 0 && (
                     <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-dashed border-slate-200">
                       <span>Tổng bill bàn (tham khảo)</span>
                       <span>{tablePlusCartDisplayTotal.toLocaleString()}đ</span>
                     </div>
                   )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-6 mb-4">
                   <span className="font-black uppercase tracking-widest text-slate-900">
                     {isDineIn && existingTableTotal > 0 ? 'Thanh toán lần này' : 'Tổng cộng'}
                   </span>
                   <span className="text-4xl font-black text-[#ed2a2a] italic">{total.toLocaleString()}đ</span>
                </div>

                {!meetsMinDelivery && (
                  <p className="mb-4 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Cần đơn từ {minDeliveryOrderAmount.toLocaleString('vi-VN')}₫ để giao hàng (thiếu {deliveryShortfall.toLocaleString('vi-VN')}₫).
                  </p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={loading || !meetsMinDelivery}
                  className="w-full h-16 bg-[#ed2a2a] text-white rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-[0_12px_30px_rgba(237,42,42,0.45)] hover:brightness-110 transition-all active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:pointer-events-none"
                >
                   {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : checkoutCtaLabel(paymentMethod)}
                </button>
                {tableId && (
                  <button
                    onClick={handleRequestPayment}
                    disabled={requestingPayment}
                    className="w-full mt-3 h-12 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold uppercase tracking-[0.12em] hover:bg-slate-200 transition-all disabled:opacity-60"
                  >
                    {requestingPayment ? 'Đang gửi...' : 'Gọi thanh toán tại quầy'}
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BUTTON */}
      <div className="fixed bottom-0 left-0 w-full z-50 lg:hidden px-4 pb-6 pt-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
         <div className="container mx-auto flex items-center justify-between gap-6">
            <div className="min-w-0">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tổng thanh toán</h4>
               <p className="text-xl font-black text-[#ed2a2a] italic">{total.toLocaleString()}đ</p>
            </div>
            <button 
               onClick={handleCheckout} disabled={loading || !meetsMinDelivery}
               className="px-8 h-14 bg-[#ed2a2a] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center min-w-[140px] disabled:opacity-70 disabled:pointer-events-none"
            >
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : checkoutCtaLabel(paymentMethod)}
            </button>
            {tableId && (
              <button
                onClick={handleRequestPayment}
                disabled={requestingPayment}
                className="px-5 h-14 bg-slate-100 text-slate-700 rounded-2xl text-[10px] font-bold uppercase tracking-[0.14em] transition-all"
              >
                Gọi quầy
              </button>
            )}
         </div>
      </div>
    </div>
  )
}
