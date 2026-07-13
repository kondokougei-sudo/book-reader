import { useEffect } from 'preact/hooks'
import Router from 'preact-router'
import { LibraryScreen } from './components/library/LibraryScreen'
import { ReaderScreen } from './components/reader/ReaderScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { loadReaderSettings } from './state/readerSettings'
import { baseAwareHistory } from './router/baseHistory'

export function App() {
  useEffect(() => {
    void loadReaderSettings()
  }, [])

  return (
    <div class="app-shell">
      <Router history={baseAwareHistory}>
        <LibraryScreen path="/" />
        <LibraryScreen path="/library" />
        <ReaderScreen path="/read/:fileId" />
        <SettingsScreen path="/settings" />
      </Router>
    </div>
  )
}
