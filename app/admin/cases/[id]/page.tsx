export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/constants'
import Link from 'next/link'
import StatusActions from './StatusActions'

const ESTATE_LABELS: Record<string, string> = {
  bank_accounts:          'Bank accounts',
  lic_insurance:          'LIC / insurance policies',
  epf_pf:                 'EPF / PF',
  mutual_funds:           'Mutual funds',
  demat_accounts:         'Demat accounts',
  property:               'Property / real estate',
  post_office:            'Post office schemes',
  pan_deactivation:       'PAN deactivation',
  aadhaar_deactivation:   'Aadhaar deactivation',
  digital_accounts:       'Digital accounts',
  succession_certificate: 'Succession certificate required',
  other:                  'Other',
}

const STATUS_BADGE: Record<string, string> = {
  new:           'bg-[#f0ede6] text-[#6b6b5a] border-[#d6d3cc]',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  complete:      'bg-[#eaf1ea] text-[#4F6F52] border-[#c3d6c4]',
}

const STATUS_LABEL: Record<string, string> = {
  new:           'New',
  'in-progress': 'In progress',
  complete:      'Complete',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#6b6b5a] mb-0.5">{label}</p>
      <p className="text-sm text-[#1a1a1a]">{value || '—'}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-sm font-semibold text-[#4F6F52] uppercase tracking-wide mb-4 pb-2 border-b border-[#e5e2da]">
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {children}
      </div>
    </section>
  )
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/vault')

  const { id } = await params

  const service = await createServiceClient()
  const { data: c } = await service
    .from('cases')
    .select('*')
    .eq('id', id)
    .single()

  if (!c) notFound()

  const badgeCls = STATUS_BADGE[c.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'
  const badgeLabel = STATUS_LABEL[c.status] ?? c.status

  return (
    <div className="min-h-screen bg-[#F7F4ED]" style={{ fontFamily: 'Calibri, system-ui, sans-serif' }}>
      <nav className="bg-white border-b border-[#e5e2da] px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Georgia, serif' }}>
          Antim Admin
        </span>
        <div className="flex items-center gap-4 text-sm text-[#6b6b5a]">
          <Link href="/admin" className="hover:text-[#1a1a1a] transition-colors">Release requests</Link>
          <Link href="/admin/cases" className="hover:text-[#1a1a1a] transition-colors">Cases</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/cases" className="text-xs text-[#6b6b5a] hover:text-[#1a1a1a] transition-colors">
            ← All cases
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1
              className="text-2xl font-semibold text-[#1a1a1a]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {c.deceased_name}
            </h1>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${badgeCls}`}>
              {badgeLabel}
            </span>
          </div>
          <p className="text-xs text-[#6b6b5a] mt-1">
            Case opened {formatDate(c.created_at)}
            {c.updated_at !== c.created_at && ` · Last updated ${formatDate(c.updated_at)}`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="bg-white border border-[#e5e2da] rounded-lg px-6 py-5 mb-6">
          <p className="text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide mb-3">Actions</p>
          <StatusActions id={c.id} status={c.status} />
        </div>

        {/* Case fields */}
        <div className="bg-white border border-[#e5e2da] rounded-lg px-6 py-8 flex flex-col gap-8">

          <Section title="Deceased">
            <Field label="Full name" value={c.deceased_name} />
            <Field label="Date of death" value={formatDate(c.date_of_death)} />
            <Field label="City" value={c.city} />
            <Field label="State / Union Territory" value={c.state} />
          </Section>

          <Section title="Primary heir / contact">
            <Field label="Full name" value={c.heir_name} />
            <Field label="Relationship" value={c.heir_relationship} />
            <Field label="Email" value={c.heir_email} />
            <Field label="Phone" value={c.heir_phone} />
            <Field label="Country of residence" value={c.heir_country} />
          </Section>

          <section>
            <p className="text-sm font-semibold text-[#4F6F52] uppercase tracking-wide mb-4 pb-2 border-b border-[#e5e2da]">
              Estate scope
            </p>
            {c.estate_scope?.length ? (
              <ul className="flex flex-col gap-1.5">
                {(c.estate_scope as string[]).map((v) => (
                  <li key={v} className="flex items-center gap-2 text-sm text-[#1a1a1a]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4F6F52] flex-shrink-0" />
                    {ESTATE_LABELS[v] ?? v}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#6b6b5a]">—</p>
            )}
          </section>

          <Section title="Partner assignment">
            <Field label="Assigned CA firm" value={c.assigned_ca} />
            <Field label="Assigned law firm" value={c.assigned_law_firm} />
          </Section>

          {c.notes && (
            <section>
              <p className="text-sm font-semibold text-[#4F6F52] uppercase tracking-wide mb-4 pb-2 border-b border-[#e5e2da]">
                Internal notes
              </p>
              <p className="text-sm text-[#1a1a1a] whitespace-pre-wrap leading-relaxed">{c.notes}</p>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}
