import { useState } from 'preact/hooks'
import type { TocNode } from '../../pdf/outline'
import type { BookmarkRecord } from '../../storage/db'

function TocList({ nodes, onJump, depth = 0 }: { nodes: TocNode[]; onJump: (page: number) => void; depth?: number }) {
  return (
    <ul class="toc-list" style={{ paddingLeft: depth ? 16 : 0 }}>
      {nodes.map((node, i) => (
        <li key={i}>
          <button class="toc-item" disabled={node.page === null} onClick={() => node.page && onJump(node.page)}>
            <span>{node.title}</span>
            {node.page !== null && <span class="text-muted">{node.page}</span>}
          </button>
          {node.children.length > 0 && <TocList nodes={node.children} onJump={onJump} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  )
}

export function TocDrawer({
  open,
  onClose,
  toc,
  bookmarks,
  onJump,
  onRemoveBookmark,
}: {
  open: boolean
  onClose: () => void
  toc: TocNode[]
  bookmarks: BookmarkRecord[]
  onJump: (page: number) => void
  onRemoveBookmark: (page: number) => void
}) {
  const [tab, setTab] = useState<'toc' | 'bookmarks'>('toc')
  if (!open) return null

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
          {tab === 'toc' &&
            (toc.length > 0 ? (
              <TocList nodes={toc} onJump={onJump} />
            ) : (
              <p class="text-muted">目次はありません</p>
            ))}
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
