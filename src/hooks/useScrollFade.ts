import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tracks whether a horizontally-scrollable container has hidden content
 * to the left or right, so the caller can render fade-hint overlays.
 *
 * Usage:
 *   const { ref, fadeLeft, fadeRight } = useScrollFade<HTMLDivElement>()
 *   <div ref={ref} style={{ overflowX: 'auto' }}>...</div>
 */
export function useScrollFade<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [fadeLeft,  setFadeLeft]  = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setFadeLeft(scrollLeft > 1)
    setFadeRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update])

  return { ref, fadeLeft, fadeRight }
}
