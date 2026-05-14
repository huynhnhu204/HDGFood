'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { X, TicketPercent } from 'lucide-react'

type PromotionType = 'voucher' | 'campaign'

interface MarketingPromotion {
  id: number
  type: PromotionType
  title: string
  description: string
  image_url: string
  voucher_code?: string
  action_link: string
}

const SESSION_KEY = 'HDG_modal_shown'

const latestPromotion: MarketingPromotion = {
  id: 1,
  type: 'voucher',
  title: 'UU DAI THANG 4: GIAM 20%',
  description: 'Nap nang luong voi ma HDG20. Ap dung cho don hang Combo gia dinh.',
  image_url: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=600',
  voucher_code: 'HDG20',
  action_link: '/menu?combo=true',
}

export default function MarketingModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const shown = window.sessionStorage.getItem(SESSION_KEY) === 'true'
    if (shown) return

    const timer = window.setTimeout(() => {
      setOpen(true)
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [])

  const closeModal = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_KEY, 'true')
    }
    setOpen(false)
  }

  const promo = useMemo(() => latestPromotion, [])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -12 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className="relative w-full max-w-4xl overflow-hidden rounded-[3rem] bg-white shadow-2xl"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-5 top-5 z-20 rounded-full bg-white/85 p-2 text-slate-400 shadow-sm transition hover:text-slate-900"
              aria-label="Dong modal"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative h-64 md:h-full min-h-[280px]">
                <img src={promo.image_url} alt={promo.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              </div>

              <div className="flex flex-col justify-center p-8 lg:p-10">
                <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#ed2a2a]">
                  <TicketPercent className="h-3.5 w-3.5" />
                  Khuyen mai dac biet
                </p>
                <h3 className="text-2xl font-black uppercase leading-tight text-slate-900 lg:text-3xl">
                  {promo.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{promo.description}</p>

                {promo.voucher_code && (
                  <div className="mt-5 rounded-2xl border border-dashed border-red-300 bg-red-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Ma voucher</p>
                    <p className="mt-1 font-mono text-xl font-black text-[#ed2a2a]">{promo.voucher_code}</p>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href={promo.action_link}
                    onClick={closeModal}
                    className="inline-flex items-center justify-center rounded-2xl bg-[#ed2a2a] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-600"
                  >
                    Nhan uu dai ngay
                  </Link>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-sm font-semibold text-slate-400 transition hover:text-slate-700"
                  >
                    Bo qua lan nay
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
