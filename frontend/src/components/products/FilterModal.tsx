'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, DollarSign, Star } from 'lucide-react'
import { motion } from 'framer-motion'

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  filters: {
    minPrice: string
    maxPrice: string
    rating: string
  }
  onApplyFilters: (filters: { minPrice: string; maxPrice: string; rating: string }) => void
}

export default function FilterModal({ isOpen, onClose, filters, onApplyFilters }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleApply = () => {
    onApplyFilters(localFilters)
    onClose()
  }

  const handleReset = () => {
    const resetFilters = { minPrice: '', maxPrice: '', rating: '' }
    setLocalFilters(resetFilters)
    onApplyFilters(resetFilters)
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="font-playfair text-2xl font-bold text-slate-800">
                    Lọc nâng cao
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Price Range */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <DollarSign size={16} className="text-HDG-600" />
                      Khoảng giá (VNĐ)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        placeholder="Từ"
                        value={localFilters.minPrice}
                        onChange={(e) => setLocalFilters({ ...localFilters, minPrice: e.target.value })}
                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-HDG-500/20"
                      />
                      <span className="text-slate-400 font-bold">—</span>
                      <input
                        type="number"
                        placeholder="Đến"
                        value={localFilters.maxPrice}
                        onChange={(e) => setLocalFilters({ ...localFilters, maxPrice: e.target.value })}
                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-HDG-500/20"
                      />
                    </div>
                  </div>

                  {/* Rating Filter */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Star size={16} className="text-HDG-600" />
                      Đánh giá tối thiểu
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setLocalFilters({ ...localFilters, rating: rating.toString() })}
                          className={`py-3 rounded-xl text-sm font-bold transition-all ${
                            localFilters.rating === rating.toString()
                              ? 'bg-HDG-600 text-white shadow-lg'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {rating}★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Đặt lại
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 py-3 rounded-xl bg-HDG-600 text-white font-bold text-sm hover:bg-HDG-700 transition-colors shadow-lg shadow-HDG-600/30"
                  >
                    Áp dụng
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
