export function getCartIconCenter(): { x: number; y: number } | null {
  const cartIcon = document.querySelector('[data-cart-icon]') as HTMLElement | null
  if (!cartIcon) return null
  const rect = cartIcon.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

export function triggerFlyToCartAnimation(
  image: string,
  sourceElement: HTMLElement,
  size = 50
) {
  const startRect = sourceElement.getBoundingClientRect()
  const startX = startRect.left + startRect.width / 2
  const startY = startRect.top + startRect.height / 2

  const ghost = document.createElement('img')
  ghost.src = image || '/placeholder.png'
  ghost.alt = ''
  ghost.style.position = 'fixed'
  ghost.style.width = `${size}px`
  ghost.style.height = `${size}px`
  ghost.style.borderRadius = '50%'
  ghost.style.objectFit = 'cover'
  ghost.style.left = `${startX - size / 2}px`
  ghost.style.top = `${startY - size / 2}px`
  ghost.style.zIndex = '9999'
  ghost.style.pointerEvents = 'none'
  ghost.style.transition = 'all 0.7s cubic-bezier(0.25, 1, 0.5, 1)'
  ghost.style.boxShadow = '0 10px 25px rgba(237, 42, 42, 0.5)'
  document.body.appendChild(ghost)

  const endSize = 12
  const cartCenter = getCartIconCenter()

  requestAnimationFrame(() => {
    if (cartCenter) {
      ghost.style.left = `${cartCenter.x - endSize / 2}px`
      ghost.style.top = `${cartCenter.y - endSize / 2}px`
      ghost.style.width = `${endSize}px`
      ghost.style.height = `${endSize}px`
      ghost.style.opacity = '0.2'
    } else {
      ghost.style.left = `calc(100vw - ${endSize + 16}px)`
      ghost.style.top = '24px'
      ghost.style.width = `${endSize}px`
      ghost.style.height = `${endSize}px`
      ghost.style.opacity = '0'
    }
  })

  setTimeout(() => ghost.remove(), 750)
  window.dispatchEvent(new Event('cart-updated'))
}
