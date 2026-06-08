import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CompletenessScore from '@/components/vault/CompletenessScore'
import { buildDimensions, calculateCompleteness } from '@/lib/vault/completeness'
import { VaultActivating } from './activating'
import { VAULT_PLAN_LABEL } from '@/lib/constants'
import VaultOnboardingTour from '@/components/vault/VaultOnboardingTour'
import PaymentSuccessTracker from '@/components/vault/PaymentSuccessTracker'

export default async function VaultDashboard({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { success } = await searchParams

  const firstName = (user.user_metadata?.full_name as string | undefined)
    ?.split(' ')[0] ?? 'there'

  const { data: vault } = await supabase
    .from('vaults')
    .select('id, updated_at, subscription_status, onboarding_completed')
    .eq('user_id', user.id)
    .single()

  // Middleware lets ?success=true through before the webhook fires.
  // VaultActivating auto-reloads every 3s (with ?success=true) until the vault row exists.
  if (!vault) {
    return <VaultActivating />
  }

  const [
    { count: assetCount, error: assetErr },
    { count: documentCount, error: docErr },
    { count: nomineeCount, error: nomineeErr },
    { data: letter, error: letterErr },
    { data: lastTokenData, error: lastTokenErr },
  ] = await Promise.all([
    supabase.from('vault_assets').select('*', { count: 'exact', head: true }).eq('vault_id', vault.id),
    supabase.from('vault_documents').select('*', { count: 'exact', head: true }).eq('vault_id', vault.id),
    supabase.from('vault_nominees').select('*', { count: 'exact', head: true }).eq('vault_id', vault.id),
    supabase.from('vault_letters').select('id').eq('vault_id', vault.id).maybeSingle(),
    supabase
      .from('vault_release_tokens')
      .select('accessed_at')
      .eq('vault_id', vault.id)
      .eq('used', true)
      .not('accessed_at', 'is', null)
      .order('accessed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (assetErr) console.error('[vault/dashboard] vault_assets query:', assetErr.message)
  if (docErr) console.error('[vault/dashboard] vault_documents query:', docErr.message)
  if (nomineeErr) console.error('[vault/dashboard] vault_nominees query:', nomineeErr.message)
  if (letterErr) console.error('[vault/dashboard] vault_letters query:', letterErr.message)
  if (lastTokenErr) console.error('[vault/dashboard] vault_release_tokens query:', lastTokenErr.message)

  // Show the guided tour to new users until they dismiss it or complete all steps.
  // onboarding_completed is set to true when the user dismisses the tour panel.
  // The v9 migration sets it to true for all existing active vaults so returning
  // users never see it retroactively.
  const showTour = vault.onboarding_completed === false

  const scoreData = {
    hasDocument: (documentCount ?? 0) > 0,
    hasAsset: (assetCount ?? 0) > 0,
    hasNominee: (nomineeCount ?? 0) > 0,
    hasLetter: !!letter,
  }

  const score = calculateCompleteness(buildDimensions(scoreData))

  const lastUpdated = vault.updated_at
    ? new Date(vault.updated_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const lastAccessed = lastTokenData?.accessed_at
    ? new Date(lastTokenData.accessed_at).toLocaleDateString('en-IN', {
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
      empty: 'Your family doesn\'t know what accounts exist. Add your first one.',
      cta: 'Add an account',
    },
    {
      title: 'Documents',
      count: documentCount ?? 0,
      href: '/vault/documents',
      empty: 'Upload your will, insurance papers, and property documents.',
      cta: 'Upload a document',
    },
    {
      title: 'Nominees',
      count: nomineeCount ?? 0,
      href: '/vault/nominees',
      empty: 'No one knows to look here yet. Add a nominee.',
      cta: 'Add a nominee',
    },
    {
      title: 'Personal letter',
      count: letter ? 1 : 0,
      href: '/vault/letter',
      empty: 'Your family hasn\'t heard from you yet. Write them a letter.',
      cta: 'Write a letter',
    },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      {success === 'true' && <PaymentSuccessTracker />}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Your vault, {firstName}
        </h1>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]">
          {VAULT_PLAN_LABEL}
        </span>
      </div>
      {lastUpdated && (
        <p className="text-sm text-[#6b7280] mb-1">Last updated {lastUpdated}</p>
      )}
      {lastAccessed && (
        <p className="text-xs text-[#9ca3af] mb-8">Last accessed by nominee: {lastAccessed}</p>
      )}
      {!lastAccessed && lastUpdated && <div className="mb-8" />}

      {showTour && (
        <VaultOnboardingTour
          hasDocument={(documentCount ?? 0) > 0}
          hasAsset={(assetCount ?? 0) > 0}
          hasNominee={(nomineeCount ?? 0) > 0}
          hasLetter={!!letter}
        />
      )}

      <div className="mb-10">
        <CompletenessScore
          hasDocument={scoreData.hasDocument}
          hasAsset={scoreData.hasAsset}
          hasNominee={scoreData.hasNominee}
          hasLetter={scoreData.hasLetter}
        />
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
            className={`border rounded-lg p-6 transition-colors group ${
              section.count > 0
                ? 'border-[#e5e7eb] hover:border-[#1a1a1a]'
                : 'border-dashed border-[#e5e7eb] hover:border-[#4F6F52]/40 hover:bg-[#f9faf8]'
            }`}
          >
            <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-2">{section.title}</p>
            {section.count > 0 ? (
              <p className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
                {section.count}
              </p>
            ) : (
              <p className="text-sm text-[#6b7280] leading-relaxed">{section.empty}</p>
            )}
            <p className={`text-xs mt-3 group-hover:underline underline-offset-2 transition-colors ${
              section.count > 0 ? 'text-[#1a1a1a]' : 'text-[#4F6F52]'
            }`}>
              {section.count > 0 ? 'Manage' : section.cta} &rarr;
            </p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-[#9ca3af] mt-10 leading-relaxed">
        If something happens to you, your nominees can request access at{' '}
        <a
          href="https://vault.antim.services/emergency-access"
          className="underline underline-offset-2 hover:text-[#6b7280] transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          vault.antim.services/emergency-access
        </a>
      </p>
    </div>
  )
}
