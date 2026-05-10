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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price: process.env.STRIPE_VAULT_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/vault?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
      metadata: { userId: user.id },
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[create-checkout] Stripe error:', message)
    return NextResponse.json({ error: 'Could not create checkout session. Please try again.' }, { status: 500 })
  }
}
