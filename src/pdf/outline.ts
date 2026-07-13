import type { PDFDocumentProxy } from './pdfjsSetup'

export interface TocNode {
  title: string
  page: number | null
  children: TocNode[]
}

interface RawOutlineItem {
  title: string
  dest: string | unknown[] | null
  items: RawOutlineItem[]
}

async function resolvePage(doc: PDFDocumentProxy, dest: string | unknown[] | null): Promise<number | null> {
  if (!dest) return null
  try {
    const explicitDest = typeof dest === 'string' ? await doc.getDestination(dest) : dest
    if (!explicitDest) return null
    const ref = explicitDest[0]
    const pageIndex = await doc.getPageIndex(ref)
    return pageIndex + 1
  } catch {
    return null
  }
}

async function convert(doc: PDFDocumentProxy, items: RawOutlineItem[]): Promise<TocNode[]> {
  const nodes: TocNode[] = []
  for (const item of items) {
    const page = await resolvePage(doc, item.dest)
    const children = item.items?.length ? await convert(doc, item.items) : []
    nodes.push({ title: item.title, page, children })
  }
  return nodes
}

export async function getToc(doc: PDFDocumentProxy): Promise<TocNode[]> {
  const outline = (await doc.getOutline()) as RawOutlineItem[] | null
  if (!outline || outline.length === 0) return []
  return convert(doc, outline)
}
