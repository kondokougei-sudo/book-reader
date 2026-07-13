export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      class="search-bar"
      type="search"
      placeholder="書籍を検索"
      value={value}
      onInput={(e) => onChange((e.target as HTMLInputElement).value)}
    />
  )
}
