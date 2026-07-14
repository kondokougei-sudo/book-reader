import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { route } from 'preact-router'
import { getFileMetadata } from '../../drive/driveClient'
import { getBook, markOpened, setPageCount, upsertBook } from '../../storage/booksRepo'
import { getPosition, savePositionDebounced, savePositionImmediate } from '../../storage/positionRepo'
import { listBookmarks, toggleBookmark } from '../../storage/bookmarksRepo'
import { openPdf, closePdf, extractTitle } from '../../pdf/pdfDocument'
import { getToc, type TocNode } from '../../pdf/outline'
import type { PDFDocumentProxy } from '../../pdf/pdfjsSetup'
import type { BookmarkRecord } from '../../storage/db'
import { brightness, pageMode } from '../../state/readerSettings'
import { PageCanvas } from './PageCanvas'
import { PageNavButtons } from './PageNavButtons'
import { ContinuousReader } from './ContinuousReader'
import { GestureLayer } from './GestureLayer'
import { ReaderChrome } from './ReaderChrome'
import { TocDrawer } from './TocDrawer'
import { PageJumpSlider } from './PageJumpSlider'
import { BookmarkButton } from './BookmarkButton'
import { ThemeControls } from './ThemeControls'
import { Spinner } from '../common/Spinner'
import { ErrorBanner } from '../common/ErrorBanner'

export function ReaderScreen({ fileId }: { path?: string; fileId?: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [title, setTitle] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [tocOpen, setTocOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [toc, setToc] = useState<TocNode[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!fileId) return
    let cancelled = false
    setError(null)
    setDoc(null)

    ;(async () => {
      let book = await getBook(fileId)
      if (!book) {
        const meta = await getFileMetadata(fileId)
        book = {
          fileId,
          name: meta.name,
          title: meta.name.replace(/\.pdf$/i, ''),
          modifiedTime: meta.modifiedTime ?? '',
          size: Number(meta.size ?? 0),
        }
        await upsertBook(book)
      }
      if (cancelled) return
      setTitle(book.title)

      const [pdfDoc, position, bms] = await Promise.all([
        openPdf(fileId, book.modifiedTime),
        getPosition(fileId),
        listBookmarks(fileId),
      ])
      if (cancelled) return

      setDoc(pdfDoc)
      setTotalPages(pdfDoc.numPages)
      setCurrentPage(Math.min(position?.page ?? 1, pdfDoc.numPages))
      setZoom(position?.zoom ?? 1)
      setBookmarks(bms)

      void markOpened(fileId)
      void setPageCount(fileId, pdfDoc.numPages)
      void extractTitle(pdfDoc, book.title).then((t) => {
        if (!cancelled) setTitle(t)
      })
      void getToc(pdfDoc).then((t) => {
        if (!cancelled) setToc(t)
      })
    })().catch((err: Error) => {
      if (!cancelled) setError(err.message)
    })

    return () => {
      cancelled = true
      closePdf(fileId)
    }
  }, [fileId])

  const goToPage = useCallback(
    (page: number) => {
      if (!fileId || totalPages === 0) return
      const clamped = Math.min(Math.max(page, 1), totalPages)
      setCurrentPage(clamped)
      savePositionDebounced(fileId, clamped, zoom)
    },
    [fileId, totalPages, zoom],
  )

  const commitZoom = useCallback(
    (z: number) => {
      setZoom(z)
      if (fileId) savePositionDebounced(fileId, currentPage, z)
    },
    [fileId, currentPage],
  )

  useEffect(() => {
    if (!fileId) return
    function persist() {
      savePositionImmediate(fileId!, currentPage, zoom)
    }
    document.addEventListener('visibilitychange', persist)
    window.addEventListener('pagehide', persist)
    return () => {
      document.removeEventListener('visibilitychange', persist)
      window.removeEventListener('pagehide', persist)
      persist()
    }
  }, [fileId, currentPage, zoom])

  const bookmarked = useMemo(() => bookmarks.some((b) => b.page === currentPage), [bookmarks, currentPage])

  async function handleToggleBookmark() {
    if (!fileId) return
    await toggleBookmark(fileId, currentPage)
    setBookmarks(await listBookmarks(fileId))
  }

  async function handleRemoveBookmark(page: number) {
    if (!fileId) return
    await toggleBookmark(fileId, page)
    setBookmarks(await listBookmarks(fileId))
  }

  if (error) {
    return (
      <div class="centered">
        <ErrorBanner message={error} />
        <button class="primary-button" onClick={() => route('/library')}>
          書庫に戻る
        </button>
      </div>
    )
  }

  return (
    <div class="reader-screen">
      <div ref={containerRef} class="reader-viewport">
        {!doc && (
          <div class="centered">
            <Spinner />
          </div>
        )}
        {doc && size.width > 0 && (
          <>
            {pageMode.value === 'single' ? (
              <GestureLayer
                zoom={zoom}
                onCommitZoom={commitZoom}
                onPrevPage={() => goToPage(currentPage - 1)}
                onNextPage={() => goToPage(currentPage + 1)}
                onToggleChrome={() => setChromeVisible((v) => !v)}
                onDoubleTapZoom={() => commitZoom(zoom > 1 ? 1 : 2)}
                canPrev={currentPage > 1}
                canNext={currentPage < totalPages}
              >
                <PageCanvas doc={doc} pageNumber={currentPage} containerWidth={size.width} containerHeight={size.height} zoom={zoom} />
              </GestureLayer>
            ) : (
              <ContinuousReader
                doc={doc}
                totalPages={totalPages}
                currentPage={currentPage}
                containerWidth={size.width}
                containerHeight={size.height}
                onPageInView={goToPage}
              />
            )}
            <div class="brightness-overlay" style={{ opacity: 1 - brightness.value }} />
            {pageMode.value === 'single' && (
              <PageNavButtons
                canPrev={currentPage > 1}
                canNext={currentPage < totalPages}
                onPrev={() => goToPage(currentPage - 1)}
                onNext={() => goToPage(currentPage + 1)}
              />
            )}
          </>
        )}
      </div>

      {doc && (
        <ReaderChrome
          visible={chromeVisible}
          title={title}
          onBack={() => route('/library')}
          onOpenToc={() => setTocOpen(true)}
          onOpenTheme={() => setThemeOpen(true)}
          bookmarkSlot={<BookmarkButton active={bookmarked} onToggle={handleToggleBookmark} />}
          sliderSlot={<PageJumpSlider page={currentPage} totalPages={totalPages} onJump={goToPage} />}
        />
      )}

      <TocDrawer
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        fileId={fileId}
        autoToc={toc}
        totalPages={totalPages}
        bookmarks={bookmarks}
        onJump={(p) => {
          goToPage(p)
          setTocOpen(false)
        }}
        onRemoveBookmark={handleRemoveBookmark}
      />

      {themeOpen && (
        <>
          <div class="drawer-backdrop" onClick={() => setThemeOpen(false)} />
          <ThemeControls onClose={() => setThemeOpen(false)} />
        </>
      )}
    </div>
  )
}
