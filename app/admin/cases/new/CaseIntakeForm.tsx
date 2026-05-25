'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

const RELATIONSHIPS = ['Son', 'Daughter', 'Spouse', 'Father', 'Mother', 'Brother', 'Sister', 'Other']

const ESTATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'bank_accounts',        label: 'Bank accounts' },
  { value: 'lic_insurance',        label: 'LIC / insurance policies' },
  { value: 'epf_pf',              label: 'EPF / PF' },
  { value: 'mutual_funds',         label: 'Mutual funds' },
  { value: 'demat_accounts',       label: 'Demat accounts' },
  { value: 'property',             label: 'Property / real estate' },
  { value: 'post_office',          label: 'Post office schemes' },
  { value: 'pan_deactivation',     label: 'PAN deactivation' },
  { value: 'aadhaar_deactivation', label: 'Aadhaar deactivation' },
  { value: 'digital_accounts',     label: 'Digital accounts' },
  { value: 'succession_certificate', label: 'Succession certificate required' },
  { value: 'other',               label: 'Other' },
]

const inputClass =
  'w-full border border-[#d6d3cc] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-[#4F6F52] transition-colors placeholder:text-[#b0ad9c]'
const selectClass =
  'w-full border border-[#d6d3cc] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-[#4F6F52] transition-colors'
const labelClass = 'block text-xs font-medium text-[#6b6b5a] mb-1'
const sectionHeadingClass =
  'text-sm font-semibold text-[#4F6F52] uppercase tracking-wide mb-4 pb-2 border-b border-[#e5e2da]'

export default function CaseIntakeForm() {
  const router = useRouter()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estateScope, setEstateScope] = useState<string[]>([])

  function toggleScope(value: string) {
    setEstateScope((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setWorking(true)

    const form = e.currentTarget
    const fd = new FormData(form)

    const body = {
      deceased_name:     fd.get('deceased_name'),
      date_of_death:     fd.get('date_of_death') || null,
      city:              fd.get('city') || null,
      state:             fd.get('state') || null,
      heir_name:         fd.get('heir_name') || null,
      heir_relationship: fd.get('heir_relationship') || null,
      heir_email:        fd.get('heir_email') || null,
      heir_phone:        fd.get('heir_phone') || null,
      heir_country:      fd.get('heir_country') || null,
      estate_scope:      estateScope,
      assigned_ca:       fd.get('assigned_ca') || null,
      assigned_law_firm: fd.get('assigned_law_firm') || null,
      notes:             fd.get('notes') || null,
    }

    const res = await fetch('/api/admin/cases/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong. Please try again.')
      setWorking(false)
      return
    }

    router.push(`/admin/cases/${json.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {error && (
        <div className="text-sm rounded-lg px-4 py-3 border bg-red-50 border-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* ── Deceased ─────────────────────────────────────────── */}
      <section>
        <p className={sectionHeadingClass}>Deceased</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="deceased_name" className={labelClass}>Full name <span className="text-red-500">*</span></label>
            <input
              id="deceased_name"
              name="deceased_name"
              type="text"
              required
              autoFocus
              className={inputClass}
              placeholder="e.g. Ramesh Kumar Sharma"
            />
          </div>
          <div>
            <label htmlFor="date_of_death" className={labelClass}>Date of death</label>
            <input
              id="date_of_death"
              name="date_of_death"
              type="date"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="city" className={labelClass}>City</label>
            <input
              id="city"
              name="city"
              type="text"
              className={inputClass}
              placeholder="e.g. Mumbai"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="state" className={labelClass}>State / Union Territory</label>
            <select id="state" name="state" className={selectClass} defaultValue="">
              <option value="" disabled>Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── Primary heir / contact ───────────────────────────── */}
      <section>
        <p className={sectionHeadingClass}>Primary heir / contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="heir_name" className={labelClass}>Full name</label>
            <input
              id="heir_name"
              name="heir_name"
              type="text"
              className={inputClass}
              placeholder="e.g. Priya Sharma"
            />
          </div>
          <div>
            <label htmlFor="heir_relationship" className={labelClass}>Relationship to deceased</label>
            <select id="heir_relationship" name="heir_relationship" className={selectClass} defaultValue="">
              <option value="" disabled>Select relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="heir_email" className={labelClass}>Email</label>
            <input
              id="heir_email"
              name="heir_email"
              type="email"
              className={inputClass}
              placeholder="e.g. priya@example.com"
            />
          </div>
          <div>
            <label htmlFor="heir_phone" className={labelClass}>Phone (with country code)</label>
            <input
              id="heir_phone"
              name="heir_phone"
              type="text"
              className={inputClass}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="heir_country" className={labelClass}>Country of residence</label>
            <input
              id="heir_country"
              name="heir_country"
              type="text"
              className={inputClass}
              placeholder="e.g. India"
            />
          </div>
        </div>
      </section>

      {/* ── Estate scope ─────────────────────────────────────── */}
      <section>
        <p className={sectionHeadingClass}>Estate scope</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ESTATE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 py-2 px-3 rounded-md cursor-pointer hover:bg-[#f0ede6] transition-colors"
            >
              <input
                type="checkbox"
                checked={estateScope.includes(opt.value)}
                onChange={() => toggleScope(opt.value)}
                className="w-4 h-4 rounded border-[#d6d3cc] accent-[#4F6F52]"
              />
              <span className="text-sm text-[#1a1a1a]">{opt.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ── Partner assignment ───────────────────────────────── */}
      <section>
        <p className={sectionHeadingClass}>Partner assignment</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="assigned_ca" className={labelClass}>Assigned CA firm</label>
            <input
              id="assigned_ca"
              name="assigned_ca"
              type="text"
              className={inputClass}
              placeholder="Optional"
            />
          </div>
          <div>
            <label htmlFor="assigned_law_firm" className={labelClass}>Assigned law firm</label>
            <input
              id="assigned_law_firm"
              name="assigned_law_firm"
              type="text"
              className={inputClass}
              placeholder="Optional"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className={labelClass}>Internal notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className={`${inputClass} resize-none`}
              placeholder="Any context relevant to this case…"
            />
          </div>
        </div>
      </section>

      {/* ── Submit ───────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={working}
          className="bg-[#4F6F52] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#3d5740] transition-colors disabled:opacity-50"
        >
          {working ? 'Creating case…' : 'Create case'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/cases')}
          className="text-sm text-[#6b6b5a] hover:text-[#1a1a1a] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
