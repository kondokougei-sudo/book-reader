import { getDb } from './db'

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 600

export async function getPosition(fileId: string): Promise<{ page: number; zoom: number } | undefined> {
  const db = await getDb()
  const record = await db.get('positions', fileId)
  return record ? { page: record.page, zoom: record.zoom } : undefined
}

async function writePosition(fileId: string, page: number, zoom: number): Promise<void> {
  const db = await getDb()
  await db.put('positions', { fileId, page, zoom, updatedAt: Date.now() })
}

/** Debounced save — safe to call on every page/zoom change during interaction. */
export function savePositionDebounced(fileId: string, page: number, zoom: number): void {
  const existing = debounceTimers.get(fileId)
  if (existing) clearTimeout(existing)
  debounceTimers.set(
    fileId,
    setTimeout(() => {
      debounceTimers.delete(fileId)
      void writePosition(fileId, page, zoom)
    }, DEBOUNCE_MS),
  )
}

/** Immediate save — use on backgrounding/unload where a debounce might be lost. */
export function savePositionImmediate(fileId: string, page: number, zoom: number): void {
  const existing = debounceTimers.get(fileId)
  if (existing) {
    clearTimeout(existing)
    debounceTimers.delete(fileId)
  }
  void writePosition(fileId, page, zoom)
}
