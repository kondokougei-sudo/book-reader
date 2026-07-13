import { getAccessToken } from '../auth/googleAuth'
import { FOLDER_MIME_TYPE, PDF_MIME_TYPE, type DriveFile } from './driveTypes'

const API_BASE = 'https://www.googleapis.com/drive/v3'

async function driveFetch(path: string, init?: RequestInit, retry = true): Promise<Response> {
  const token = await getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
  if (res.status === 401 && retry) {
    // Token may have been revoked/invalidated server-side; force one retry
    // after a fresh (non-silent-eligible) token fetch is out of scope here —
    // getAccessToken already handles expiry, so a 401 at this point means the
    // caller should prompt sign-in again.
    return res
  }
  return res
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function listFiles(query: string): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      q: query,
      fields: 'nextPageToken, files(id,name,mimeType,modifiedTime,size)',
      pageSize: '1000',
      orderBy: 'name',
      spaces: 'drive',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const res = await driveFetch(`/files?${params.toString()}`)
    if (!res.ok) {
      throw new Error(`Drive API エラー (${res.status}): ${await res.text()}`)
    }
    const data = (await res.json()) as { files: DriveFile[]; nextPageToken?: string }
    files.push(...data.files)
    pageToken = data.nextPageToken
  } while (pageToken)
  return files
}

export function listSubfolders(parentId = 'root'): Promise<DriveFile[]> {
  const q = `'${escapeQueryValue(parentId)}' in parents and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`
  return listFiles(q)
}

export function listPdfsInFolder(folderId: string): Promise<DriveFile[]> {
  const q = `'${escapeQueryValue(folderId)}' in parents and mimeType='${PDF_MIME_TYPE}' and trashed=false`
  return listFiles(q)
}

export async function getFileMetadata(fileId: string): Promise<DriveFile> {
  const res = await driveFetch(`/files/${fileId}?fields=id,name,mimeType,modifiedTime,size`)
  if (!res.ok) throw new Error(`ファイル情報の取得に失敗しました (${res.status})`)
  return res.json()
}

export async function downloadFileBytes(fileId: string): Promise<ArrayBuffer> {
  const res = await driveFetch(`/files/${fileId}?alt=media`)
  if (!res.ok) {
    throw new Error(`PDFのダウンロードに失敗しました (${res.status})`)
  }
  return res.arrayBuffer()
}
