export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/constants'
import Link from 'next/link'

type Case = {
  id: string
  deceased_name: string
  date_of_death: string | null
  heir_name: string | null
  heir_country: string | null
  estate_scope: string[] | null
  assigned_ca: string | null
  assigned_law_firm: string | null
  status: string
  created_at: string
}

const ESTATE_LABELS: Record<string, string> = {
  bank_accounts:          'Bank accounts',
  lic_insurance:          'LIC / insurance',
  epf_pf:                 'EPF / PF',
  mutual_funds:           'Mutual funds',
  demat_accounts:         'Demat accounts',
  property:               'Property',
  post_office:            'Post office',
  pan_deactivation:       'PAN deactivation',
  aadhaar_deactivation:   'Aadhaar deactivation',
  digital_accounts:       'Digital accounts',
  succession_certificate: 'Succession certificate',
  other:                  'Other',
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    new:         'bg-[#f0ede6] text-[#6b6b5a] border-[#d6d3cc]',
    'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
    complete:    'bg-[#eaf1ea] text-[#4F6F52] border-[#c3d6c4]',
  }
  const labels: Record<string, string> = {
    new:           'New',
    'in-progress': 'In progress',
    complete:      'Complete',
  }
  const cls = styles[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'
  return { cls, label: labels[status] ?? status }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function CasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/vault')

  const service = await createServiceClient()
  const { data: cases } = await service
    .from('cases')
    .select('id, deceased_name, date_of_death, heir_name, heir_country, estate_scope, assigned_ca, assigned_law_firm, status, created_at')
    .order('created_at', { ascending: false })

  const rows = (cases ?? []) as Case[]

  return (
    <div className="min-h-screen bg-[#F7F4ED]" style={{ fontFamily: 'Calibri, system-ui, sans-serif' }}>
      <nav className="bg-white border-b border-[#e5e2da] px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Georgia, serif' }}>
          Antim Admin
        </span>
        <div className="flex items-center gap-4 text-sm text-[#6b6b5a]">
          <Link href="/admin" className="hover:text-[#1a1a1a] transition-colors">Release requests</Link>
          <Link href="/admin/cases" className="text-[#4F6F52] font-medium">Cases</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-semibold text-[#1a1a1a]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Cases
            </h1>
            <p className="text-sm text-[#6b6b5a] mt-1">
              {rows.filter((r) => r.status === 'new').length} new ·{' '}
              {rows.filter((r) => r.status === 'in-progress').length} in progress ·{' '}
              {rows.length} total
            </p>
          </div>
          <Link
            href="/admin/cases/new"
            className="bg-[#4F6F52] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#3d5740] transition-colors"
          >
            New case
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white border border-[#e5e2da] rounded-lg text-center py-24">
            <p className="text-sm text-[#6b6b5a]">No cases yet.</p>
            <Link
              href="/admin/cases/new"
              className="inline-block mt-4 text-sm text-[#4F6F52] hover:underline underline-offset-2"
            >
              Create your first case →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#e5e2da] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e2da] bg-[#faf9f6]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide whitespace-nowrap">Deceased</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide whitespace-nowrap">Date of death</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide whitespace-nowrap">Heir</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide whitespace-nowrap">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide">Estate scope</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide whitespace-nowrap">Assigned CA</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide whitespace-nowrap">Law firm</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6b5a] uppercase tracking-wide whitespace-nowrap">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ede6]">
                  {rows.map((c) => {
                    const badge = statusBadge(c.status)
                    const scopeText = c.estate_scope?.length
                      ? c.estate_scope.map((v) => ESTATE_LABELS[v] ?? v).join(', ')
                      : '—'
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-[#faf9f6] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium text-[#1a1a1a] whitespace-nowrap">
                          <Link href={`/admin/cases/${c.id}`} className="hover:text-[#4F6F52] transition-colors">
                            {c.deceased_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#6b6b5a] whitespace-nowrap">{formatDate(c.date_of_death)}</td>
                        <td className="px-4 py-3 text-[#1a1a1a] whitespace-nowrap">{c.heir_name ?? '—'}</td>
                        <td className="px-4 py-3 text-[#6b6b5a] whitespace-nowrap">{c.heir_country ?? '—'}</td>
                        <td className="px-4 py-3 text-[#6b6b5a] max-w-[220px]">
                          <span className="line-clamp-2 leading-snug">{scopeText}</span>
                        </td>
                        <td className="px-4 py-3 text-[#6b6b5a] whitespace-nowrap">{c.assigned_ca ?? '—'}</td>
                        <td className="px-4 py-3 text-[#6b6b5a] whitespace-nowrap">{c.assigned_law_firm ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6b6b5a] whitespace-nowrap">{formatDate(c.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
