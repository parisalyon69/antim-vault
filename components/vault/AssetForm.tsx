'use client'

import { useState } from 'react'
import type { AssetCategory } from '@/lib/types'

const BANK_NAMES = ['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'PNB', 'Bank of Baroda', 'Canara', 'Other']
const INSURANCE_COMPANIES = ['LIC', 'HDFC Life', 'ICICI Prudential', 'SBI Life', 'Max Life', 'Bajaj Allianz', 'Other']
const BROKERS = ['Zerodha', 'Groww', 'CAMS', 'KFintech', 'Scripbox', 'Other']
const SCHEMES = ['PPF', 'EPF', 'NSC', 'KVP', 'Post Office Savings', 'Other']
const PLATFORMS = ['Email', 'Facebook', 'Instagram', 'LinkedIn', 'Subscription service', 'Other']

interface AssetFormData {
  category: AssetCategory
  institution_name?: string
  account_number?: string
  nominee_name?: string
  agent_contact?: string
  notes?: string
  description?: string
}

interface Props {
  category: AssetCategory
  initial?: AssetFormData
  onSave: (data: AssetFormData) => Promise<void>
  onCancel: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-[#1a1a1a] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
    />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors bg-white"
    >
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors resize-none"
    />
  )
}

export default function AssetForm({ category, initial, onSave, onCancel }: Props) {
  const [fields, setFields] = useState<Record<string, string>>({
    institution_name: initial?.institution_name ?? '',
    account_number: initial?.account_number ?? '',
    nominee_name: initial?.nominee_name ?? '',
    agent_contact: initial?.agent_contact ?? '',
    notes: initial?.notes ?? '',
    description: initial?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string) {
    return (v: string) => setFields((prev) => ({ ...prev, [key]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({ category, ...fields })
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      {category === 'bank_account' && (
        <>
          <Field label="Bank name"><Select value={fields.institution_name} onChange={set('institution_name')} options={BANK_NAMES} /></Field>
          <Field label="Branch / city"><Input value={fields.description} onChange={set('description')} placeholder="e.g. Koramangala, Bengaluru" /></Field>
          <Field label="Account type">
            <Select value={fields.agent_contact} onChange={set('agent_contact')} options={['Savings', 'Current', 'FD', 'RD']} />
          </Field>
          <Field label="Last 4 digits of account number"><Input value={fields.account_number} onChange={set('account_number')} placeholder="XXXX" /></Field>
          <Field label="Nominee name on account"><Input value={fields.nominee_name} onChange={set('nominee_name')} /></Field>
        </>
      )}

      {category === 'insurance_policy' && (
        <>
          <Field label="Company"><Select value={fields.institution_name} onChange={set('institution_name')} options={INSURANCE_COMPANIES} /></Field>
          <Field label="Policy number"><Input value={fields.account_number} onChange={set('account_number')} /></Field>
          <Field label="Type">
            <Select value={fields.description} onChange={set('description')} options={['Life', 'Health', 'Term', 'ULIP', 'Endowment']} />
          </Field>
          <Field label="Approximate sum assured"><Input value={fields.agent_contact} onChange={set('agent_contact')} placeholder="e.g. ₹50,00,000" /></Field>
          <Field label="Nominee name"><Input value={fields.nominee_name} onChange={set('nominee_name')} /></Field>
        </>
      )}

      {category === 'property' && (
        <>
          <Field label="Property type">
            <Select value={fields.institution_name} onChange={set('institution_name')} options={['Flat', 'House', 'Plot', 'Commercial']} />
          </Field>
          <Field label="Address"><Textarea value={fields.description} onChange={set('description')} placeholder="Full address" /></Field>
          <Field label="Ownership">
            <Select value={fields.account_number} onChange={set('account_number')} options={['Sole', 'Joint']} />
          </Field>
          <Field label="If joint — with whom"><Input value={fields.nominee_name} onChange={set('nominee_name')} /></Field>
          <Field label="Where are original papers stored?"><Input value={fields.agent_contact} onChange={set('agent_contact')} placeholder="e.g. Home safe / bank locker / advocate's office" /></Field>
          <Field label="Loan outstanding?">
            <Select value={fields.account_number + '_loan'} onChange={(v) => set('account_number')(fields.account_number + (v === 'Yes' ? ':loan' : ''))} options={['Yes', 'No']} />
          </Field>
        </>
      )}

      {category === 'investment' && (
        <>
          <Field label="Broker / platform"><Select value={fields.institution_name} onChange={set('institution_name')} options={BROKERS} /></Field>
          <Field label="Folio or account number"><Input value={fields.account_number} onChange={set('account_number')} /></Field>
          <Field label="Approximate value"><Input value={fields.description} onChange={set('description')} placeholder="e.g. ₹5,00,000" /></Field>
          <Field label="Nominee name"><Input value={fields.nominee_name} onChange={set('nominee_name')} /></Field>
        </>
      )}

      {category === 'ppf_epf_post_office' && (
        <>
          <Field label="Scheme"><Select value={fields.institution_name} onChange={set('institution_name')} options={SCHEMES} /></Field>
          <Field label="Account or certificate number"><Input value={fields.account_number} onChange={set('account_number')} /></Field>
          <Field label="Branch or EPFO office"><Input value={fields.description} onChange={set('description')} /></Field>
          <Field label="Nominee name"><Input value={fields.nominee_name} onChange={set('nominee_name')} /></Field>
        </>
      )}

      {category === 'bank_locker' && (
        <>
          <Field label="Bank name"><Select value={fields.institution_name} onChange={set('institution_name')} options={BANK_NAMES} /></Field>
          <Field label="Branch"><Input value={fields.description} onChange={set('description')} /></Field>
          <Field label="Locker number"><Input value={fields.account_number} onChange={set('account_number')} /></Field>
          <Field label="Where are the keys?"><Input value={fields.nominee_name} onChange={set('nominee_name')} placeholder="e.g. top drawer of bedroom cupboard" /></Field>
          <Field label="Who else has a key?"><Input value={fields.agent_contact} onChange={set('agent_contact')} /></Field>
        </>
      )}

      {category === 'digital_account' && (
        <>
          <Field label="Platform"><Select value={fields.institution_name} onChange={set('institution_name')} options={PLATFORMS} /></Field>
          <Field label="Username or email"><Input value={fields.account_number} onChange={set('account_number')} /></Field>
          <Field label="Instructions for your family"><Textarea value={fields.description} onChange={set('description')} placeholder="What should they do with this account?" /></Field>
        </>
      )}

      <Field label="Notes (optional)">
        <Textarea value={fields.notes} onChange={set('notes')} placeholder="Anything else your family should know" />
      </Field>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3 mt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#1a1a1a] text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-[#1a1a1a] text-[#1a1a1a] rounded-md px-5 py-2.5 text-sm font-medium hover:bg-[#fafaf9] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
