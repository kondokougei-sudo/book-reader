export function PageNavButtons({
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <>
      <button
        class="page-nav-button page-nav-button-prev"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="前のページ"
      >
        ‹
      </button>
      <button
        class="page-nav-button page-nav-button-next"
        onClick={onNext}
        disabled={!canNext}
        aria-label="次のページ"
      >
        ›
      </button>
    </>
  )
}
