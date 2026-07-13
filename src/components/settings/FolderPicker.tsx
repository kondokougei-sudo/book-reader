import { useEffect, useState } from 'preact/hooks'
import { listSubfolders } from '../../drive/driveClient'
import type { DriveFile } from '../../drive/driveTypes'
import { Spinner } from '../common/Spinner'
import { ErrorBanner } from '../common/ErrorBanner'

interface Crumb {
  id: string
  name: string
}

export function FolderPicker({ onSelect, onCancel }: { onSelect: (id: string, name: string) => void; onCancel: () => void }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: 'root', name: 'マイドライブ' }])
  const [folders, setFolders] = useState<DriveFile[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const current = crumbs[crumbs.length - 1]

  useEffect(() => {
    let cancelled = false
    setFolders(null)
    setError(null)
    listSubfolders(current.id)
      .then((f) => {
        if (!cancelled) setFolders(f)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [current.id])

  return (
    <div class="folder-picker">
      <div class="folder-picker-crumbs">
        {crumbs.map((c, i) => (
          <span key={c.id}>
            <button class="text-button" onClick={() => setCrumbs(crumbs.slice(0, i + 1))}>
              {c.name}
            </button>
            {i < crumbs.length - 1 && <span> / </span>}
          </span>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {!folders && !error && (
        <div class="centered">
          <Spinner />
        </div>
      )}
      {folders && folders.length === 0 && <p class="text-muted">サブフォルダはありません</p>}

      <ul class="folder-picker-list">
        {folders?.map((f) => (
          <li key={f.id}>
            <button class="folder-picker-item" onClick={() => setCrumbs([...crumbs, { id: f.id, name: f.name }])}>
              📁 {f.name}
            </button>
          </li>
        ))}
      </ul>

      <div class="folder-picker-actions">
        <button class="text-button" onClick={onCancel}>
          キャンセル
        </button>
        <button class="primary-button" onClick={() => onSelect(current.id, current.name)}>
          「{current.name}」を書籍フォルダにする
        </button>
      </div>
    </div>
  )
}
