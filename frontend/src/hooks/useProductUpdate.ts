'use client'

import { useEffect } from 'react'

interface ProductUpdateEvent {
  productId: number
  product: any
}

/**
 * Hook to listen for product updates
 * Usage: useProductUpdate((event) => { console.log('Product updated:', event.product) })
 */
export function useProductUpdate(callback: (event: ProductUpdateEvent) => void) {
  useEffect(() => {
    const handleUpdate = (e: CustomEvent<ProductUpdateEvent>) => {
      callback(e.detail)
    }

    window.addEventListener('product-updated', handleUpdate as EventListener)
    
    return () => {
      window.removeEventListener('product-updated', handleUpdate as EventListener)
    }
  }, [callback])
}

/**
 * Trigger product update event
 */
export function triggerProductUpdate(productId: number, product: any) {
  window.dispatchEvent(new CustomEvent('product-updated', { 
    detail: { productId, product } 
  }))
}
