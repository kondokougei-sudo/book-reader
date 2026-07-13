import { getDb } from './db'

export async function getThumbnail(fileId: string, modifiedTime: string): Promise<Blob | undefined> {
  const db = await getDb()
  const record = await db.get('thumbnails', fileId)
  if (!record || record.modifiedTime !== modifiedTime) return undefined
  return record.blob
}

export async function setThumbnail(fileId: string, modifiedTime: string, blob: Blob): Promise<void> {
  const db = await getDb()
  await db.put('thumbnails', { fileId, modifiedTime, blob })
}
