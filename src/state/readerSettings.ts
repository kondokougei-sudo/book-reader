import { effect, signal } from '@preact/signals'
import { getSetting, setSetting } from '../storage/settingsRepo'

export type Theme = 'light' | 'dark' | 'sepia'

export const theme = signal<Theme>('dark')
export const brightness = signal(1) // 1 = full brightness, lower = dimmer overlay
export const pageMode = signal<'single' | 'continuous'>('single')

let loaded = false

export async function loadReaderSettings(): Promise<void> {
  if (loaded) return
  loaded = true
  const [savedTheme, savedBrightness, savedMode] = await Promise.all([
    getSetting<Theme>('reader:theme'),
    getSetting<number>('reader:brightness'),
    getSetting<'single' | 'continuous'>('reader:pageMode'),
  ])
  if (savedTheme) theme.value = savedTheme
  if (typeof savedBrightness === 'number') brightness.value = savedBrightness
  if (savedMode) pageMode.value = savedMode

  effect(() => {
    void setSetting('reader:theme', theme.value)
  })
  effect(() => {
    void setSetting('reader:brightness', brightness.value)
  })
  effect(() => {
    void setSetting('reader:pageMode', pageMode.value)
  })
}
