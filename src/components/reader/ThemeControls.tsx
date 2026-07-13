import { theme, brightness, pageMode, type Theme } from '../../state/readerSettings'

export function ThemeControls({ onClose }: { onClose: () => void }) {
  return (
    <div class="theme-controls">
      <div class="theme-controls-row">
        {(['light', 'dark', 'sepia'] as Theme[]).map((t) => (
          <button
            key={t}
            class={theme.value === t ? 'theme-swatch active' : 'theme-swatch'}
            data-theme={t}
            onClick={() => (theme.value = t)}
          >
            {t === 'light' ? 'ライト' : t === 'dark' ? 'ダーク' : 'セピア'}
          </button>
        ))}
      </div>
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
