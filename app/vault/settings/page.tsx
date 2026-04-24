'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Vault } from '@/lib/types'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [vault, setVault] = useState<Vault | null>(null)
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      setNewEmail(user.email ?? '')
      const { data } = await supabase.from('vaults').select('*').eq('user_id', user.id).single()
      setVault(data as Vault)
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setSaving(false)
    setMsg(error ? { text: error.message, type: 'err' } : { text: 'Check your new email for a confirmation link.', type: 'ok' })
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) { setMsg({ text: 'Password must be at least 8 characters.', type: 'err' }); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    setMsg(error ? { text: error.message, type: 'err' } : { text: 'Password updated.', type: 'ok' })
    setNewPassword('')
  }

  async function handleManageSubscription() {
    const res = await fetch('/api/vault/customer-portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  async function handleExport() {
    const res = await fetch('/api/vault/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `antim-vault-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteVault() {
    if (deleteInput !== 'DELETE') return
    const res = await fetch('/api/vault/delete', { method: 'DELETE' })
    if (res.ok) {
      window.location.href = 'https://antim.services?deleted=true'
    } else {
      setMsg({ text: 'Something went wrong. Please contact hello@antim.services.', type: 'err' })
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <p className="text-sm text-[#6b7280]">Loading…</p>

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-8" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
        Settings
      </h1>

      {msg && (
        <div className={`mb-6 text-sm rounded-lg px-4 py-3 border ${msg.type === 'ok' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Subscription */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280] mb-4" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Subscription
        </h2>
        <div className="border border-[#e5e7eb] rounded-lg p-6 flex flex-col gap-4">
          <div>
            <p className="text-sm text-[#1a1a1a]">
              Status:{' '}
              <span className={`font-medium ${vault?.subscription_status === 'active' ? 'text-green-700' : 'text-amber-700'}`}>
                {vault?.subscription_status ?? '—'}
              </span>
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleManageSubscription}
              className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors"
            >
              Manage subscription
            </button>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280] mb-4" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Account
        </h2>
        <div className="border border-[#e5e7eb] rounded-lg p-6 flex flex-col gap-6">
          <form onSubmit={handleEmailUpdate} className="flex flex-col gap-3">
            <label className="text-sm text-[#1a1a1a] font-medium">Update email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
            />
            <div>
              <button
                type="submit"
                disabled={saving || newEmail === email}
                className="bg-[#1a1a1a] text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                Update email
              </button>
            </div>
          </form>

          <hr className="border-[#e5e7eb]" />

          <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-3">
            <label className="text-sm text-[#1a1a1a] font-medium">Update password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
            />
            <div>
              <button
                type="submit"
                disabled={saving || newPassword.length === 0}
                className="bg-[#1a1a1a] text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                Update password
              </button>
            </div>
          </form>

          <hr className="border-[#e5e7eb]" />

          <div>
            <button
              onClick={handleSignOut}
              className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280] mb-4" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Your data
        </h2>
        <div className="border border-[#e5e7eb] rounded-lg p-6 flex flex-col gap-6">
          <div>
            <p className="text-sm text-[#1a1a1a] mb-1 font-medium">Export your data</p>
            <p className="text-sm text-[#6b7280] mb-3">
              Download all your assets, nominees, and document links (valid for 24 hours) as a JSON file.
            </p>
            <button
              onClick={handleExport}
              className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors"
            >
              Export my data
            </button>
          </div>

          <hr className="border-[#e5e7eb]" />

          <div>
            <p className="text-sm text-[#1a1a1a] mb-1 font-medium">Delete my vault and all data</p>
            <p className="text-sm text-[#6b7280] mb-3">
              This will permanently delete all your documents, assets, and your personal letter. This cannot be undone.
            </p>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="border border-red-300 text-red-700 rounded-md px-4 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Delete my vault
              </button>
            ) : (
              <div className="border border-red-200 bg-red-50 rounded-lg p-5">
                <p className="text-sm text-[#1a1a1a] mb-3">
                  Type <strong>DELETE</strong> to confirm. All your data will be permanently removed.
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full border border-red-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-red-400 bg-white mb-3 transition-colors"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteVault}
                    disabled={deleteInput !== 'DELETE'}
                    className="bg-red-600 text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Permanently delete everything
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteInput('') }}
                    className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-4 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
