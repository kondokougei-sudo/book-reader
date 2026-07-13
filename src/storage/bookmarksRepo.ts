import { getDb, type BookmarkRecord } from './db'

export async function listBookmarks(fileId: string): Promise<BookmarkRecord[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('bookmarks', 'fileId', fileId)
  return all.sort((a, b) => a.page - b.page)
}

export async function isBookmarked(fileId: string, page: number): Promise<boolean> {
  const bookmarks = await listBookmarks(fileId)
  return bookmarks.some((b) => b.page === page)
}

export async function toggleBookmark(fileId: string, page: number): Promise<boolean> {
  const db = await getDb()
  const bookmarks = await listBookmarks(fileId)
  const existing = bookmarks.find((b) => b.page === page)
  if (existing) {
    await db.delete('bookmarks', existing.id)
    return false
  }
  const record: BookmarkRecord = { id: `${fileId}:${page}`, fileId, page, createdAt: Date.now() }
  await db.put('bookmarks', record)
  return true
}
