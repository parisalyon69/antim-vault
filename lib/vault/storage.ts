import { createClient } from '@/lib/supabase/client'

const BUCKET = 'vault-documents'

export async function getSignedUrl(filePath: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600) // 1 hour
  return data?.signedUrl ?? ''
}

export async function getLongSignedUrl(filePath: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 86400) // 24 hours for export
  return data?.signedUrl ?? ''
}

export async function uploadFile(
  filePath: string,
  file: File
): Promise<{ path: string } | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false })
  if (error) return null
  return data
}

export async function deleteFile(filePath: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([filePath])
  return !error
}

export function buildFilePath(
  userId: string,
  category: string,
  fileName: string
): string {
  const timestamp = Date.now()
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${userId}/${category}/${timestamp}_${safe}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
