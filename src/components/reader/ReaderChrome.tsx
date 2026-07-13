import type { JSX } from 'preact'

export function ReaderChrome({
  visible,
  title,
  onBack,
  onOpenToc,
  onOpenTheme,
  bookmarkSlot,
  sliderSlot,
}: {
  visible: boolean
  title: string
  onBack: () => void
  onOpenToc: () => void
  onOpenTheme: () => void
  bookmarkSlot: JSX.Element
  sliderSlot: JSX.Element
}) {
  return (
    <>
      <div class={visible ? 'reader-topbar visible' : 'reader-topbar'}>
        <button class="text-button" onClick={onBack}>
          ← 書庫
        </button>
        <span class="reader-title" title={title}>
          {title}
        </span>
        <div class="reader-topbar-actions">
          {bookmarkSlot}
          <button class="text-button" onClick={onOpenTheme}>
            表示
          </button>
          <button class="text-button" onClick={onOpenToc}>
            目次
          </button>
        </div>
      </div>
      <div class={visible ? 'reader-bottombar visible' : 'reader-bottombar'}>{sliderSlot}</div>
    </>
  )
}
