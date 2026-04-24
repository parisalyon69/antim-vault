import { createClient, createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { data: vault } = await supabase
    .from('vaults')
    .select('id, stripe_subscription_id')
    .eq('user_id', user.id)
    .single()

  if (!vault) {
    return NextResponse.json({ error: 'No vault found' }, { status: 404 })
  }

  // 1. Delete all files from vault-documents storage
  const { data: docs } = await supabase
    .from('vault_documents')
    .select('file_path')
    .eq('vault_id', vault.id)

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.file_path)
    await supabase.storage.from('vault-documents').remove(paths)
  }

  // 2. Delete all vault data rows (cascades handle most, but explicit is safer)
  await Promise.all([
    supabase.from('vault_assets').delete().eq('vault_id', vault.id),
    supabase.from('vault_documents').delete().eq('vault_id', vault.id),
    supabase.from('vault_nominees').delete().eq('vault_id', vault.id),
    supabase.from('vault_letters').delete().eq('vault_id', vault.id),
    supabase.from('vault_activity_log').delete().eq('vault_id', vault.id),
  ])

  // 3. Delete vault row
  await supabase.from('vaults').delete().eq('id', vault.id)

  // 4. Cancel Stripe subscription
  if (vault.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(vault.stripe_subscription_id)
    } catch {
      // Non-fatal — subscription may already be cancelled
    }
  }

  // 5. Delete auth user (requires service role)
  await serviceSupabase.auth.admin.deleteUser(user.id)

  return NextResponse.json({ success: true })
}
