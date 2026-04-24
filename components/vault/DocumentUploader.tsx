'use client'

import { useState, useRef } from 'react'
import { buildFilePath, uploadFile, formatFileSize } from '@/lib/vault/storage'
import { createClient } from '@/lib/supabase/client'
import type { DocumentCategory } from '@/lib/types'

interface Props {
  vaultId: string
  userId: string
  category: DocumentCategory
  onUploaded: () => void
}

const ACCEPTED = 'application/pdf,image/jpeg,image/png,image/webp'
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

export default function DocumentUploader({ vaultId, userId, category, onUploaded }: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileSelect(file: File) {
    if (file.size > MAX_BYTES) {
      setError(`File too large. Maximum size is 10MB. This file is ${formatFileSize(file.size)}.`)
      return
    }
    setError(null)
    setSelectedFile(file)
  }

  async function handleUpload() {
    if (!selectedFile) return
    setProgress(0)
    setError(null)

    const filePath = buildFilePath(userId, category, selectedFile.name)

    // Simulate progress (Supabase storage doesn't give progress events in JS)
    const interval = setInterval(() => {
      setProgress((p) => Math.min((p ?? 0) + 15, 85))
    }, 200)

    const result = await uploadFile(filePath, selectedFile)
    clearInterval(interval)

    if (!result) {
      setProgress(null)
      setError('Upload failed. Please try again.')
      return
    }

    setProgress(100)

    const { error: dbError } = await supabase.from('vault_documents').insert({
      vault_id: vaultId,
      file_name: selectedFile.name,
      file_path: filePath,
      file_size: selectedFile.size,
      mime_type: selectedFile.type,
      category,
      description: description || null,
    })

    if (!dbError) {
      await supabase.from('vault_activity_log').insert({
        vault_id: vaultId,
        action: 'document_uploaded',
        details: { file_name: selectedFile.name, category },
      })
    }

    setTimeout(() => {
      setProgress(null)
      setSelectedFile(null)
      setDescription('')
      onUploaded()
    }, 600)
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
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
        {selectedFile ? (
          <p className="text-sm text-[#1a1a1a]">
            {selectedFile.name} <span className="text-[#6b7280]">({formatFileSize(selectedFile.size)})</span>
          </p>
        ) : (
          <>
            <p className="text-sm text-[#1a1a1a] mb-1">Drag and drop a file, or click to browse</p>
            <p className="text-xs text-[#6b7280]">PDF, JPG, PNG, WEBP · Max 10MB</p>
          </>
        )}
      </div>

      {selectedFile && (
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
          />

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
              onClick={handleUpload}
              disabled={progress !== null}
              className="bg-[#1a1a1a] text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {progress !== null ? `Uploading… ${progress}%` : 'Upload'}
            </button>
            <button
              onClick={() => { setSelectedFile(null); setDescription('') }}
              className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-3">{error}</p>
      )}
    </div>
  )
}
