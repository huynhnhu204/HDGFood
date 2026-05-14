'use client'

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  AlertTriangle,
  Bot,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  ShoppingCart,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { foodieAssistantService } from '@/services/foodie-assistant.service'
import { parseFoodieResponse, type SuggestionCard } from '@/lib/foodie-response-parser'
import { useCartStore } from '@/store/useCartStore'
import { productService } from '@/services/product.service'
import { contactService } from '@/services/contact.service'
import { useAuthStore } from '@/store/authStore'
import type { Product } from '@/types'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  cards?: SuggestionCard[]
  understanding?: {
    normalized_input: string
    intent: {
      top: 'greeting' | 'order' | 'shipping' | 'complaint'
      score: {
        greeting: number
        order: number
        shipping: number
        complaint: number
      }
    }
    entities: {
      product?: { id: number; name: string; price: number } | null
      quantity?: number | null
      special_requests?: string[]
      address?: string | null
    }
    constraints_applied: {
      menu_grounded: boolean
      out_of_stock_blocked: boolean
      shipping_estimated: boolean
      special_request_detected: boolean
      handoff_required: boolean
      fallback_grounding_used: boolean
    }
  }
  aiStatus?: {
    ok: boolean
    code:
      | 'AI_CONFIG_MISSING'
      | 'AI_AUTH_FAILED'
      | 'AI_MODEL_NOT_FOUND'
      | 'AI_QUOTA_EXCEEDED'
      | 'AI_PROVIDER_UNAVAILABLE'
      | 'AI_PROVIDER_ERROR'
      | null
    source?: 'llm' | 'menu_heuristic'
  }
  groundingStatus?: {
    provider_cards: number
    valid_cards: number
    fallback_used: boolean
  }
  handoff?: {
    required: boolean
    reason?: string | null
  }
}

type QuickPromptChip = {
  id: 'spicy' | 'vegetarian' | 'budget'
  label: string
  prompt: string
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Dạ mình ơi, em là Foodie Expert AI của HDG Food — em gợi ý món đúng khung giờ, đúng món đang có sẵn trên menu. Mình muốn ăn no lâu, ăn vặt hay uống gì mát để em chốt nhanh ạ?',
}

const CHAT_MEMORY_KEY = 'HDG_foodie_chat_memory_v1'
const ADDRESS_HINT_REGEX =
  /(\d+\s+[a-zA-ZÀ-ỹ0-9\s./-]{4,120}|quan\s*\d+|q\.\s*\d+|phuong\s*\d+|p\.\s*\d+|duong\s+[a-zA-ZÀ-ỹ0-9\s./-]{3,120})/iu

/** Chỉ hiện grounding / understanding khi đặt NEXT_PUBLIC_FOODIE_CHAT_DEBUG=true trong .env.local */
const SHOW_FOODIE_CHAT_DEBUG = process.env.NEXT_PUBLIC_FOODIE_CHAT_DEBUG === 'true'

const API_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000'

function productImageUrl(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  if (path.startsWith('/')) return `${API_ORIGIN}${path}`
  return `${API_ORIGIN}/storage/${path}`
}

export default function FoodieAssistantChat() {
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [productMap, setProductMap] = useState<Record<number, Product>>({})
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [shippingPreview, setShippingPreview] = useState<{
    address?: string | null
    zone?: string
    fee?: number
    currency?: string
    eta_minutes?: number
    note?: string
  } | null>(null)
  const [estimatingShipping, setEstimatingShipping] = useState(false)
  const [handoffFormOpenMessageId, setHandoffFormOpenMessageId] = useState<string | null>(null)
  const [handoffPhone, setHandoffPhone] = useState('')
  const [handoffNote, setHandoffNote] = useState('')
  const [submittingHandoff, setSubmittingHandoff] = useState(false)
  /** null = chưa chat; llm / heuristic = thành công; fallback = lỗi AI, dùng dự phòng */
  const [replyHud, setReplyHud] = useState<'llm' | 'heuristic' | 'fallback' | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef<ChatMessage[]>(messages)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const ensureProductsLoaded = async () => {
    if (loadingProducts || Object.keys(productMap).length > 0) {
      return
    }

    try {
      setLoadingProducts(true)
      const res = await productService.getAll({ page: 1 })
      const mapped = (res.data || []).reduce<Record<number, Product>>((acc, product) => {
        acc[product.id] = product
        return acc
      }, {})
      setProducts(res.data || [])
      setProductMap(mapped)
    } catch {
      // keep chat usable even when product catalog request fails
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CHAT_MEMORY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as ChatMessage[]
      if (!Array.isArray(parsed) || parsed.length === 0) return
      setMessages(parsed.slice(-10))
    } catch {
      // keep default welcome message when storage is invalid
    }
  }, [])

  useEffect(() => {
    window.sessionStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(messages.slice(-10)))
  }, [messages])

  useEffect(() => {
    void ensureProductsLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, loading])

  const quickPromptChips = useMemo<QuickPromptChip[]>(() => {
    if (products.length === 0) return []

    const hasSpicy = products.some((product) => {
      const source = `${product.name} ${product.description ?? ''} ${product.category?.name ?? ''}`.toLowerCase()
      return /(cay|sa te|tieu xanh|kimchi|thai cay)/.test(source)
    })
    const hasVegetarian = products.some((product) => {
      const source = `${product.name} ${product.description ?? ''} ${product.category?.name ?? ''}`.toLowerCase()
      return /(chay|vegan|rau cu|salad|nam)/.test(source)
    })
    const hasBudget = products.some((product) => Number(product.final_price ?? product.price) <= 50000)

    const chips: QuickPromptChip[] = []
    if (hasSpicy) {
      chips.push({
        id: 'spicy',
        label: 'Ăn cay',
        prompt: 'Mình muốn ăn cay, bạn gợi ý giúp vài món đậm đà nhé.',
      })
    }
    if (hasVegetarian) {
      chips.push({
        id: 'vegetarian',
        label: 'Ăn chay',
        prompt: 'Mình muốn ăn chay thanh nhẹ, bạn gợi ý giúp vài món phù hợp nhé.',
      })
    }
    if (hasBudget) {
      chips.push({
        id: 'budget',
        label: 'Dưới 50k',
        prompt: 'Bạn lọc giúp mình các món ngon dưới 50k nhé.',
      })
    }
    return chips
  }, [products])

  const submitMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || loading) {
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const recentForApi = messagesRef.current.slice(-10).map((m) => ({
        role: m.role,
        content: m.text,
      }))
      const result = await foodieAssistantService.chat({
        message: trimmed,
        recentMessages: recentForApi,
      })
      const parsed = parseFoodieResponse(result.reply)
      const displayText =
        parsed.text.trim() ||
        (parsed.cards.length > 0
          ? 'Dạ mình ơi, em gợi ý các món sau đang có sẵn trên menu ạ:'
          : '')
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: displayText,
        cards: parsed.cards,
        understanding: result.understanding,
        aiStatus: result.ai_status,
        groundingStatus: result.grounding_status,
        handoff: {
          required: Boolean(result.handoff_required),
          reason: result.handoff_reason,
        },
      }
      setMessages((prev) => [...prev, assistantMessage])
      const st = result.ai_status
      if (st && st.ok === false) {
        setReplyHud('fallback')
      } else if (st?.source === 'menu_heuristic') {
        setReplyHud('heuristic')
      } else {
        setReplyHud('llm')
      }
      if (parsed.cards.length > 0) {
        void ensureProductsLoaded()
      }
      setShippingPreview(result.shipping_estimate || null)
      if (result.ai_status && !result.ai_status.ok && result.ai_status.message) {
        toast.info(result.ai_status.message)
      }
    } catch (e) {
      setReplyHud(null)
      if (axios.isAxiosError(e) && e.code === 'ECONNABORTED') {
        toast.error('AI trả lời hơi lâu (timeout). Mình thử gửi lại ngắn gọn hoặc đợi vài giây nhé.')
      } else {
        toast.error('Không thể kết nối Foodie AI lúc này. Bạn thử lại sau vài giây nhé.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await submitMessage(input)
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitMessage(input)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    void submitMessage(prompt)
  }

  const handleAddSuggestionToCart = (card: SuggestionCard) => {
    const product = productMap[card.id]
    addItem({
      productId: card.id,
      name: card.name,
      price: card.price,
      slug: product?.slug || `product-${card.id}`,
      image: product?.image || '/placeholder.png',
      quantity: 1,
    })
    toast.success(`Đã thêm «${card.name}» vào giỏ hàng`)
  }

  const handleClearHistory = () => {
    setMessages([INITIAL_ASSISTANT_MESSAGE])
    setShippingPreview(null)
    setHandoffFormOpenMessageId(null)
    setHandoffPhone('')
    setHandoffNote('')
    setReplyHud(null)
    window.sessionStorage.removeItem(CHAT_MEMORY_KEY)
    toast.success('Đã xóa lịch sử chat của phiên hiện tại.')
  }

  const openHandoffForm = (messageId: string) => {
    setHandoffFormOpenMessageId(messageId)
    setHandoffPhone(user?.phone || '')
    setHandoffNote('')
  }

  const submitHandoffTicket = async (reason?: string | null) => {
    const phone = handoffPhone.trim()
    const note = handoffNote.trim()
    if (!phone) {
      toast.error('Bạn vui lòng nhập số điện thoại để CSKH liên hệ nhanh.')
      return
    }
    if (!note) {
      toast.error('Bạn vui lòng nhập mô tả ngắn để CSKH nắm tình huống.')
      return
    }

    try {
      setSubmittingHandoff(true)
      await contactService.createPublic({
        name: user?.name || 'Khach tu chat',
        email: user?.email || 'guest.chat@hdgfood.vn',
        phone,
        subject: reason ? `Handoff Chat: ${reason}` : 'Handoff Chat: Can CSKH ho tro',
        message: note,
        user_id: user?.id,
      })
      toast.success('Đã gửi ticket CSKH thành công. Bên mình sẽ liên hệ sớm nhất ạ.')
      setHandoffFormOpenMessageId(null)
      setHandoffNote('')
    } catch {
      toast.error('Gửi ticket chưa thành công. Bạn thử lại sau vài giây nhé.')
    } finally {
      setSubmittingHandoff(false)
    }
  }

  useEffect(() => {
    const trimmed = input.trim()
    if (trimmed.length < 8 || !ADDRESS_HINT_REGEX.test(trimmed)) {
      setEstimatingShipping(false)
      return
    }

    const debounce = window.setTimeout(async () => {
      try {
        setEstimatingShipping(true)
        const estimate = await foodieAssistantService.estimateShipping({ address: trimmed })
        setShippingPreview(estimate)
      } catch {
        // silent preview failure, avoid interrupting user typing
      } finally {
        setEstimatingShipping(false)
      }
    }, 500)

    return () => window.clearTimeout(debounce)
  }, [input])

  return (
    <section id="foodie-expert-chat" className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
      <div className="container mx-auto max-w-4xl px-4 py-10 lg:py-16">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ed2a2a]">HDG Food · AI tư vấn</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Foodie Expert AI</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Chat trực tiếp với API nhà hàng: gợi ý món đang có hàng, phí ship ước tính, thêm vào giỏ trong một chạm.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-red-50 via-white to-orange-50/60 px-4 py-3.5 sm:px-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ed2a2a] text-white shadow-md shadow-red-500/25">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Foodie Expert</h3>
                {replyHud === 'llm' && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                    Đã nối AI
                  </span>
                )}
                {replyHud === 'heuristic' && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900">
                    Theo menu (tiết kiệm quota)
                  </span>
                )}
                {replyHud === 'fallback' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    Chế độ dự phòng
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                API: <span className="font-mono text-[11px] text-slate-600">POST /assistant/foodie-chat</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
            >
              <RotateCcw size={13} />
              Xóa lịch sử
            </button>
          </div>

        <div
          ref={listRef}
          className="max-h-[min(420px,55vh)] space-y-4 overflow-y-auto scroll-smooth bg-slate-50/50 p-4 sm:p-5"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ${
                  message.role === 'user' ? 'bg-[#ed2a2a] text-white' : 'border border-slate-200 bg-white text-[#ed2a2a]'
                }`}
              >
                {message.role === 'user' ? <UserRound size={18} /> : <Bot size={18} />}
              </div>
              <div className={`min-w-0 max-w-[min(100%,28rem)] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === 'user'
                      ? 'bg-[#ed2a2a] text-white'
                      : 'border border-slate-200/80 bg-white text-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                </div>

                {message.role === 'assistant' && message.cards && message.cards.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.cards.map((card) => {
                      const img = productImageUrl(productMap[card.id]?.image)
                      return (
                        <div
                          key={`${message.id}-${card.id}`}
                          className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                HDG
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{card.name}</p>
                            <p className="text-xs font-semibold text-[#ed2a2a]">
                              {card.price.toLocaleString('vi-VN')}đ
                            </p>
                            <button
                              type="button"
                              onClick={() => handleAddSuggestionToCart(card)}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#ed2a2a] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                            >
                              <ShoppingCart size={13} />
                              Thêm vào giỏ
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {SHOW_FOODIE_CHAT_DEBUG && message.role === 'assistant' && message.groundingStatus && (
                  <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
                    {`grounding: provider_cards=${message.groundingStatus.provider_cards}, valid_cards=${message.groundingStatus.valid_cards}, fallback_used=${message.groundingStatus.fallback_used}`}
                    {message.aiStatus?.code ? ` | ai_status=${message.aiStatus.code}` : ''}
                  </div>
                )}

                {SHOW_FOODIE_CHAT_DEBUG && message.role === 'assistant' && message.understanding && (
                  <details className="mt-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/60 px-2 py-1.5 text-[11px] text-slate-700">
                    <summary className="cursor-pointer font-semibold text-blue-700">
                      understanding debug
                    </summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed">
                      {JSON.stringify(message.understanding, null, 2)}
                    </pre>
                  </details>
                )}

                {message.role === 'assistant' && message.handoff?.required && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide">Handoff CSKH</p>
                        <p className="mt-1 text-xs">
                          {message.handoff.reason || 'Yêu cầu cần nhân viên thật hỗ trợ chi tiết hơn.'}
                        </p>
                        <p className="mt-1 text-xs">Hệ thống đã đánh dấu ưu tiên để đội CSKH tiếp nhận nhanh.</p>
                        <button
                          type="button"
                          onClick={() => openHandoffForm(message.id)}
                          className="mt-2 inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          Gửi yêu cầu CSKH
                        </button>

                        {handoffFormOpenMessageId === message.id && (
                          <div className="mt-2 space-y-2 rounded-lg border border-amber-300 bg-white p-2">
                            <input
                              value={handoffPhone}
                              onChange={(e) => setHandoffPhone(e.target.value)}
                              placeholder="Số điện thoại"
                              className="h-9 w-full rounded-md border border-amber-200 px-2 text-xs text-slate-700 outline-none focus:border-amber-400"
                            />
                            <textarea
                              value={handoffNote}
                              onChange={(e) => setHandoffNote(e.target.value)}
                              placeholder="Mô tả nhanh nhu cầu / vấn đề của bạn"
                              rows={3}
                              className="w-full rounded-md border border-amber-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-amber-400"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setHandoffFormOpenMessageId(null)}
                                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => void submitHandoffTicket(message.handoff?.reason)}
                                disabled={submittingHandoff}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {submittingHandoff && <Loader2 size={12} className="animate-spin" />}
                                Gửi ticket
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#ed2a2a] shadow-sm">
                <Bot size={18} />
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm">
                <Loader2 size={14} className="animate-spin text-[#ed2a2a]" />
                Dạ em đang soạn gợi ý phù hợp cho mình…
              </div>
            </div>
          )}
        </div>

        {quickPromptChips.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
            {quickPromptChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleQuickPrompt(chip.prompt)}
                disabled={loading}
                className="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-[#ed2a2a] hover:bg-red-100 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {(estimatingShipping || shippingPreview) && (
          <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <MapPin size={13} />
                Ước tính phí giao hàng realtime
                {estimatingShipping && <Loader2 size={12} className="animate-spin" />}
              </div>
              {shippingPreview && (
                <p className="mt-1">
                  {`Khu vực ${shippingPreview.zone || 'đang xác định'}: khoảng `}
                  <span className="font-semibold text-slate-800">
                    {Number(shippingPreview.fee || 0).toLocaleString('vi-VN')}đ
                  </span>
                  {` · ${shippingPreview.eta_minutes || 0} phút`}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:items-end sm:px-5 sm:pb-5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ví dụ: trưa nay ăn gì ngon mà rẻ?"
            rows={2}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#ed2a2a] focus:ring-2 focus:ring-red-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#ed2a2a] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto sm:justify-center"
          >
            <Send size={14} />
            Gửi
          </button>
        </form>
        </div>
      </div>
    </section>
  )
}
