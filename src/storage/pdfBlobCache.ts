import { getDb } from './db'

export async function getCachedPdf(fileId: string, modifiedTime: string): Promise<ArrayBuffer | undefined> {
  const db = await getDb()
  const record = await db.get('pdfBlobs', fileId)
  if (!record || record.modifiedTime !== modifiedTime) return undefined
  return record.blob.arrayBuffer()
}

export async function cachePdf(fileId: string, modifiedTime: string, bytes: ArrayBuffer): Promise<void> {
  const db = await getDb()
  const blob = new Blob([bytes], { type: 'application/pdf' })
  try {
    await db.put('pdfBlobs', { fileId, modifiedTime, blob })
  } catch (err) {
    // Likely QuotaExceededError on a full tablet — reading still works from
    // the in-memory bytes already handed to pdf.js, we just skip offline caching.
    console.warn('PDFのオフラインキャッシュに失敗しました（容量不足の可能性）', err)
  }
}

export async function evictCachedPdf(fileId: string): Promise<void> {
  const db = await getDb()
  await db.delete('pdfBlobs', fileId)
}

export async function listCachedPdfSizes(): Promise<{ fileId: string; bytes: number }[]> {
  const db = await getDb()
  const all = await db.getAll('pdfBlobs')
  return all.map((r) => ({ fileId: r.fileId, bytes: r.blob.size }))
}
