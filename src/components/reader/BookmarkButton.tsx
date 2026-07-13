export function BookmarkButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button class="bookmark-button" onClick={onToggle} aria-label={active ? 'しおりを外す' : 'しおりを挟む'}>
      {active ? '🔖' : '📑'}
    </button>
  )
}
