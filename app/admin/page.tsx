'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { VaultReleaseRequest } from '@/lib/types'

type RequestWithCertUrl = VaultReleaseRequest & { cert_url?: string }

type ActionState = { id: string; type: 'approve' | 'reject' } | null

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [requests, setRequests] = useState<RequestWithCertUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [actionState, setActionState] = useState<ActionState>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [working, setWorking] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'hello@antim.services') {
      router.replace('/')
      return
    }

    const { data } = await supabase
      .from('vault_release_requests')
      .select('*')
      .order('requested_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Generate signed URLs for death certificates (1hr)
    const withUrls = await Promise.all(
      data.map(async (r) => {
        if (!r.death_certificate_path) return r as RequestWithCertUrl
        const { data: signed } = await supabase.storage
          .from('release-documents')
          .createSignedUrl(r.death_certificate_path, 3600)
        return { ...r, cert_url: signed?.signedUrl } as RequestWithCertUrl
      })
    )

    setRequests(withUrls)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function handleApprove(req: RequestWithCertUrl) {
    if (!req.vault_id) {
      setMsg({ text: 'Cannot approve — no matching vault found for this email.', type: 'err' })
      return
    }
    setWorking(true)
    setMsg(null)

    // Generate a release token (72hr expiry)
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    const { error: tokenError } = await supabase.from('vault_release_tokens').insert({
      vault_id: req.vault_id,
      token,
      expires_at: expiresAt,
      used: false,
    })

    if (tokenError) {
      setMsg({ text: 'Failed to generate release token.', type: 'err' })
      setWorking(false)
      return
    }

    // Update request status
    await supabase
      .from('vault_release_requests')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', req.id)

    // Send email to nominee (best-effort via API)
    try {
      await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'approved',
          to: req.requested_by_email,
          name: req.requested_by_name,
          token,
        }),
      })
    } catch { /* non-fatal */ }

    setMsg({ text: `Approved. Email sent to ${req.requested_by_email} with vault access link.`, type: 'ok' })
    setActionState(null)
    setWorking(false)
    load()
  }

  async function handleReject(req: RequestWithCertUrl) {
    if (!rejectReason.trim()) {
      setMsg({ text: 'Please enter a reason for rejection.', type: 'err' })
      return
    }
    setWorking(true)
    setMsg(null)

    await supabase
      .from('vault_release_requests')
      .update({
        status: 'rejected',
        admin_notes: rejectReason.trim(),
        resolved_at: new Date().toISOString(),
      })
      .eq('id', req.id)

    // Notify nominee
    try {
      await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rejected',
          to: req.requested_by_email,
          name: req.requested_by_name,
          reason: rejectReason.trim(),
        }),
      })
    } catch { /* non-fatal */ }

    setMsg({ text: `Rejected. ${req.requested_by_email} has been notified.`, type: 'ok' })
    setActionState(null)
    setRejectReason('')
    setWorking(false)
    load()
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    }
    return `inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${map[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#6b7280]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <nav className="bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Antim Admin
        </span>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
        >
          Sign out
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Release Requests
        </h1>
        <p className="text-sm text-[#6b7280] mb-8">
          {requests.filter((r) => r.status === 'pending').length} pending · {requests.length} total
        </p>

        {msg && (
          <div className={`mb-6 text-sm rounded-lg px-4 py-3 border ${msg.type === 'ok' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-20 text-sm text-[#6b7280]">No release requests yet.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white border border-[#e5e7eb] rounded-lg p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#1a1a1a] text-sm">{req.requested_by_name}</span>
                      <span className="text-[#6b7280] text-xs">({req.relationship})</span>
                      <span className={statusBadge(req.status)}>{req.status}</span>
                    </div>
                    <p className="text-xs text-[#6b7280]">
                      {req.requested_by_email} · {req.requested_by_phone}
                    </p>
                  </div>
                  <span className="text-xs text-[#6b7280]">
                    {new Date(req.requested_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-[#6b7280] mb-0.5">Deceased</p>
                    <p className="text-[#1a1a1a]">{req.deceased_email}</p>
                    <p className="text-xs text-[#6b7280] mt-1">
                      Vault: {req.vault_id ? (
                        <span className="text-green-700 font-medium">Found</span>
                      ) : (
                        <span className="text-amber-700 font-medium">Not registered</span>
                      )}
                    </p>
                  </div>
                  {req.admin_notes && (
                    <div>
                      <p className="text-xs text-[#6b7280] mb-0.5">Note / Reject reason</p>
                      <p className="text-[#1a1a1a] text-sm">{req.admin_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {req.cert_url && (
                    <a
                      href={req.cert_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#1a1a1a] underline underline-offset-2"
                    >
                      View death certificate
                    </a>
                  )}

                  {req.status === 'pending' && (
                    <>
                      {actionState?.id === req.id && actionState.type === 'reject' ? (
                        <div className="flex-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection"
                            className="flex-1 border border-[#e5e7eb] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1a1a1a]"
                          />
                          <button
                            onClick={() => handleReject(req)}
                            disabled={working}
                            className="bg-red-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {working ? 'Rejecting…' : 'Confirm reject'}
                          </button>
                          <button
                            onClick={() => { setActionState(null); setRejectReason('') }}
                            className="border border-[#e5e7eb] text-[#1a1a1a] rounded-md px-4 py-2 text-sm hover:bg-[#fafaf9] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : actionState?.id === req.id && actionState.type === 'approve' ? (
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-[#6b7280]">
                            {req.vault_id
                              ? `Send ${req.requested_by_name} a 72-hour access link?`
                              : 'No vault found. Cannot approve.'}
                          </p>
                          {req.vault_id && (
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={working}
                              className="bg-[#1a1a1a] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                            >
                              {working ? 'Approving…' : 'Confirm approve'}
                            </button>
                          )}
                          <button
                            onClick={() => setActionState(null)}
                            className="border border-[#e5e7eb] text-[#1a1a1a] rounded-md px-4 py-2 text-sm hover:bg-[#fafaf9] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setActionState({ id: req.id, type: 'approve' })}
                            className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-2 text-sm font-medium hover:bg-[#fafaf9] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setActionState({ id: req.id, type: 'reject' })}
                            className="border border-red-300 text-red-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
