'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'

interface FlyingItem {
  id: string
  startX: number
  startY: number
  image: string
}

export function useFlyToCart() {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([])

  const triggerFlyAnimation = (image: string, buttonElement?: HTMLElement) => {
    const button = buttonElement || document.activeElement as HTMLElement
    const rect = button?.getBoundingClientRect()
    
    if (!rect) return

    const id = `fly-${Date.now()}-${Math.random()}`
    const newItem: FlyingItem = {
      id,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      image,
    }

    setFlyingItems(prev => [...prev, newItem])

    // Remove after animation completes
    setTimeout(() => {
      setFlyingItems(prev => prev.filter(item => item.id !== id))
    }, 1000)
  }

  return { flyingItems, triggerFlyAnimation }
}

export default function FlyToCartAnimation({ flyingItems }: { flyingItems: FlyingItem[] }) {
  const [cartPosition, setCartPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const updateCartPosition = () => {
      const cartIcon = document.querySelector('[data-cart-icon]')
      if (cartIcon) {
        const rect = cartIcon.getBoundingClientRect()
        setCartPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
      }
    }

    updateCartPosition()
    window.addEventListener('resize', updateCartPosition)
    window.addEventListener('scroll', updateCartPosition)

    return () => {
      window.removeEventListener('resize', updateCartPosition)
      window.removeEventListener('scroll', updateCartPosition)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              x: item.startX,
              y: item.startY,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: cartPosition.x,
              y: cartPosition.y,
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
            className="absolute w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border-4 border-white"
            style={{
              left: -40,
              top: -40,
            }}
          >
            <img
              src={item.image}
              alt="Flying to cart"
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
      animate={bounce ? {
        scale: [1, 1.3, 0.9, 1.1, 1],
        rotate: [0, -10, 10, -5, 0],
      } : {}}
      transition={{ duration: 0.6 }}
      data-cart-icon
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
