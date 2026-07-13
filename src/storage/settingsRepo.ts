import { getDb } from './db'

const FOLDER_ID_KEY = 'libraryFolderId'
const FOLDER_NAME_KEY = 'libraryFolderName'

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDb()
  const record = await db.get('settings', key)
  return record?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb()
  await db.put('settings', { key, value })
}

export function getLibraryFolder(): Promise<{ id: string; name: string } | undefined> {
  return Promise.all([getSetting<string>(FOLDER_ID_KEY), getSetting<string>(FOLDER_NAME_KEY)]).then(
    ([id, name]) => (id && name ? { id, name } : undefined),
  )
}

export async function setLibraryFolder(id: string, name: string): Promise<void> {
  await setSetting(FOLDER_ID_KEY, id)
  await setSetting(FOLDER_NAME_KEY, name)
}
