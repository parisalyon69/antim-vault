'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { buildFilePath, uploadFile, formatFileSize } from '@/lib/vault/storage'
import { createClient } from '@/lib/supabase/client'
import type { DocumentCategory } from '@/lib/types'
import { logActivity } from '@/lib/activity'

interface Props {
  vaultId: string
  userId: string
  category: DocumentCategory
  onUploaded: () => void
}

const ACCEPTED = 'application/pdf,image/jpeg,image/png,image/webp'
const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const TARGET_SIZE = 1.5 * 1024 * 1024 // 1.5MB per page target

// Detect touch/mobile screen — pointer:coarse is more reliable than userAgent
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

// Compress an image File via canvas to approach TARGET_SIZE
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      // Scale down if too large
      const MAX_DIM = 2048
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // Try progressively lower quality until under TARGET_SIZE
      const tryQuality = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return }
            if (blob.size <= TARGET_SIZE || q <= 0.3) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
            } else {
              tryQuality(q - 0.1)
            }
          },
          'image/jpeg',
          q
        )
      }
      tryQuality(0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// Build a PDF from an array of image Files using pdf-lib
async function buildPdfFromImages(images: File[]): Promise<File> {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()

  for (const img of images) {
    const bytes = await img.arrayBuffer()
    let pdfImage
    if (img.type === 'image/png') {
      pdfImage = await pdf.embedPng(bytes)
    } else {
      pdfImage = await pdf.embedJpg(bytes)
    }
    const page = pdf.addPage([pdfImage.width, pdfImage.height])
    page.drawImage(pdfImage, { x: 0, y: 0, width: pdfImage.width, height: pdfImage.height })
  }

  const pdfBytes = await pdf.save()
  const baseName = images[0].name.replace(/\.[^.]+$/, '')
  return new File([new Uint8Array(pdfBytes)], `${baseName}.pdf`, { type: 'application/pdf' })
}

export default function DocumentUploader({ vaultId, userId, category, onUploaded }: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  const [mode, setMode] = useState<'idle' | 'file-selected' | 'scanning'>('idle')
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Scanner state
  const [scannedPages, setScannedPages] = useState<File[]>([])
  const [scanPreviews, setScanPreviews] = useState<string[]>([])
  const [scanError, setScanError] = useState<string | null>(null)

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { scanPreviews.forEach((u) => URL.revokeObjectURL(u)) }
  }, [scanPreviews])

  function reset() {
    setMode('idle')
    setSelectedFile(null)
    setDescription('')
    setExpiryDate('')
    setError(null)
    setScannedPages([])
    setScanPreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return [] })
    setScanError(null)
    setProgress(null)
  }

  // Regular file input
  function handleFileSelect(file: File) {
    if (file.size > MAX_BYTES) {
      setError(`File too large. Maximum size is 10MB. This file is ${formatFileSize(file.size)}.`)
      return
    }
    setError(null)
    setSelectedFile(file)
    setMode('file-selected')
  }

  // Camera capture — each call adds one scanned page
  const handleCameraCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be captured again if needed
    if (cameraRef.current) cameraRef.current.value = ''

    setScanError(null)
    let processed = file
    try {
      processed = await compressImage(file)
    } catch {
      // Fall back to original if compression fails
    }

    const preview = URL.createObjectURL(processed)
    setScannedPages((prev) => [...prev, processed])
    setScanPreviews((prev) => [...prev, preview])
    setMode('scanning')
  }, [])

  function removeScannedPage(idx: number) {
    URL.revokeObjectURL(scanPreviews[idx])
    setScannedPages((prev) => prev.filter((_, i) => i !== idx))
    setScanPreviews((prev) => prev.filter((_, i) => i !== idx))
    if (scannedPages.length <= 1) setMode('idle')
  }

  async function handleUpload(fileToUpload?: File) {
    const file = fileToUpload ?? selectedFile
    if (!file) return

    setProgress(0)
    setError(null)
    setScanError(null)

    const filePath = buildFilePath(userId, category, file.name)

    const interval = setInterval(() => {
      setProgress((p) => Math.min((p ?? 0) + 15, 85))
    }, 200)

    const result = await uploadFile(filePath, file)
    clearInterval(interval)

    if (!result) {
      setProgress(null)
      setError('Upload failed. Please try again.')
      return
    }

    setProgress(100)

    const { error: dbError } = await supabase.from('vault_documents').insert({
      vault_id: vaultId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      category,
      description: description || null,
      expiry_date: expiryDate || null,
    })

    if (!dbError) {
      await logActivity(supabase, vaultId, 'document_uploaded', `Uploaded document: ${file.name}`, {
        file_name: file.name,
        category,
      })
    }

    setTimeout(() => {
      reset()
      onUploaded()
    }, 600)
  }

  async function handleScanUpload() {
    if (scannedPages.length === 0) return
    setScanError(null)
    setProgress(0)

    let finalFile: File

    if (scannedPages.length === 1) {
      finalFile = scannedPages[0]
    } else {
      // Check Canvas API is available (it always is in modern browsers but guard anyway)
      if (typeof document === 'undefined' || !document.createElement('canvas').getContext) {
        // Fallback: upload each page as a separate document
        setScanError('Could not combine pages. Uploading each page separately.')
        for (const page of scannedPages) {
          await handleUpload(page)
        }
        return
      }
      try {
        finalFile = await buildPdfFromImages(scannedPages)
        // Guard against assembled PDFs that exceed the 50MB Supabase storage limit
        const MAX_PDF_BYTES = 50 * 1024 * 1024
        if (finalFile.size > MAX_PDF_BYTES) {
          setScanError('The combined PDF is too large (max 50 MB). Try removing some pages or re-scanning at lower quality.')
          return
        }
      } catch (err) {
        console.error('[scanner] PDF build failed, uploading individually:', err)
        setScanError('Could not combine pages into one PDF. Uploading each page separately.')
        for (const page of scannedPages) {
          await handleUpload(page)
        }
        return
      }
    }

    await handleUpload(finalFile)
  }

  const totalScanSize = scannedPages.reduce((sum, f) => sum + f.size, 0)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>

      {/* ── Drop zone / entry point ── */}
      {mode === 'idle' && (
        <>
          <div
            className={`border-2 border-dashed rounded-lg px-6 py-10 text-center cursor-pointer transition-colors ${
              dragging ? 'border-[#1a1a1a] bg-[#fafaf9]' : 'border-[#e5e7eb] hover:border-[#1a1a1a]'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files[0]
              if (file) handleFileSelect(file)
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
            />
            <p className="text-sm text-[#1a1a1a] mb-1">
              {isMobile ? 'Tap to browse files' : 'Drag and drop a file, or click to browse'}
            </p>
            <p className="text-xs text-[#6b7280]">PDF, JPG, PNG, WEBP · Max 10MB</p>
          </div>

          {/* Scan button — mobile only */}
          {isMobile && (
            <>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCameraCapture}
              />
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="mt-3 w-full border border-[#e5e7eb] rounded-lg py-3 text-sm text-[#6b7280] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 5.5h1.5l1-1.5h5l1 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H2a1 1 0 01-1-1V6.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <circle cx="8" cy="8.75" r="2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                Scan document with camera
              </button>
            </>
          )}
        </>
      )}

      {/* ── Regular file selected ── */}
      {mode === 'file-selected' && selectedFile && (
        <div className="mt-0">
          <div className="border border-[#e5e7eb] rounded-lg px-5 py-4 mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-[#1a1a1a] truncate">{selectedFile.name}</p>
              <p className="text-xs text-[#6b7280] mt-0.5">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={reset}
              className="text-sm text-[#6b7280] underline underline-offset-2 hover:text-[#1a1a1a] flex-shrink-0"
            >
              Remove
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
            />

            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5">
                Document expiry date{' '}
                <span className="text-[#9ca3af] font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors text-[#6b7280]"
              />
            </div>

            {progress !== null && (
              <div className="w-full bg-[#e5e7eb] rounded-full h-1.5">
                <div
                  className="bg-[#1a1a1a] h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleUpload()}
                disabled={progress !== null}
                className="bg-[#1a1a1a] text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {progress !== null ? `Uploading… ${progress}%` : 'Upload'}
              </button>
              <button
                onClick={reset}
                className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scanner: pages accumulated ── */}
      {mode === 'scanning' && (
        <div>
          <p className="text-sm font-medium text-[#1a1a1a] mb-3">
            {scannedPages.length === 1
              ? 'Page 1 scanned'
              : `${scannedPages.length} pages scanned`}
          </p>

          {/* Thumbnails */}
          <div className="flex flex-wrap gap-3 mb-4">
            {scanPreviews.map((src, idx) => (
              <div key={idx} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Page ${idx + 1}`}
                  className="w-20 h-24 object-cover rounded-md border border-[#e5e7eb]"
                />
                <span className="absolute top-1 left-1 text-[10px] bg-white/80 rounded px-1 text-[#6b7280]">
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeScannedPage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-[#e5e7eb] rounded-full flex items-center justify-center text-[#6b7280] hover:text-red-600 transition-colors"
                  aria-label={`Remove page ${idx + 1}`}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#9ca3af] mb-4">
            Estimated size: {formatFileSize(totalScanSize)}
            {scannedPages.length > 1 && ' (will be combined into one PDF)'}
          </p>

          {scanError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mb-3">
              {scanError}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-col gap-3 mb-4">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
            />
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5">
                Document expiry date{' '}
                <span className="text-[#9ca3af] font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors text-[#6b7280]"
              />
            </div>
          </div>

          {progress !== null && (
            <div className="w-full bg-[#e5e7eb] rounded-full h-1.5 mb-4">
              <div
                className="bg-[#1a1a1a] h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            {/* Add another page */}
            <div className="flex gap-2.5">
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCameraCapture}
              />
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={progress !== null}
                className="flex-1 border border-[#e5e7eb] text-[#1a1a1a] rounded-md px-4 py-3 text-sm font-medium hover:border-[#1a1a1a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add another page
              </button>
            </div>

            {/* Upload / Cancel */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleScanUpload}
                disabled={progress !== null || scannedPages.length === 0}
                className="flex-1 bg-[#1a1a1a] text-white rounded-md px-4 py-3 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {progress !== null
                  ? `Uploading… ${progress}%`
                  : scannedPages.length > 1
                    ? `Upload ${scannedPages.length} pages as PDF`
                    : 'Upload scanned page'}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={progress !== null}
                className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-3 text-sm font-medium hover:bg-[#fafaf9] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-3">{error}</p>
      )}
    </div>
  )
}
