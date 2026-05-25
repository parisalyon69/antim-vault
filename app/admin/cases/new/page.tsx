export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/constants'
import Link from 'next/link'
import CaseIntakeForm from './CaseIntakeForm'

export default async function NewCasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/vault')

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
        <div className="mb-8">
          <Link
            href="/admin/cases"
            className="text-xs text-[#6b6b5a] hover:text-[#1a1a1a] transition-colors"
          >
            ← All cases
          </Link>
          <h1
            className="text-2xl font-semibold text-[#1a1a1a] mt-2"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            New case
          </h1>
          <p className="text-sm text-[#6b6b5a] mt-1">
            Record a new estate settlement case.
          </p>
        </div>

        <div className="bg-white border border-[#e5e2da] rounded-lg p-8">
          <CaseIntakeForm />
        </div>
      </main>
    </div>
  )
}
