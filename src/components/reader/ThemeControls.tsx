import { brightness, pageMode } from '../../state/readerSettings'

export function ThemeControls({ onClose }: { onClose: () => void }) {
  return (
    <div class="theme-controls">
      <label class="theme-controls-row">
        明るさ
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.05"
          value={brightness.value}
          onInput={(e) => (brightness.value = Number((e.target as HTMLInputElement).value))}
        />
      </label>
      <label class="theme-controls-row">
        <input
          type="checkbox"
          checked={pageMode.value === 'continuous'}
          onChange={(e) => (pageMode.value = (e.target as HTMLInputElement).checked ? 'continuous' : 'single')}
        />
        連続スクロール
      </label>
      <button class="text-button" onClick={onClose}>
        閉じる
      </button>
    </div>
  )
}
