import { useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'

const SWIPE_COMMIT_RATIO = 0.22
const TAP_MOVE_TOLERANCE = 10
const TAP_MAX_DURATION = 300
const DOUBLE_TAP_WINDOW = 300
const EDGE_ZONE_RATIO = 0.2
const MIN_ZOOM = 1
const MAX_ZOOM = 4

interface Pointer {
  x: number
  y: number
}

export function GestureLayer({
  children,
  zoom,
  onCommitZoom,
  onPrevPage,
  onNextPage,
  onToggleChrome,
  onDoubleTapZoom,
  canPrev,
  canNext,
}: {
  children: JSX.Element
  zoom: number
  onCommitZoom: (zoom: number) => void
  onPrevPage: () => void
  onNextPage: () => void
  onToggleChrome: () => void
  onDoubleTapZoom: () => void
  canPrev: boolean
  canNext: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [dragX, setDragX] = useState(0)
  const [liveScale, setLiveScale] = useState(1)
  const [transformOrigin, setTransformOrigin] = useState('50% 50%')
  const [animating, setAnimating] = useState(false)

  const pointers = useRef<Map<number, Pointer>>(new Map())
  const dragState = useRef<{ startX: number; startY: number; startTime: number; moved: boolean } | null>(null)
  const pinchState = useRef<{ startDist: number; startZoom: number } | null>(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    function distance(a: Pointer, b: Pointer): number {
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    function onPointerDown(e: PointerEvent) {
      el!.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 1) {
        dragState.current = { startX: e.clientX, startY: e.clientY, startTime: performance.now(), moved: false }
      } else if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values())
        const rect = el!.getBoundingClientRect()
        pinchState.current = { startDist: distance(a, b), startZoom: zoom }
        const midX = ((a.x + b.x) / 2 - rect.left) / rect.width
        const midY = ((a.y + b.y) / 2 - rect.top) / rect.height
        setTransformOrigin(`${midX * 100}% ${midY * 100}%`)
        dragState.current = null
        setDragX(0)
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 2 && pinchState.current) {
        const [a, b] = Array.from(pointers.current.values())
        const dist = distance(a, b)
        const rawScale = (dist / pinchState.current.startDist) * pinchState.current.startZoom
        setLiveScale(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, rawScale)) / zoom)
        return
      }

      if (pointers.current.size === 1 && dragState.current) {
        const dx = e.clientX - dragState.current.startX
        const dy = e.clientY - dragState.current.startY
        if (Math.abs(dx) > TAP_MOVE_TOLERANCE || Math.abs(dy) > TAP_MOVE_TOLERANCE) {
          dragState.current.moved = true
        }
        // Only treat as a page-turn drag when zoomed out to 1x; at higher
        // zoom a single-finger drag is reserved for panning (browser default).
        if (zoom === 1 && Math.abs(dx) > Math.abs(dy)) {
          if ((dx > 0 && canPrev) || (dx < 0 && canNext)) {
            setDragX(dx)
          }
        }
      }
    }

    function finishPinch() {
      if (pinchState.current) {
        const committed = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, liveScale * zoom))
        onCommitZoom(committed)
        pinchState.current = null
        setLiveScale(1)
      }
    }

    function onPointerUp(e: PointerEvent) {
      const wasSinglePointerTap = pointers.current.size === 1 && dragState.current && !dragState.current.moved
      const tapDuration = dragState.current ? performance.now() - dragState.current.startTime : Infinity

      pointers.current.delete(e.pointerId)

      if (pointers.current.size < 2) finishPinch()

      if (wasSinglePointerTap && tapDuration < TAP_MAX_DURATION) {
        const rect = el!.getBoundingClientRect()
        const x = e.clientX - rect.left
        const relX = x / rect.width

        const now = performance.now()
        const lastTap = lastTapRef.current
        lastTapRef.current = { time: now, x: e.clientX, y: e.clientY }
        if (
          lastTap &&
          now - lastTap.time < DOUBLE_TAP_WINDOW &&
          Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < TAP_MOVE_TOLERANCE * 2
        ) {
          lastTapRef.current = null
          onDoubleTapZoom()
        } else if (relX < EDGE_ZONE_RATIO && canPrev) {
          onPrevPage()
        } else if (relX > 1 - EDGE_ZONE_RATIO && canNext) {
          onNextPage()
        } else {
          onToggleChrome()
        }
      } else if (dragState.current && dragState.current.moved && pointers.current.size === 0) {
        const el2 = el!
        const width = el2.getBoundingClientRect().width
        const ratio = dragX / width
        setAnimating(true)
        if (ratio > SWIPE_COMMIT_RATIO && canPrev) {
          setDragX(width)
          setTimeout(() => {
            onPrevPage()
            setDragX(0)
            setAnimating(false)
          }, 180)
        } else if (ratio < -SWIPE_COMMIT_RATIO && canNext) {
          setDragX(-width)
          setTimeout(() => {
            onNextPage()
            setDragX(0)
            setAnimating(false)
          }, 180)
        } else {
          setDragX(0)
          setTimeout(() => setAnimating(false), 180)
        }
      }

      dragState.current = null
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [zoom, liveScale, dragX, canPrev, canNext, onCommitZoom, onPrevPage, onNextPage, onToggleChrome, onDoubleTapZoom])

  return (
    <div ref={rootRef} class="gesture-layer">
      <div
        class={animating ? 'gesture-content animating' : 'gesture-content'}
        style={{
          transform: `translateX(${dragX}px) scale(${liveScale})`,
          transformOrigin,
        }}
      >
        {children}
      </div>
    </div>
  )
}
