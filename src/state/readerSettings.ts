import { effect, signal } from '@preact/signals'
import { getSetting, setSetting } from '../storage/settingsRepo'

export const brightness = signal(1) // 1 = full brightness, lower = dimmer overlay
export const pageMode = signal<'single' | 'continuous'>('single')

let loaded = false

export async function loadReaderSettings(): Promise<void> {
  if (loaded) return
  loaded = true
  const [savedBrightness, savedMode] = await Promise.all([
    getSetting<number>('reader:brightness'),
    getSetting<'single' | 'continuous'>('reader:pageMode'),
  ])
  if (typeof savedBrightness === 'number') brightness.value = savedBrightness
  if (savedMode) pageMode.value = savedMode

  effect(() => {
    void setSetting('reader:brightness', brightness.value)
  })
  effect(() => {
    void setSetting('reader:pageMode', pageMode.value)
  })
}
