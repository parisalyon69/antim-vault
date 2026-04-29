import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('[stripe-webhook] incoming request')
  console.log('[stripe-webhook] STRIPE_WEBHOOK_SECRET set:', !!process.env.STRIPE_WEBHOOK_SECRET)
  console.log('[stripe-webhook] STRIPE_SECRET_KEY set:', !!process.env.STRIPE_SECRET_KEY)

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  console.log('[stripe-webhook] stripe-signature present:', !!sig)
  console.log('[stripe-webhook] body length:', body.length)

  if (!sig) {
    console.error('[stripe-webhook] missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe-webhook] signature verification failed:', message)
    return NextResponse.json({ error: `Signature verification failed: ${message}` }, { status: 400 })
  }

  console.log('[stripe-webhook] event type:', event.type)

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        console.log('[stripe-webhook] checkout.session.completed — userId:', userId)
        if (!userId) {
          console.error('[stripe-webhook] no userId in session metadata')
          break
        }

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null

        const { error } = await supabase.from('vaults').upsert(
          {
            user_id: userId,
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            consent_given: true,
            consent_given_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

        if (error) {
          console.error('[stripe-webhook] supabase upsert error:', error.message)
        } else {
          console.log('[stripe-webhook] vault upserted successfully for user:', userId)

          // Send welcome email (best-effort — do not block the webhook response)
          try {
            const { data: { user: vaultUser } } = await supabase.auth.admin.getUserById(userId)
            if (vaultUser?.email) {
              const firstName = (vaultUser.user_metadata?.full_name as string | undefined)
                ?.split(' ')[0] ?? 'there'
              await sendWelcomeEmail(vaultUser.email, firstName)
              console.log('[stripe-webhook] welcome email sent to:', vaultUser.email)
            }
          } catch (emailErr) {
            const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
            console.error('[stripe-webhook] welcome email failed (non-fatal):', msg)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        console.log('[stripe-webhook] subscription.deleted — subId:', sub.id)
        await supabase
          .from('vaults')
          .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null
        }
        const sub = invoice.subscription
        const subId =
          typeof sub === 'string' ? sub : (sub as { id: string } | null)?.id ?? null
        console.log('[stripe-webhook] invoice.payment_failed — subId:', subId)
        if (!subId) break
        await supabase
          .from('vaults')
          .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId)
        break
      }

      default:
        console.log('[stripe-webhook] unhandled event type:', event.type)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe-webhook] handler error:', message)
    return NextResponse.json({ error: `Handler error: ${message}` }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
