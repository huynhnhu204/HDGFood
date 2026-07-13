'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import { getCartIconCenter } from '@/lib/flyToCart'

interface FlyingItem {
  id: string
  startX: number
  startY: number
  image: string
  endX: number
  endY: number
}

export function useFlyToCart() {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([])

  const triggerFlyAnimation = (image: string, buttonElement?: HTMLElement) => {
    const button = buttonElement || (document.activeElement as HTMLElement)
    const rect = button?.getBoundingClientRect()
    const cartCenter = getCartIconCenter()

    if (!rect || !cartCenter) return

    const id = `fly-${Date.now()}-${Math.random()}`
    const newItem: FlyingItem = {
      id,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      endX: cartCenter.x,
      endY: cartCenter.y,
      image,
    }

    setFlyingItems((prev) => [...prev, newItem])

    setTimeout(() => {
      setFlyingItems((prev) => prev.filter((item) => item.id !== id))
    }, 1000)
  }

  return { flyingItems, triggerFlyAnimation }
}

export default function FlyToCartAnimation({ flyingItems }: { flyingItems: FlyingItem[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              left: item.startX,
              top: item.startY,
              x: '-50%',
              y: '-50%',
              scale: 1,
              opacity: 1,
            }}
            animate={{
              left: item.endX,
              top: item.endY,
              x: '-50%',
              y: '-50%',
              scale: 0.2,
              opacity: 0.8,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.8,
              ease: [0.43, 0.13, 0.23, 0.96],
            }}
            className="fixed w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border-4 border-white"
          >
            <img
              src={item.image}
              alt=""
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Cart Icon Bounce Effect
export function CartIconBounce() {
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    const handleCartUpdate = () => {
      setBounce(true)
      setTimeout(() => setBounce(false), 600)
    }

    window.addEventListener('cart-updated', handleCartUpdate)
    return () => window.removeEventListener('cart-updated', handleCartUpdate)
  }, [])

  return (
    <motion.div
      animate={
        bounce
          ? {
              scale: [1, 1.3, 0.9, 1.1, 1],
              rotate: [0, -10, 10, -5, 0],
            }
          : {}
      }
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <ShoppingCart className="w-6 h-6" />
      {bounce && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 rounded-full bg-HDG-500"
        />
      )}
    </motion.div>
  )
}
