import { useEffect, useMemo, useState } from 'preact/hooks'
import { route } from 'preact-router'
import { isSignedIn, signIn } from '../../auth/googleAuth'
import { listPdfsInFolder } from '../../drive/driveClient'
import { getLibraryFolder } from '../../storage/settingsRepo'
import { listBooks, pruneRemoved, upsertBook } from '../../storage/booksRepo'
import type { BookRecord } from '../../storage/db'
import { getPosition } from '../../storage/positionRepo'
import { getThumbnail, setThumbnail } from '../../storage/thumbnailsRepo'
import { openPdf, closePdf, extractTitle } from '../../pdf/pdfDocument'
import { renderThumbnail } from '../../pdf/thumbnail'
import { mapWithConcurrency } from '../../lib/concurrency'
import { BookCard } from './BookCard'
import { SearchBar } from './SearchBar'
import { Spinner } from '../common/Spinner'
import { ErrorBanner } from '../common/ErrorBanner'

interface Row extends BookRecord {
  progress?: number
}

export function LibraryScreen(_props: { path?: string }) {
  const [folder, setFolder] = useState<{ id: string; name: string } | undefined | null>(null)
  const [books, setBooks] = useState<Row[]>([])
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    void getLibraryFolder().then((f) => setFolder(f ?? undefined))
  }, [])

  useEffect(() => {
    if (!isSignedIn.value || !folder) return
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      const files = await listPdfsInFolder(folder.id)
      if (cancelled) return

      await Promise.all(
        files.map((f) =>
          upsertBook({
            fileId: f.id,
            name: f.name,
            title: f.name.replace(/\.pdf$/i, ''),
            modifiedTime: f.modifiedTime ?? '',
            size: Number(f.size ?? 0),
          }),
        ),
      )
      await pruneRemoved(new Set(files.map((f) => f.id)))

      const stored = await listBooks()
      const withProgress: Row[] = await Promise.all(
        stored.map(async (b) => {
          const pos = await getPosition(b.fileId)
          const progress = pos && b.pageCount ? pos.page / b.pageCount : undefined
          return { ...b, progress }
        }),
      )
      if (!cancelled) {
        setBooks(withProgress)
        setLoading(false)
      }

      // Lazily generate missing/stale thumbnails, a couple at a time.
      await mapWithConcurrency(stored, 2, async (book) => {
        if (cancelled) return
        const existing = await getThumbnail(book.fileId, book.modifiedTime)
        if (existing) {
          if (!cancelled) setCovers((c) => ({ ...c, [book.fileId]: URL.createObjectURL(existing) }))
          return
        }
        try {
          const doc = await openPdf(book.fileId, book.modifiedTime)
          const [blob, title] = await Promise.all([renderThumbnail(doc), extractTitle(doc, book.title)])
          await setThumbnail(book.fileId, book.modifiedTime, blob)
          await upsertBook({ ...book, title, pageCount: doc.numPages })
          if (!cancelled) {
            setCovers((c) => ({ ...c, [book.fileId]: URL.createObjectURL(blob) }))
            setBooks((rows) => rows.map((r) => (r.fileId === book.fileId ? { ...r, title, pageCount: doc.numPages } : r)))
          }
        } catch (err) {
          console.warn(`表紙の生成に失敗しました: ${book.name}`, err)
        } finally {
          closePdf(book.fileId)
        }
      })
    })().catch((err: Error) => {
      if (!cancelled) {
        setError(err.message)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [folder])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return books
    return books.filter((b) => b.title.toLowerCase().includes(q))
  }, [books, query])

  if (!isSignedIn.value) {
    return (
      <div class="centered">
        <h1>書庫</h1>
        <p class="text-muted">Google DriveのPDF書籍を読むには、サインインしてください。</p>
        <button class="primary-button" onClick={() => signIn()}>
          Googleでサインイン
        </button>
      </div>
    )
  }

  if (folder === null) {
    return (
      <div class="centered">
        <Spinner />
      </div>
    )
  }

  if (!folder) {
    return (
      <div class="centered">
        <h1>書庫</h1>
        <p class="text-muted">書籍が入っているGoogle Driveのフォルダを選択してください。</p>
        <button class="primary-button" onClick={() => route('/settings')}>
          フォルダを選択
        </button>
      </div>
    )
  }

  return (
    <div class="library-screen">
      <header class="screen-header">
        <h1>{folder.name}</h1>
        <button class="text-button" onClick={() => route('/settings')}>
          設定
        </button>
      </header>

      <SearchBar value={query} onChange={setQuery} />

      {error && <ErrorBanner message={error} />}
      {loading && (
        <div class="centered">
          <Spinner />
        </div>
      )}

      {!loading && filtered.length === 0 && !error && <p class="text-muted centered">このフォルダにPDFが見つかりません</p>}

      <div class="book-grid">
        {filtered.map((b) => (
          <BookCard
            key={b.fileId}
            book={b}
            coverUrl={covers[b.fileId]}
            progress={b.progress}
            onOpen={() => route(`/read/${b.fileId}`)}
          />
        ))}
      </div>
    </div>
  )
}
