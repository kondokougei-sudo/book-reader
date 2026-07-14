import { useEffect, useState } from 'preact/hooks'
import type { TocNode } from '../../pdf/outline'
import { flattenToc } from '../../pdf/outline'
import type { BookmarkRecord } from '../../storage/db'
import { clearCustomToc, listCustomToc, saveCustomTocDebounced } from '../../storage/tocRepo'

interface FlatEntry {
  title: string
  page: number
}

function AutoTocList({ nodes, onJump, depth = 0 }: { nodes: TocNode[]; onJump: (page: number) => void; depth?: number }) {
  return (
    <ul class="toc-list" style={{ paddingLeft: depth ? 16 : 0 }}>
      {nodes.map((node, i) => (
        <li key={i}>
          <button class="toc-item" disabled={node.page === null} onClick={() => node.page && onJump(node.page)}>
            <span>{node.title}</span>
            {node.page !== null && <span class="text-muted">{node.page}</span>}
          </button>
          {node.children.length > 0 && <AutoTocList nodes={node.children} onJump={onJump} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  )
}

export function TocDrawer({
  open,
  onClose,
  fileId,
  autoToc,
  totalPages,
  bookmarks,
  onJump,
  onRemoveBookmark,
}: {
  open: boolean
  onClose: () => void
  fileId?: string
  autoToc: TocNode[]
  totalPages: number
  bookmarks: BookmarkRecord[]
  onJump: (page: number) => void
  onRemoveBookmark: (page: number) => void
}) {
  const [tab, setTab] = useState<'toc' | 'bookmarks'>('toc')
  const [editing, setEditing] = useState(false)
  const [customEntries, setCustomEntries] = useState<FlatEntry[] | null>(null)

  useEffect(() => {
    if (!fileId) return
    setEditing(false)
    listCustomToc(fileId).then((rows) => {
      setCustomEntries(rows.length > 0 ? rows.map((r) => ({ title: r.title, page: r.page })) : [])
    })
  }, [fileId])

  if (!open) return null

  const hasCustom = (customEntries?.length ?? 0) > 0
  const hasAuto = autoToc.length > 0

  function updateEntries(next: FlatEntry[]) {
    setCustomEntries(next)
    if (fileId) saveCustomTocDebounced(fileId, next)
  }

  function startEditing() {
    if (!hasCustom) {
      // Seed from the auto-detected outline (or a single blank row) so editing
      // starts from something, rather than an empty list wiping the auto TOC.
      const seed = hasAuto ? flattenToc(autoToc) : [{ title: '', page: 1 }]
      updateEntries(seed)
    }
    setEditing(true)
  }

  async function resetToAuto() {
    if (fileId) await clearCustomToc(fileId)
    setCustomEntries([])
    setEditing(false)
  }

  return (
    <>
      <div class="drawer-backdrop" onClick={onClose} />
      <div class="drawer">
        <div class="drawer-tabs">
          <button class={tab === 'toc' ? 'drawer-tab active' : 'drawer-tab'} onClick={() => setTab('toc')}>
            目次
          </button>
          <button class={tab === 'bookmarks' ? 'drawer-tab active' : 'drawer-tab'} onClick={() => setTab('bookmarks')}>
            しおり
          </button>
          <button class="text-button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div class="drawer-body">
          {tab === 'toc' && (
            <div class="toc-panel">
              <div class="toc-panel-actions">
                {editing ? (
                  <button class="text-button" onClick={() => setEditing(false)}>
                    完了
                  </button>
                ) : (
                  <button class="text-button" onClick={startEditing} disabled={!fileId}>
                    編集
                  </button>
                )}
                {hasCustom && (
                  <button class="text-button" onClick={resetToAuto}>
                    自動検出に戻す
                  </button>
                )}
              </div>

              {editing && customEntries ? (
                <div class="toc-edit-list">
                  {customEntries.map((entry, i) => (
                    <div class="toc-edit-row" key={i}>
                      <input
                        type="text"
                        class="toc-edit-title"
                        placeholder="章名"
                        value={entry.title}
                        onInput={(e) => {
                          const next = [...customEntries]
                          next[i] = { ...next[i], title: (e.target as HTMLInputElement).value }
                          updateEntries(next)
                        }}
                      />
                      <input
                        type="number"
                        class="toc-edit-page"
                        min={1}
                        max={totalPages || undefined}
                        value={entry.page}
                        onInput={(e) => {
                          const next = [...customEntries]
                          const value = Number((e.target as HTMLInputElement).value) || 1
                          next[i] = { ...next[i], page: value }
                          updateEntries(next)
                        }}
                      />
                      <button
                        class="text-button"
                        onClick={() => updateEntries(customEntries.filter((_, idx) => idx !== i))}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button class="text-button" onClick={() => updateEntries([...customEntries, { title: '', page: 1 }])}>
                    ＋ 項目を追加
                  </button>
                </div>
              ) : hasCustom && customEntries ? (
                <ul class="toc-list">
                  {customEntries.map((entry, i) => (
                    <li key={i}>
                      <button class="toc-item" onClick={() => onJump(entry.page)}>
                        <span>{entry.title || '（無題）'}</span>
                        <span class="text-muted">{entry.page}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : hasAuto ? (
                <AutoTocList nodes={autoToc} onJump={onJump} />
              ) : (
                <p class="text-muted">
                  目次はありません。「編集」から章名とページを手動で追加できます。
                </p>
              )}
            </div>
          )}
          {tab === 'bookmarks' &&
            (bookmarks.length > 0 ? (
              <ul class="toc-list">
                {bookmarks.map((b) => (
                  <li key={b.id}>
                    <button class="toc-item" onClick={() => onJump(b.page)}>
                      <span>{b.page} ページ</span>
                    </button>
                    <button class="text-button" onClick={() => onRemoveBookmark(b.page)}>
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p class="text-muted">しおりはありません</p>
            ))}
        </div>
      </div>
    </>
  )
}
