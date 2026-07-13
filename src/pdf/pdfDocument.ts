import { getAccessToken } from '../auth/googleAuth'
import { downloadFileBytes } from '../drive/driveClient'
import { cachePdf, getCachedPdf } from '../storage/pdfBlobCache'
import { getDocument, type PDFDocumentLoadingTask, type PDFDocumentProxy } from './pdfjsSetup'

const DRIVE_MEDIA_BASE = 'https://www.googleapis.com/drive/v3/files'

interface OpenEntry {
  task: PDFDocumentLoadingTask
  promise: Promise<PDFDocumentProxy>
}

const openDocs = new Map<string, OpenEntry>()

/**
 * Opens a book for reading, memoized per session.
 *
 * Prefers already-cached bytes (works fully offline, no network/token
 * needed). Otherwise opens via pdf.js's URL+range-request streaming so the
 * first page renders without waiting for the whole (often 100MB+) scanned
 * book to download, while kicking off a background full download to
 * populate the offline cache for next time.
 */
export async function openPdf(fileId: string, modifiedTime: string): Promise<PDFDocumentProxy> {
  const existing = openDocs.get(fileId)
  if (existing) return existing.promise

  const cached = await getCachedPdf(fileId, modifiedTime)
  const task = cached
    ? getDocument({ data: cached })
    : getDocument({
        url: `${DRIVE_MEDIA_BASE}/${fileId}?alt=media`,
        httpHeaders: { Authorization: `Bearer ${await getAccessToken()}` },
      })

  const promise = task.promise
  openDocs.set(fileId, { task, promise })

  if (!cached) {
    void promise.then(() =>
      downloadFileBytes(fileId)
        .then((bytes) => cachePdf(fileId, modifiedTime, bytes))
        .catch((err) => console.warn('バックグラウンドキャッシュに失敗しました', err)),
    )
  }

  return promise
}

export function closePdf(fileId: string): void {
  const entry = openDocs.get(fileId)
  if (entry) {
    void entry.task.destroy()
    openDocs.delete(fileId)
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
