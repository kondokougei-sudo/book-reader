import { useEffect, useState } from 'preact/hooks'
import { route } from 'preact-router'
import { isSignedIn, signIn, signOut } from '../../auth/googleAuth'
import { getLibraryFolder, setLibraryFolder } from '../../storage/settingsRepo'
import { listCachedPdfSizes, evictCachedPdf } from '../../storage/pdfBlobCache'
import { listBooks } from '../../storage/booksRepo'
import { FolderPicker } from './FolderPicker'
import { brightness, pageMode } from '../../state/readerSettings'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SettingsScreen(_props: { path?: string }) {
  const [folder, setFolder] = useState<{ id: string; name: string } | undefined>()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cached, setCached] = useState<{ fileId: string; name: string; bytes: number }[]>([])

  async function refresh() {
    setFolder(await getLibraryFolder())
    const [sizes, books] = await Promise.all([listCachedPdfSizes(), listBooks()])
    const nameOf = new Map(books.map((b) => [b.fileId, b.title]))
    setCached(sizes.map((s) => ({ ...s, name: nameOf.get(s.fileId) ?? s.fileId })))
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div class="settings-screen">
      <header class="screen-header">
        <button class="text-button" onClick={() => route('/library')}>
          ← 戻る
        </button>
        <h1>設定</h1>
        <span />
      </header>

      <section class="settings-section">
        <h2>アカウント</h2>
        {isSignedIn.value ? (
          <button class="text-button" onClick={() => signOut()}>
            サインアウト
          </button>
        ) : (
          <button class="primary-button" onClick={() => signIn()}>
            Googleでサインイン
          </button>
        )}
      </section>

      <section class="settings-section">
        <h2>書籍フォルダ</h2>
        <p class="text-muted">{folder ? folder.name : '未設定'}</p>
        {pickerOpen ? (
          <FolderPicker
            onCancel={() => setPickerOpen(false)}
            onSelect={async (id, name) => {
              await setLibraryFolder(id, name)
              setPickerOpen(false)
              void refresh()
            }}
          />
        ) : (
          <button class="text-button" onClick={() => setPickerOpen(true)} disabled={!isSignedIn.value}>
            フォルダを変更
          </button>
        )}
      </section>

      <section class="settings-section">
        <h2>読書設定</h2>
        <label class="settings-row">
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
        <label class="settings-row">
          ページ表示
          <select
            value={pageMode.value}
            onChange={(e) => (pageMode.value = (e.target as HTMLSelectElement).value as 'single' | 'continuous')}
          >
            <option value="single">1ページずつ</option>
            <option value="continuous">連続スクロール</option>
          </select>
        </label>
      </section>

      <section class="settings-section">
        <h2>オフラインキャッシュ</h2>
        {cached.length === 0 && <p class="text-muted">キャッシュされた本はありません</p>}
        <ul class="cache-list">
          {cached.map((c) => (
            <li key={c.fileId}>
              <span>{c.name}</span>
              <span class="text-muted">{formatBytes(c.bytes)}</span>
              <button
                class="text-button"
                onClick={async () => {
                  await evictCachedPdf(c.fileId)
                  void refresh()
                }}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p class="text-muted small-note">
        スキャンされたPDFのため、Kindleのような文字サイズ変更（リフロー）はできません。ピンチズームでご覧ください。
      </p>
    </div>
  )
}
