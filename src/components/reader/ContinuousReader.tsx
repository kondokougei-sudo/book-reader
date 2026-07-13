import { useEffect, useRef, useState } from 'preact/hooks'
import type { PDFDocumentProxy } from '../../pdf/pdfjsSetup'
import { PageCanvas } from './PageCanvas'

const RENDER_WINDOW = 1

export function ContinuousReader({
  doc,
  totalPages,
  currentPage,
  containerWidth,
  containerHeight,
  onPageInView,
}: {
  doc: PDFDocumentProxy
  totalPages: number
  currentPage: number
  containerWidth: number
  containerHeight: number
  onPageInView: (page: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [aspect, setAspect] = useState(1.41) // height/width fallback, refined below
  const didInitialScroll = useRef(false)

  useEffect(() => {
    doc.getPage(1).then((page) => {
      const vp = page.getViewport({ scale: 1 })
      setAspect(vp.height / vp.width)
    })
  }, [doc])

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { page: number; ratio: number } | null = null
        for (const entry of entries) {
          const page = Number((entry.target as HTMLElement).dataset.page)
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.ratio)) {
            best = { page, ratio: entry.intersectionRatio }
          }
        }
        if (best) onPageInView(best.page)
      },
      { root, threshold: [0.5] },
    )
    slotRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [totalPages, onPageInView])

  useEffect(() => {
    if (didInitialScroll.current) return
    const el = slotRefs.current.get(currentPage)
    if (el) {
      el.scrollIntoView({ block: 'start' })
      didInitialScroll.current = true
    }
  }, [currentPage])

  const slotHeight = containerWidth * aspect

  return (
    <div ref={scrollRef} class="continuous-reader">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
        <div
          key={pageNumber}
          class="continuous-page-slot"
          data-page={pageNumber}
          ref={(el) => {
            if (el) slotRefs.current.set(pageNumber, el)
            else slotRefs.current.delete(pageNumber)
          }}
          style={{ minHeight: slotHeight }}
        >
          {Math.abs(pageNumber - currentPage) <= RENDER_WINDOW ? (
            <PageCanvas doc={doc} pageNumber={pageNumber} containerWidth={containerWidth} containerHeight={containerHeight} zoom={1} />
          ) : (
            <div class="continuous-page-placeholder">{pageNumber}</div>
          )}
        </div>
      ))}
    </div>
  )
}
