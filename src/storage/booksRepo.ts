import { getDb, type BookRecord } from './db'

export async function upsertBook(book: BookRecord): Promise<void> {
  const db = await getDb()
  const existing = await db.get('books', book.fileId)
  await db.put('books', { ...existing, ...book })
}

export async function listBooks(): Promise<BookRecord[]> {
  const db = await getDb()
  const all = await db.getAll('books')
  return all.sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
}

export async function getBook(fileId: string): Promise<BookRecord | undefined> {
  const db = await getDb()
  return db.get('books', fileId)
}

export async function markOpened(fileId: string): Promise<void> {
  const db = await getDb()
  const existing = await db.get('books', fileId)
  if (!existing) return
  await db.put('books', { ...existing, lastOpenedAt: Date.now() })
}

export async function setPageCount(fileId: string, pageCount: number): Promise<void> {
  const db = await getDb()
  const existing = await db.get('books', fileId)
  if (!existing) return
  await db.put('books', { ...existing, pageCount })
}

export async function pruneRemoved(currentFileIds: Set<string>): Promise<void> {
  const db = await getDb()
  const all = await db.getAll('books')
  const tx = db.transaction('books', 'readwrite')
  await Promise.all(
    all.filter((b) => !currentFileIds.has(b.fileId)).map((b) => tx.store.delete(b.fileId)),
  )
  await tx.done
}
