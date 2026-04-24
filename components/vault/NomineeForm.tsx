'use client'

import { useState } from 'react'
import type { VaultNominee } from '@/lib/types'

interface Props {
  initial?: Partial<VaultNominee>
  onSave: (data: Partial<VaultNominee>) => Promise<void>
  onCancel: () => void
  isPrimaryLocked?: boolean
}

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Friend', 'Other']

export default function NomineeForm({ initial, onSave, onCancel, isPrimaryLocked }: Props) {
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [relationship, setRelationship] = useState(initial?.relationship ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [isPrimary, setIsPrimary] = useState(initial?.is_primary ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setError('Full name, phone, and email are required.')
      return
    }
    setSaving(true)
    try {
      await onSave({ full_name: fullName, relationship, phone, email, is_primary: isPrimary })
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <div>
        <label className="block text-sm text-[#1a1a1a] mb-1.5">Full name <span className="text-red-500">*</span></label>
        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
      </div>
      <div>
        <label className="block text-sm text-[#1a1a1a] mb-1.5">Relationship</label>
        <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors bg-white">
          <option value="">Select…</option>
          {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-[#1a1a1a] mb-1.5">Phone with country code <span className="text-red-500">*</span></label>
        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
      </div>
      <div>
        <label className="block text-sm text-[#1a1a1a] mb-1.5">Email address <span className="text-red-500">*</span></label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors" />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} disabled={isPrimaryLocked} className="h-4 w-4 rounded border-[#e5e7eb] accent-[#1a1a1a]" />
        <span className="text-sm text-[#6b7280]">Mark as primary nominee</span>
      </label>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">{error}</p>}

      <div className="flex gap-3 mt-2">
        <button type="submit" disabled={saving} className="bg-[#1a1a1a] text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save. Your family is a little more protected.'}
        </button>
        <button type="button" onClick={onCancel} className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
