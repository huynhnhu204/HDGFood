'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Check, ShoppingBag, Minus, Plus, Loader2, Sparkles, Tag } from 'lucide-react'
import { Combo, ComboGroup, ComboProduct, ComboSelection } from '@/types/combo'
import { comboService } from '@/services/combo.service'
import { useCartStore } from '@/store/useCartStore'
import Image from 'next/image'

interface ComboBuilderProps {
  combo: Combo | null
  isOpen: boolean
  onClose: () => void
}

export default function ComboBuilder({ combo, isOpen, onClose }: ComboBuilderProps) {
  const [selections, setSelections] = useState<Record<number, number[]>>({})
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculatedPrice, setCalculatedPrice] = useState<{
    base_price: number
    discount_amount: number
    final_price: number
  } | null>(null)
  const [addingToCart, setAddingToCart] = useState(false)
  const addCombo = useCartStore(state => state.addCombo)

  // Reset selections when combo changes
  useEffect(() => {
    if (combo) {
      const initial: Record<number, number[]> = {}
      combo.groups.forEach(g => {
        initial[g.id] = []
      })
      setSelections(initial)
      setCalculatedPrice(null)
    }
  }, [combo])

  if (!combo) return null

  // Check if a group is satisfied (selected count between min and max)
  const isGroupSatisfied = (group: ComboGroup): boolean => {
    const count = selections[group.id]?.length || 0
    return count >= group.min_required && count <= group.max_required
  }

  // Check if all groups are satisfied
  const isAllGroupsSatisfied = (): boolean => {
    return combo.groups.every(g => isGroupSatisfied(g))
  }

  // Toggle product selection in a group
  const toggleProduct = (groupId: number, productId: number) => {
    const group = combo.groups.find(g => g.id === groupId)
    if (!group) return

    const current = selections[groupId] || []
    const isSelected = current.includes(productId)

    // Check max limit
    if (!isSelected && current.length >= group.max_required) {
      return // Can't select more than max
    }

    let newSelection: number[]
    if (isSelected) {
      newSelection = current.filter(id => id !== productId)
    } else {
      newSelection = [...current, productId]
    }

    const newSelections = {
      ...selections,
      [groupId]: newSelection
    }
    setSelections(newSelections)

    // Auto-calculate when all groups satisfied
    if (Object.values(newSelections).every(arr => arr.length > 0)) {
      const allSatisfied = combo.groups.every(g => {
        const sel = newSelections[g.id] || []
        return sel.length >= g.min_required && sel.length <= g.max_required
      })
      
      if (allSatisfied) {
        calculatePrice(newSelections)
      }
    } else {
      setCalculatedPrice(null)
    }
  }

  // Calculate price from backend
  const calculatePrice = async (sel: Record<number, number[]>) => {
    setIsCalculating(true)
    try {
      const selectionsArray: ComboSelection[] = Object.entries(sel)
        .map(([group_id, product_ids]) => ({
          group_id: parseInt(group_id),
          product_ids
        }))
        .filter(s => s.product_ids.length > 0)

      const result = await comboService.calculate({
        combo_id: combo.id,
        selections: selectionsArray
      })

      setCalculatedPrice({
        base_price: result.data.base_price,
        discount_amount: result.data.discount_amount,
        final_price: result.data.final_price
      })
    } catch (error) {
      console.error('Failed to calculate combo price:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  // Add combo to cart
  const handleAddToCart = async () => {
    if (!isAllGroupsSatisfied()) return
    
    setAddingToCart(true)
    try {
      const selectionsArray: ComboSelection[] = Object.entries(selections)
        .map(([group_id, product_ids]) => ({
          group_id: parseInt(group_id),
          product_ids
        }))

      // Calculate once more to ensure we have the latest
      if (!calculatedPrice) {
        await calculatePrice(selections)
      }

      // Get all selected products info
      const allItems = combo.groups.flatMap(g => 
        (selections[g.id] || []).map(pid => {
          const cp = g.products.find(p => p.product_id === pid)
          return {
            product_id: pid,
            name: cp?.name || '',
            effective_price: cp?.effective_price || 0,
            quantity: 1
          }
        })
      )

      addCombo({
        id: '', // Will be auto-generated
        productId: combo.id,
        name: combo.name,
        slug: combo.slug || `combo-${combo.id}`,
        price: calculatedPrice?.final_price || combo.final_price,
        image: combo.image || '',
        quantity: 1,
        isCombo: true,
        comboId: combo.id,
        comboSelections: selectionsArray,
        comboBasePrice: calculatedPrice?.base_price || combo.base_price,
        comboDiscount: calculatedPrice?.discount_amount || 0,
        options: {}
      })

      onClose()
    } catch (error) {
      console.error('Failed to add combo to cart:', error)
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[110]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                  <div className="flex h-full flex-col bg-white shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800">
                      <div>
                        <Dialog.Title className="text-xl font-black text-white flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-300" />
                          {combo.name}
                        </Dialog.Title>
                        <p className="text-sm text-slate-300 mt-1">
                          Tùy chọn món trong gói combo - càng chọn đúng, giá càng tối ưu
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        onClick={onClose}
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 space-y-6">
                      {combo.groups.map((group) => {
                        const selected = selections[group.id] || []
                        const satisfied = isGroupSatisfied(group)
                        
                        return (
                          <div key={group.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            {/* Group Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                  {group.name}
                                </h4>
                                {satisfied && (
                                  <Check className="w-4 h-4 text-emerald-500" />
                                )}
                              </div>
                              <div className={`text-xs font-black px-3 py-1.5 rounded-full ${
                                satisfied 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {selected.length}/{group.max_required} đã chọn
                                {group.min_required > 1 && ` - tối thiểu ${group.min_required}`}
                              </div>
                            </div>

                            {/* Products Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              {group.products.map((cp) => {
                                const isSelected = selected.includes(cp.product_id)
                                const isDisabled = !isSelected && selected.length >= group.max_required

                                return (
                                  <button
                                    key={cp.id}
                                    onClick={() => toggleProduct(group.id, cp.product_id)}
                                    disabled={isDisabled}
                                    className={`relative p-3 rounded-2xl border transition-all text-left ${
                                      isSelected
                                        ? 'border-[#ed2a2a] bg-red-50 shadow-[0_8px_20px_rgba(237,42,42,0.12)]'
                                        : isDisabled
                                        ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                                        : 'border-slate-200 bg-white hover:border-[#ed2a2a]/60 hover:shadow-sm'
                                    }`}
                                  >
                                    {/* Product Image */}
                                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-2">
                                      {cp.image ? (
                                        <Image
                                          src={cp.image}
                                          alt={cp.name}
                                          fill
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-slate-200" />
                                      )}
                                      
                                      {/* Selected Check */}
                                      {isSelected && (
                                        <div className="absolute top-1 right-1 w-5 h-5 bg-[#ed2a2a] rounded-full flex items-center justify-center">
                                          <Check className="w-3 h-3 text-white" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Product Name */}
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight line-clamp-2 min-h-[32px]">
                                      {cp.name}
                                    </p>

                                    {/* Price */}
                                    <p className="text-xs font-bold text-[#ed2a2a] mt-1">
                                      {cp.effective_price.toLocaleString()}đ
                                    </p>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                      {/* Price Summary */}
                      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                        {calculatedPrice && (
                          <>
                            {calculatedPrice.discount_amount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Tổng giá gốc:</span>
                                <span className="text-slate-400 line-through font-bold">
                                  {calculatedPrice.base_price.toLocaleString()}đ
                                </span>
                              </div>
                            )}
                            {calculatedPrice.discount_amount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <Tag className="w-4 h-4" />
                                  Tiết kiệm:
                                </span>
                                <span className="text-emerald-600 font-black">
                                  -{calculatedPrice.discount_amount.toLocaleString()}đ
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                          <span className="text-base font-black text-slate-900">Thành tiền:</span>
                          <div className="text-right">
                            <span className={`text-2xl font-black italic ${
                              calculatedPrice ? 'text-emerald-600' : 'text-[#ed2a2a]'
                            }`}>
                              {calculatedPrice 
                                ? calculatedPrice.final_price.toLocaleString()
                                : combo.final_price.toLocaleString()
                              }đ
                            </span>
                            {calculatedPrice && calculatedPrice.base_price > calculatedPrice.final_price && (
                              <span className="block text-xs text-slate-400 line-through">
                                {calculatedPrice.base_price.toLocaleString()}đ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={handleAddToCart}
                        disabled={!isAllGroupsSatisfied() || addingToCart}
                        className="w-full py-4 bg-[#ed2a2a] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl flex items-center justify-center gap-2"
                      >
                        {addingToCart ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Đang thêm...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-5 h-5" />
                            Thêm combo vào giỏ hàng
                          </>
                        )}
                      </button>

                      {/* Validation Message */}
                      {!isAllGroupsSatisfied() && (
                        <p className="text-xs text-center text-slate-400 mt-3">
                          Vui lòng chọn đủ các món trong mỗi nhóm để tiếp tục
                        </p>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}