import { getDb, type TocEntryRecord } from './db'

export async function listCustomToc(fileId: string): Promise<TocEntryRecord[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('tocEntries', 'fileId', fileId)
  return all.sort((a, b) => a.order - b.order)
}

export async function hasCustomToc(fileId: string): Promise<boolean> {
  const entries = await listCustomToc(fileId)
  return entries.length > 0
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 500

/** Debounced save, safe to call on every keystroke while editing. */
export function saveCustomTocDebounced(fileId: string, entries: { title: string; page: number }[]): void {
  const existing = debounceTimers.get(fileId)
  if (existing) clearTimeout(existing)
  debounceTimers.set(
    fileId,
    setTimeout(() => {
      debounceTimers.delete(fileId)
      void saveCustomToc(fileId, entries)
    }, DEBOUNCE_MS),
  )
}

/** Replaces the full custom TOC for a book (simplest correct model for a short, hand-edited list). */
export async function saveCustomToc(fileId: string, entries: { title: string; page: number }[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('tocEntries', 'readwrite')
  const existing = await tx.store.index('fileId').getAllKeys(fileId)
  await Promise.all(existing.map((key) => tx.store.delete(key)))
  await Promise.all(
    entries.map((entry, index) =>
      tx.store.put({ id: `${fileId}:${index}:${Date.now()}:${Math.random()}`, fileId, title: entry.title, page: entry.page, order: index }),
    ),
  )
  await tx.done
}

export async function clearCustomToc(fileId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('tocEntries', 'readwrite')
  const existing = await tx.store.index('fileId').getAllKeys(fileId)
  await Promise.all(existing.map((key) => tx.store.delete(key)))
  await tx.done
}
