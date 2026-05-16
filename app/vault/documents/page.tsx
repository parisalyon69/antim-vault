'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import DocumentUploader from '@/components/vault/DocumentUploader'
import { getSignedUrl, formatFileSize } from '@/lib/vault/storage'
import type { DocumentCategory, VaultDocument } from '@/lib/types'
import { DOCUMENT_CATEGORY_LABELS } from '@/lib/types'
import { logActivity } from '@/lib/activity'

const CATEGORIES: DocumentCategory[] = ['will', 'insurance', 'property', 'bank', 'investments', 'identity', 'other']

export default function DocumentsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [vaultId, setVaultId] = useState<string | null>(null)
  const [docs, setDocs] = useState<VaultDocument[]>([])
  const [activeTab, setActiveTab] = useState<DocumentCategory>('will')
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: vault } = await supabase.from('vaults').select('id').eq('user_id', user.id).single()
    if (!vault) return
    setVaultId(vault.id)
    const { data } = await supabase.from('vault_documents').select('*').eq('vault_id', vault.id).order('uploaded_at', { ascending: false })
    setDocs((data as VaultDocument[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleDelete(doc: VaultDocument) {
    const { createClient: createStorageClient } = await import('@/lib/supabase/client')
    const s = createStorageClient()
    await s.storage.from('vault-documents').remove([doc.file_path])
    await supabase.from('vault_documents').delete().eq('id', doc.id)
    await logActivity(supabase, vaultId!, 'document_deleted', {
      file_name: doc.file_name,
      category: doc.category,
    })
    setDeleteConfirm(null)
    await load()
  }

  async function handlePreview(filePath: string) {
    const url = await getSignedUrl(filePath)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const filtered = docs.filter((d) => d.category === activeTab)

  if (loading) return <p className="text-sm text-[#6b7280]">Loading…</p>

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
        Documents
      </h1>
      <p className="text-sm text-[#6b7280] mb-6">
        Upload your will, insurance policies, property papers, and anything else your family will need.
      </p>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-[#e5e7eb] pb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              activeTab === cat
                ? 'bg-[#1a1a1a] text-white'
                : 'text-[#6b7280] hover:text-[#1a1a1a]'
            }`}
          >
            {DOCUMENT_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {vaultId && userId && (
        <div className="mb-8">
          <DocumentUploader
            vaultId={vaultId}
            userId={userId}
            category={activeTab}
            onUploaded={load}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-[#6b7280] py-4">
          No {DOCUMENT_CATEGORY_LABELS[activeTab].toLowerCase()} documents uploaded yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((doc) => (
            <div key={doc.id}>
              <div className="border border-[#e5e7eb] rounded-lg px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{doc.file_name}</p>
                  {doc.description && <p className="text-sm text-[#6b7280] mt-0.5">{doc.description}</p>}
                  <p className="text-xs text-[#6b7280] mt-1">
                    {doc.file_size ? formatFileSize(doc.file_size) : ''}{' '}
                    · {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => handlePreview(doc.file_path)}
                    className="text-sm text-[#1a1a1a] underline underline-offset-2"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(doc.id)}
                    className="text-sm text-red-600 underline underline-offset-2"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {deleteConfirm === doc.id && (
                <div className="border border-red-100 bg-red-50 rounded-lg px-5 py-4 mt-1">
                  <p className="text-sm text-[#1a1a1a] mb-3">
                    Delete &ldquo;{doc.file_name}&rdquo;? This cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => handleDelete(doc)} className="text-sm bg-red-600 text-white rounded-md px-4 py-2 hover:bg-red-700">
                      Delete
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-sm border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-2 hover:bg-[#fafaf9]">
                      Keep
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
