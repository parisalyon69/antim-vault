import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VaultSidebar from '@/components/vault/VaultSidebar'

export default async function VaultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: vault } = await supabase
    .from('vaults')
    .select('subscription_status, updated_at')
    .eq('user_id', user.id)
    .single()

  const status = vault?.subscription_status ?? 'inactive'

  // No vault row or inactive → redirect to pricing
  if (!vault || status === 'inactive') {
    redirect('/?paywall=true')
  }

  // past_due: allow access but lock after 30 days
  const isPastDue = status === 'past_due'
  let pastDueLocked = false

  if (isPastDue && vault.updated_at) {
    const daysSince =
      (Date.now() - new Date(vault.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince > 30) {
      pastDueLocked = true
    }
  }

  if (pastDueLocked) {
    redirect('/?paywall=true&reason=past_due')
  }

  return (
    <div className="flex min-h-screen" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <VaultSidebar />

      <div className="flex-1 flex flex-col pt-14 md:pt-0">
        {isPastDue && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-800">
            Your subscription payment failed. Your vault is accessible for now, but please update your payment method to avoid losing access.{' '}
            <a href="/vault/settings" className="underline underline-offset-2 font-medium">
              Update billing
            </a>
          </div>
        )}
        <main className="flex-1 px-4 md:px-8 py-8 md:py-10 max-w-[720px] w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
