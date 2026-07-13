export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  size?: string
}

export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
export const PDF_MIME_TYPE = 'application/pdf'
