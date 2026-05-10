import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { data: vault } = await supabase
    .from('vaults')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!vault?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: vault.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/vault/settings`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[customer-portal] Stripe error:', message)
    return NextResponse.json({ error: 'Could not open billing portal. Please try again.' }, { status: 500 })
  }
}
