import { GlobalWorkerOptions } from 'pdfjs-dist'
// Vite bundles the worker as a separate asset and gives us its final URL,
// which correctly accounts for the GitHub Pages `base` path at build time.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export * from 'pdfjs-dist'
