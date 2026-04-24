import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CompletenessScore from '@/components/vault/CompletenessScore'
import { calculateCompleteness } from '@/lib/vault/completeness'

export default async function VaultDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const firstName = (user.user_metadata?.full_name as string | undefined)
    ?.split(' ')[0] ?? 'there'

  const { data: vault } = await supabase
    .from('vaults')
    .select('id, updated_at')
    .eq('user_id', user.id)
    .single()

  if (!vault) return null

  const [
    { count: assetCount },
    { count: documentCount },
    { count: nomineeCount },
    { data: letter },
    { data: bankAssets },
    { data: insuranceAssets },
  ] = await Promise.all([
    supabase.from('vault_assets').select('*', { count: 'exact', head: true }).eq('vault_id', vault.id),
    supabase.from('vault_documents').select('*', { count: 'exact', head: true }).eq('vault_id', vault.id),
    supabase.from('vault_nominees').select('*', { count: 'exact', head: true }).eq('vault_id', vault.id),
    supabase.from('vault_letters').select('id').eq('vault_id', vault.id).maybeSingle(),
    supabase.from('vault_assets').select('id').eq('vault_id', vault.id).eq('category', 'bank_account').limit(1),
    supabase.from('vault_assets').select('id').eq('vault_id', vault.id).eq('category', 'insurance_policy').limit(1),
  ])

  const scoreData = {
    nomineeCount: nomineeCount ?? 0,
    documentCount: documentCount ?? 0,
    assetCount: assetCount ?? 0,
    hasLetter: !!letter,
    hasBankAsset: (bankAssets?.length ?? 0) > 0,
    hasInsuranceAsset: (insuranceAssets?.length ?? 0) > 0,
  }

  const score = calculateCompleteness(scoreData)

  const lastUpdated = vault.updated_at
    ? new Date(vault.updated_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const sections = [
    {
      title: 'Accounts & assets',
      count: assetCount ?? 0,
      href: '/vault/assets',
      empty: 'Your family doesn\'t know what accounts exist yet.',
    },
    {
      title: 'Documents',
      count: documentCount ?? 0,
      href: '/vault/documents',
      empty: 'No documents uploaded yet.',
    },
    {
      title: 'Nominees',
      count: nomineeCount ?? 0,
      href: '/vault/nominees',
      empty: 'No one has been named yet.',
    },
    {
      title: 'Personal letter',
      count: letter ? 1 : 0,
      href: '/vault/letter',
      empty: 'Your family hasn\'t heard from you yet.',
    },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-1" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
        Your vault, {firstName}
      </h1>
      {lastUpdated && (
        <p className="text-sm text-[#6b7280] mb-8">Last updated {lastUpdated}</p>
      )}

      <div className="mb-10">
        <CompletenessScore {...scoreData} />
      </div>

      {score < 50 && (
        <div className="border border-[#e5e7eb] rounded-lg p-5 mb-8 bg-[#FAFAF9]">
          <p className="text-sm text-[#1a1a1a]">
            Your family still doesn&apos;t have a complete picture. It takes about 20 minutes to finish.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="border border-[#e5e7eb] rounded-lg p-6 hover:border-[#1a1a1a] transition-colors group"
          >
            <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-2">{section.title}</p>
            {section.count > 0 ? (
              <p className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
                {section.count}
              </p>
            ) : (
              <p className="text-sm text-[#6b7280] leading-relaxed">{section.empty}</p>
            )}
            <p className="text-xs text-[#1a1a1a] mt-3 group-hover:underline underline-offset-2">
              {section.count > 0 ? 'Manage →' : 'Add now →'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
