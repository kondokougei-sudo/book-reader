import { useState } from 'preact/hooks'

export function PageJumpSlider({
  page,
  totalPages,
  onJump,
}: {
  page: number
  totalPages: number
  onJump: (page: number) => void
}) {
  const [dragValue, setDragValue] = useState<number | null>(null)
  const displayPage = dragValue ?? page

  return (
    <div class="page-jump-slider">
      <span class="text-muted">{displayPage}</span>
      <input
        type="range"
        min={1}
        max={Math.max(totalPages, 1)}
        value={displayPage}
        onInput={(e) => setDragValue(Number((e.target as HTMLInputElement).value))}
        onChange={(e) => {
          const value = Number((e.target as HTMLInputElement).value)
          setDragValue(null)
          onJump(value)
        }}
      />
      <span class="text-muted">{totalPages}</span>
    </div>
  )
}
