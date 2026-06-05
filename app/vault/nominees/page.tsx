'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import NomineeForm from '@/components/vault/NomineeForm'
import type { VaultNominee } from '@/lib/types'
import { logActivity } from '@/lib/activity'

function NomineesLoadingSkeleton() {
  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <div className="h-8 w-32 bg-[#e5e7eb] rounded animate-pulse mb-2" />
      <div className="h-4 w-80 bg-[#e5e7eb] rounded animate-pulse mb-8" />
      <div className="border border-[#e5e7eb] rounded-lg px-5 py-4 mb-4">
        <div className="h-4 w-40 bg-[#e5e7eb] rounded animate-pulse mb-2" />
        <div className="h-3 w-24 bg-[#e5e7eb] rounded animate-pulse mb-1" />
        <div className="h-3 w-56 bg-[#e5e7eb] rounded animate-pulse" />
      </div>
      <div className="h-10 w-36 bg-[#e5e7eb] rounded-md animate-pulse" />
    </div>
  )
}

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
  const [notifyError, setNotifyError] = useState<string | null>(null)
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null)

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

  async function handleSave(data: Partial<VaultNominee>, sendNotify: boolean) {
    if (!vaultId) return

    // Enforce primary uniqueness
    if (data.is_primary) {
      await supabase.from('vault_nominees').update({ is_primary: false }).eq('vault_id', vaultId)
    }

    if (editing) {
      await supabase.from('vault_nominees').update(data).eq('id', editing.id)
      await logActivity(supabase, vaultId, 'nominee_updated', `Updated nominee: ${data.full_name}`, { nominee_name: data.full_name })
      setSavedName(editing.full_name)
      setEditing(null)
    } else {
      const { data: inserted } = await supabase
        .from('vault_nominees')
        .insert({ ...data, vault_id: vaultId, notified: false })
        .select()
        .single()

      if (inserted) {
        await logActivity(supabase, vaultId, 'nominee_added', `Added nominee: ${data.full_name}`, {
          nominee_name: data.full_name,
          nominee_email: data.email,
        })
      }

      // For new nominees, if the user opted to send notification
      if (!editing && inserted && sendNotify && data.email) {
        const res = await fetch(`/api/vault/nominees/${inserted.id}/notify`, { method: 'POST' })
        const json = await res.json().catch(() => ({}))
        if (json.emailFailed) {
          setNotifyError("We could not send the notification. You can retry from the nominee list.")
        } else if (json.ok) {
          setNotifySuccess(`Notification sent to ${data.email}.`)
        }
      }

      setSavedName(data.full_name ?? null)
      setAdding(false)
    }

    await load()
  }

  async function handleResendNotification(nomineeId: string, nomineeEmail: string) {
    setNotifyError(null)
    setNotifySuccess(null)
    const res = await fetch(`/api/vault/nominees/${nomineeId}/notify`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (json.emailFailed) {
      setNotifyError("We could not send the notification. Please try again.")
    } else if (json.ok) {
      setNotifySuccess(`Notification resent to ${nomineeEmail}.`)
      await load()
    }
  }

  async function handleDelete(id: string) {
    const nominee = nominees.find((n) => n.id === id)
    await supabase.from('vault_nominees').delete().eq('id', id)
    await logActivity(supabase, vaultId!, 'nominee_deleted', `Removed nominee: ${nominee?.full_name ?? 'Unknown'}`, { nominee_name: nominee?.full_name })
    setDeleteConfirm(null)
    setSavedName(null)
    await load()
  }

  const primaryExists = nominees.some((n) => n.is_primary)

  if (loading) return <NomineesLoadingSkeleton />

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
        Nominees
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        The people who will be able to access your vault. Maximum 2 nominees.
      </p>

      {notifyError && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 mb-4 flex items-start justify-between gap-3">
          <p className="text-sm text-amber-800">{notifyError}</p>
          <button onClick={() => setNotifyError(null)} className="text-amber-600 hover:text-amber-800 flex-shrink-0 text-xs">Dismiss</button>
        </div>
      )}
      {notifySuccess && (
        <div className="border border-green-200 bg-green-50 rounded-lg px-4 py-3 mb-4 flex items-start justify-between gap-3">
          <p className="text-sm text-green-800">{notifySuccess}</p>
          <button onClick={() => setNotifySuccess(null)} className="text-green-700 hover:text-green-800 flex-shrink-0 text-xs">Dismiss</button>
        </div>
      )}

      {/* Existing nominees */}
      {nominees.map((nominee) => (
        <div key={nominee.id} className="mb-4">
          {editing?.id === nominee.id ? (
            <div className="border border-[#e5e7eb] rounded-lg p-6">
              <NomineeForm
                initial={nominee}
                isPrimaryLocked={primaryExists && !nominee.is_primary}
                showNotifyToggle={false}
                onSave={async (d, sn) => { await handleSave(d, sn) }}
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
                {nominee.notified && (
                  <p className="text-xs text-[#6b7280] mt-1">
                    Notified
                    {nominee.notified_at
                      ? ` on ${new Date(nominee.notified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : ''}
                  </p>
                )}
              </div>
              <div className="flex gap-3 flex-shrink-0">
                {nominee.notified && nominee.email && (
                  <button
                    onClick={() => handleResendNotification(nominee.id, nominee.email ?? '')}
                    className="text-xs text-[#6b7280] underline underline-offset-2 hover:text-[#1a1a1a]"
                  >
                    Resend notification
                  </button>
                )}
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

      {/* Empty state */}
      {nominees.length === 0 && !adding && (
        <div className="border border-dashed border-[#e5e7eb] rounded-lg px-6 py-10 mb-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3" stroke="#9ca3af" strokeWidth="1.5" />
              <path d="M4 16c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#1a1a1a] mb-1">No nominees added yet</p>
          <p className="text-sm text-[#6b7280] mb-4 max-w-xs mx-auto">
            Without a nominee, no one will know to request access to your vault.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="bg-[#4F6F52] text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#3d5940] transition-colors"
          >
            Add a nominee
          </button>
        </div>
      )}

      {/* Add nominee */}
      {nominees.length > 0 && nominees.length < 2 && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors mb-8"
        >
          Add a second nominee
        </button>
      )}

      {adding && (
        <div className="border border-[#e5e7eb] rounded-lg p-6 mb-8">
          <NomineeForm
            isPrimaryLocked={primaryExists}
            showNotifyToggle={true}
            onSave={async (d, sn) => { await handleSave(d, sn) }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* Post-save confirmation */}
      {savedName && (
        <div className="border border-[#e5e7eb] rounded-lg p-5 bg-[#FAFAF9] mt-4">
          <p className="text-sm text-[#1a1a1a] font-medium mb-1">Saved. Your family is a little more protected.</p>
          <p className="text-sm text-[#6b7280]">
            When the time comes, <strong>{savedName}</strong> can request access at{' '}
            <a href="https://vault.antim.services/emergency-access" className="underline underline-offset-2">vault.antim.services/emergency-access</a>
            {' '}with a death certificate. The Antim team will verify and respond within 2 business days.
          </p>
        </div>
      )}
    </div>
  )
}
