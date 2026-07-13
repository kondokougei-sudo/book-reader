import { downloadFileBytes } from '../drive/driveClient'
import { cachePdf, getCachedPdf } from '../storage/pdfBlobCache'
import { getDocument, type PDFDocumentLoadingTask, type PDFDocumentProxy } from './pdfjsSetup'

const openTasks = new Map<string, PDFDocumentLoadingTask>()
const openDocs = new Map<string, Promise<PDFDocumentProxy>>()

/**
 * Opens a book for reading, memoized per session.
 *
 * Prefers already-cached bytes (works fully offline, no network/token
 * needed). Otherwise downloads the full PDF up front before handing it to
 * pdf.js. We previously tried opening directly via pdf.js's URL+range-request
 * streaming against Drive's `alt=media` endpoint to avoid this wait, but in
 * practice range requests past the first page silently stalled (pages beyond
 * 1 never rendered), so the safer full-download path is used instead.
 */
export function openPdf(fileId: string, modifiedTime: string): Promise<PDFDocumentProxy> {
  const existing = openDocs.get(fileId)
  if (existing) return existing

  const promise = (async () => {
    let bytes = await getCachedPdf(fileId, modifiedTime)
    if (!bytes) {
      bytes = await downloadFileBytes(fileId)
      void cachePdf(fileId, modifiedTime, bytes)
    }
    const task = getDocument({ data: bytes })
    openTasks.set(fileId, task)
    return task.promise
  })()

  openDocs.set(fileId, promise)
  return promise
}

export function closePdf(fileId: string): void {
  openDocs.delete(fileId)
  const task = openTasks.get(fileId)
  if (task) {
    void task.destroy()
    openTasks.delete(fileId)
  }
}

export async function extractTitle(doc: PDFDocumentProxy, fallback: string): Promise<string> {
  try {
    const meta = await doc.getMetadata()
    const info = meta.info as { Title?: string }
    const title = info.Title?.trim()
    return title && title.length > 0 ? title : fallback
  } catch {
    return fallback
  }
}
