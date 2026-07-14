import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface BookRecord {
  fileId: string
  name: string
  title: string
  modifiedTime: string
  size: number
  pageCount?: number
  lastOpenedAt?: number
}

export interface ThumbnailRecord {
  fileId: string
  modifiedTime: string
  blob: Blob
}

export interface PositionRecord {
  fileId: string
  page: number
  zoom: number
  updatedAt: number
}

export interface BookmarkRecord {
  id: string
  fileId: string
  page: number
  createdAt: number
}

export interface TocEntryRecord {
  id: string
  fileId: string
  title: string
  page: number
  order: number
}

export interface SettingRecord {
  key: string
  value: unknown
}

interface BookReaderDB extends DBSchema {
  books: {
    key: string
    value: BookRecord
    indexes: { lastOpenedAt: number }
  }
  thumbnails: {
    key: string
    value: ThumbnailRecord
  }
  positions: {
    key: string
    value: PositionRecord
  }
  bookmarks: {
    key: string
    value: BookmarkRecord
    indexes: { fileId: string }
  }
  tocEntries: {
    key: string
    value: TocEntryRecord
    indexes: { fileId: string }
  }
  pdfBlobs: {
    key: string
    value: { fileId: string; modifiedTime: string; blob: Blob }
  }
  settings: {
    key: string
    value: SettingRecord
  }
}

let dbPromise: Promise<IDBPDatabase<BookReaderDB>> | null = null

export function getDb(): Promise<IDBPDatabase<BookReaderDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BookReaderDB>('book-reader', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const books = db.createObjectStore('books', { keyPath: 'fileId' })
          books.createIndex('lastOpenedAt', 'lastOpenedAt')
          db.createObjectStore('thumbnails', { keyPath: 'fileId' })
          db.createObjectStore('positions', { keyPath: 'fileId' })
          const bookmarks = db.createObjectStore('bookmarks', { keyPath: 'id' })
          bookmarks.createIndex('fileId', 'fileId')
          db.createObjectStore('pdfBlobs', { keyPath: 'fileId' })
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        if (oldVersion < 2) {
          const tocEntries = db.createObjectStore('tocEntries', { keyPath: 'id' })
          tocEntries.createIndex('fileId', 'fileId')
        }
      },
    })
  }
  return dbPromise
}
