import type { BookRecord } from '../../storage/db'

export function BookCard({
  book,
  coverUrl,
  progress,
  onOpen,
}: {
  book: BookRecord
  coverUrl?: string
  progress?: number
  onOpen: () => void
}) {
  return (
    <button class="book-card" onClick={onOpen}>
      <div class="book-cover">
        {coverUrl ? <img src={coverUrl} alt="" /> : <div class="book-cover-placeholder">{book.title.slice(0, 1)}</div>}
        {progress !== undefined && progress > 0 && (
          <div class="book-progress">
            <div class="book-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>
      <div class="book-title" title={book.title}>
        {book.title}
      </div>
    </button>
  )
}
