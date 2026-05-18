import api, { type ApiRequestConfig } from './api'

export interface FoodieChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface FoodieChatRequest {
  message: string
  recentMessages?: FoodieChatMessage[]
}

export interface FoodieChatResponse {
  reply: string
  server_time: string
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
  ai_status?: {
    ok: boolean
    code:
      | 'AI_CONFIG_MISSING'
      | 'AI_AUTH_FAILED'
      | 'AI_MODEL_NOT_FOUND'
      | 'AI_QUOTA_EXCEEDED'
      | 'AI_PROVIDER_UNAVAILABLE'
      | 'AI_PROVIDER_ERROR'
      | null
    message: string | null
    /** llm = gọi API AI; menu_heuristic = trả lời theo luật menu (không tốn quota) */
    source?: 'llm' | 'menu_heuristic'
  }
  grounding_status?: {
    provider_cards: number
    valid_cards: number
    fallback_used: boolean
  }
  intent_score?: {
    greeting: number
    order: number
    shipping: number
    complaint: number
  }
  top_intent?: 'greeting' | 'order' | 'shipping' | 'complaint'
  handoff_required?: boolean
  handoff_reason?: string | null
  entities?: {
    product?: { id: number; name: string; price: number } | null
    quantity?: number | null
    special_requests?: string[]
    address?: string | null
  }
  shipping_estimate?: {
    address?: string | null
    zone?: string
    fee?: number
    currency?: string
    eta_minutes?: number
    note?: string
  }
}

export interface ShippingEstimatePayload {
  address?: string
  province_code?: string
  district_code?: string
  ward_code?: string
}

export interface ShippingEstimateResponse {
  data: {
    address?: string | null
    province_code?: string | null
    district_code?: string | null
    ward_code?: string | null
    zone: string
    fee: number
    currency: string
    eta_minutes: number
    note: string
  }
}

function unwrapFoodieChatResponse(body: unknown): FoodieChatResponse {
  if (!body || typeof body !== 'object') {
    throw new Error('Phản hồi Foodie AI không hợp lệ')
  }
  const o = body as Record<string, unknown>
  if (typeof o.reply === 'string') {
    return o as unknown as FoodieChatResponse
  }
  const inner = o.data
  if (inner && typeof inner === 'object' && typeof (inner as Record<string, unknown>).reply === 'string') {
    return inner as unknown as FoodieChatResponse
  }
  throw new Error('Phản hồi Foodie AI thiếu trường reply')
}

export const foodieAssistantService = {
  chat: async (payload: FoodieChatRequest) => {
    const body = {
      message: payload.message,
      recent_messages: payload.recentMessages ?? [],
    }
    const chatConfig: ApiRequestConfig = { timeout: 55_000, skipNetworkErrorToast: true }
    const { data } = await api.post<unknown>('/assistant/foodie-chat', body, chatConfig)
    return unwrapFoodieChatResponse(data)
  },
  estimateShipping: async (payload: ShippingEstimatePayload) => {
    const shipConfig: ApiRequestConfig = { timeout: 20_000, skipNetworkErrorToast: true }
    const { data } = await api.post<ShippingEstimateResponse>(
      '/assistant/shipping/estimate',
      payload,
      shipConfig
    )
    return data.data
  },
}
