import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import { CartComboItem } from '@/types/combo'

export interface CartItem {
  id: string // Unique ID based on productId + options
  productId: number
  name: string
  slug: string
  price: number
  image: string
  quantity: number
  options?: Record<string, any>
  // Combo fields
  isCombo?: boolean
  comboId?: number
  comboSelections?: { group_id: number; product_ids: number[] }[]
  comboBasePrice?: number
  comboDiscount?: number
  // For displaying combo info
  comboInfo?: CartComboItem
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  tableId: number | null
  tableSessionToken: string | null
  addItem: (item: Omit<CartItem, 'id'>) => void
  addCombo: (comboItem: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  setTableId: (tableId: number | null) => void
  setTableSessionToken: (token: string | null) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (isOpen: boolean) => void
  getTotal: () => number
  getTotalItems: () => number
  getComboItems: () => CartItem[]
  getRegularItems: () => CartItem[]
  /** Cập nhật đơn giá sau /cart/sync (khớp server) */
  reconcilePrices: (
    updates: Array<{ productId: number; price: number; options?: Record<string, unknown> | null }>,
  ) => void
}

// Generate unique ID for cart item considering options (size, toppings, etc.)
const generateItemId = (productId: number, options?: Record<string, any>) => {
  if (!options || Object.keys(options).length === 0) return `${productId}`
  const sortedOptions = Object.keys(options).sort().map(k => `${k}:${options[k]}`).join('|')
  return `${productId}-${sortedOptions}`
}

// Generate unique ID for combo items
const generateComboId = (comboId: number, selections: { group_id: number; product_ids: number[] }[]) => {
  const selectionStr = selections.map(s => `${s.group_id}:${s.product_ids.sort().join(',')}`).sort().join('|')
  return `combo-${comboId}-${selectionStr}`
}

const syncTableOccupied = async (tableId: number | null, token: string | null) => {
  if (!tableId || !token) return
  const baseApi = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  try {
    await fetch(`${baseApi}/tables/${tableId}/occupy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token }),
    })
  } catch {
    // silent: không làm gián đoạn thao tác thêm món.
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      tableId: null,
      tableSessionToken: null,

      addItem: (newItem) => {
        // Don't add combo items via this method
        if (newItem.isCombo) {
          get().addCombo(newItem as CartItem)
          return
        }

        const id = generateItemId(newItem.productId, newItem.options)
        
        set((state) => {
          const existingItem = state.items.find(item => item.id === id)
          if (existingItem) {
            return {
              items: state.items.map(item => 
                item.id === id 
                  ? { ...item, quantity: item.quantity + newItem.quantity }
                  : item
              ),
              isOpen: true
            }
          }
          return {
            items: [...state.items, { ...newItem, id }],
            isOpen: true
          }
        })
        syncTableOccupied(get().tableId, get().tableSessionToken)
        
        toast.success(`Đã thêm ${newItem.name} vào giỏ hàng!`, {
          description: 'Món ngon đã sẵn sàng, lên món nha!',
          action: {
            label: 'Xem giỏ hàng',
            onClick: () => get().setCartOpen(true)
          }
        })
      },

      addCombo: (comboItem) => {
        if (!comboItem.comboId || !comboItem.comboSelections) {
          console.error('Invalid combo item: missing comboId or selections')
          return
        }

        const id = generateComboId(comboItem.comboId, comboItem.comboSelections)
        
        set((state) => {
          // If combo already exists with same selections, just update
          const existingIndex = state.items.findIndex(item => item.id === id)
          if (existingIndex !== -1) {
            const existing = state.items[existingIndex]
            return {
              items: state.items.map((item, idx) => 
                idx === existingIndex 
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
              isOpen: true
            }
          }
          // Otherwise add new combo item
          return {
            items: [...state.items, { ...comboItem, id }],
            isOpen: true
          }
        })
        syncTableOccupied(get().tableId, get().tableSessionToken)
        
        toast.success(`Đã thêm combo vào giỏ hàng!`, {
          description: comboItem.name + ' - đang chờ bạn hoàn tất đơn!',
          action: {
            label: 'Xem giỏ hàng',
            onClick: () => get().setCartOpen(true)
          }
        })
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id)
          return
        }
        set((state) => ({
          items: state.items.map(item => 
            item.id === id ? { ...item, quantity } : item
          )
        }))
      },

      setTableId: (tableId) => set({ tableId }),
      setTableSessionToken: (token) => set({ tableSessionToken: token }),

      clearCart: () => set({ items: [] }),
      
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      
      setCartOpen: (isOpen) => set({ isOpen }),

      getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getComboItems: () => {
        return get().items.filter(item => item.isCombo)
      },

      getRegularItems: () => {
        return get().items.filter(item => !item.isCombo)
      },

      reconcilePrices: (updates) => {
        if (!updates.length) return
        set((state) => ({
          items: state.items.map((item) => {
            if (item.isCombo) return item
            const match = updates.find(
              (u) =>
                u.productId === item.productId &&
                JSON.stringify(u.options ?? null) === JSON.stringify(item.options ?? null),
            )
            if (!match || match.price === item.price) return item
            return { ...item, price: match.price }
          }),
        }))
      },
    }),
    {
      name: 'HDG-cart-storage',
    }
  )
)