import { useEffect, useRef, useState } from 'preact/hooks'
import type { PDFDocumentProxy, RenderTask } from '../../pdf/pdfjsSetup'

export function PageCanvas({
  doc,
  pageNumber,
  containerWidth,
  containerHeight,
  zoom,
}: {
  doc: PDFDocumentProxy
  pageNumber: number
  containerWidth: number
  containerHeight: number
  zoom: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const [rendering, setRendering] = useState(true)

  useEffect(() => {
    let cancelled = false
    setRendering(true)

    ;(async () => {
      const page = await doc.getPage(pageNumber)
      if (cancelled) return

      const unscaled = page.getViewport({ scale: 1 })
      const fitScale = Math.min(containerWidth / unscaled.width, containerHeight / unscaled.height)
      const dpr = window.devicePixelRatio || 1
      const viewport = page.getViewport({ scale: fitScale * zoom * dpr })

      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      canvas.style.width = `${Math.ceil(viewport.width / dpr)}px`
      canvas.style.height = `${Math.ceil(viewport.height / dpr)}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      renderTaskRef.current?.cancel()
      const task = page.render({ canvas, canvasContext: ctx, viewport })
      renderTaskRef.current = task
      try {
        await task.promise
        if (!cancelled) setRendering(false)
      } catch (err) {
        if (!cancelled && (err as { name?: string }).name !== 'RenderingCancelledException') {
          console.warn('ページ描画に失敗しました', err)
          setRendering(false)
        }
      }
    })()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [doc, pageNumber, containerWidth, containerHeight, zoom])

  return (
    <div class="page-canvas-wrap">
      {rendering && <div class="page-loading" />}
      <canvas ref={canvasRef} />
    </div>
  )
}
