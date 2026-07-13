import type { PDFDocumentProxy } from './pdfjsSetup'

const TARGET_LONG_EDGE = 360

export async function renderThumbnail(doc: PDFDocumentProxy): Promise<Blob> {
  const page = await doc.getPage(1)
  const baseViewport = page.getViewport({ scale: 1 })
  const longEdge = Math.max(baseViewport.width, baseViewport.height)
  const scale = TARGET_LONG_EDGE / longEdge
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context を取得できませんでした')

  await page.render({ canvas, canvasContext: ctx, viewport }).promise

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('サムネイルの生成に失敗しました')
  return blob
}
