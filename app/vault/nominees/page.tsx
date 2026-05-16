'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import NomineeForm from '@/components/vault/NomineeForm'
import type { VaultNominee } from '@/lib/types'
import { logActivity } from '@/lib/activity'

export default function NomineesPage() {
  const supabase = createClient()
  const [vaultId, setVaultId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [nominees, setNominees] = useState<VaultNominee[]>([])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<VaultNominee | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserName((user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? '')
    const { data: vault } = await supabase.from('vaults').select('id').eq('user_id', user.id).single()
    if (!vault) return
    setVaultId(vault.id)
    const { data } = await supabase.from('vault_nominees').select('*').eq('vault_id', vault.id).order('created_at')
    setNominees((data as VaultNominee[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleSave(data: Partial<VaultNominee>) {
    if (!vaultId) return

    // Enforce primary uniqueness
    if (data.is_primary) {
      await supabase.from('vault_nominees').update({ is_primary: false }).eq('vault_id', vaultId)
    }

    if (editing) {
      await supabase.from('vault_nominees').update(data).eq('id', editing.id)
      await logActivity(supabase, vaultId, 'nominee_updated', { nominee_name: data.full_name })
      setSavedName(editing.full_name)
      setEditing(null)
    } else {
      const { data: inserted } = await supabase
        .from('vault_nominees')
        .insert({ ...data, vault_id: vaultId, notified: false })
        .select()
        .single()

      if (inserted) {
        await logActivity(supabase, vaultId, 'nominee_added', {
          nominee_name: data.full_name,
          nominee_email: data.email,
          notification_message: `${userName} has added you as a nominee on their Antim Digital Vault. When the time comes, you will be able to access important documents and information they have stored. You do not need to do anything now. — The Antim team`,
        })
      }

      setSavedName(data.full_name ?? null)
      setAdding(false)
    }

    await load()
  }

  async function handleDelete(id: string) {
    const nominee = nominees.find((n) => n.id === id)
    await supabase.from('vault_nominees').delete().eq('id', id)
    await logActivity(supabase, vaultId!, 'nominee_deleted', { nominee_name: nominee?.full_name })
    setDeleteConfirm(null)
    setSavedName(null)
    await load()
  }

  const primaryExists = nominees.some((n) => n.is_primary)

  if (loading) return <p className="text-sm text-[#6b7280]">Loading…</p>

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
        Nominees
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        The people who will be able to access your vault. Maximum 2 nominees.
      </p>

      {/* Existing nominees */}
      {nominees.map((nominee) => (
        <div key={nominee.id} className="mb-4">
          {editing?.id === nominee.id ? (
            <div className="border border-[#e5e7eb] rounded-lg p-6">
              <NomineeForm
                initial={nominee}
                isPrimaryLocked={primaryExists && !nominee.is_primary}
                onSave={async (d) => { await handleSave(d) }}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <div className="border border-[#e5e7eb] rounded-lg px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">
                  {nominee.full_name}
                  {nominee.is_primary && (
                    <span className="ml-2 text-xs text-[#6b7280] border border-[#e5e7eb] rounded px-1.5 py-0.5">Primary</span>
                  )}
                </p>
                <p className="text-sm text-[#6b7280] mt-0.5">{nominee.relationship}</p>
                <p className="text-sm text-[#6b7280]">{nominee.phone} · {nominee.email}</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => setEditing(nominee)} className="text-sm text-[#1a1a1a] underline underline-offset-2">Edit</button>
                <button onClick={() => setDeleteConfirm(nominee.id)} className="text-sm text-red-600 underline underline-offset-2">Remove</button>
              </div>
            </div>
          )}

          {deleteConfirm === nominee.id && (
            <div className="border border-red-100 bg-red-50 rounded-lg px-5 py-4 mt-1">
              <p className="text-sm text-[#1a1a1a] mb-3">Remove {nominee.full_name} as a nominee?</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(nominee.id)} className="text-sm bg-red-600 text-white rounded-md px-4 py-2 hover:bg-red-700">Remove</button>
                <button onClick={() => setDeleteConfirm(null)} className="text-sm border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-2 hover:bg-[#fafaf9]">Keep</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add nominee */}
      {nominees.length < 2 && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors mb-8"
        >
          Add a nominee
        </button>
      )}

      {adding && (
        <div className="border border-[#e5e7eb] rounded-lg p-6 mb-8">
          <NomineeForm
            isPrimaryLocked={primaryExists}
            onSave={async (d) => { await handleSave(d) }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* Post-save confirmation */}
      {savedName && (
        <div className="border border-[#e5e7eb] rounded-lg p-5 bg-[#FAFAF9] mt-4">
          <p className="text-sm text-[#1a1a1a] font-medium mb-1">Saved. Your family is a little more protected.</p>
          <p className="text-sm text-[#6b7280]">
            When the time comes, <strong>{savedName}</strong> should contact us at{' '}
            <a href="mailto:hello@antim.services" className="underline underline-offset-2">hello@antim.services</a>
            {' '}or WhatsApp{' '}
            <a href="https://wa.me/33745722899" className="underline underline-offset-2">+33 7 45 72 28 99</a>
            {' '}with the death certificate. We will verify and provide access within 48 hours.
          </p>
        </div>
      )}
    </div>
  )
}
