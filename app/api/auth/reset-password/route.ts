import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/email'
import { authResetLimiter } from '@/lib/ratelimit'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vault.antim.services'

// Basic email format check — rejects obvious non-emails before hitting Supabase.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/

export async function POST(request: Request) {
  // ── Rate limit by IP ──────────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (authResetLimiter) {
    const { success } = await authResetLimiter.limit(`auth:reset:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  const body = await request.json()
  const { email } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const trimmed = email.trim().toLowerCase()

  if (!EMAIL_RE.test(trimmed)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const service = await createServiceClient()

  // Generate a recovery link via the admin API (bypasses Supabase's 2/hour mailer cap).
  // The redirectTo is where Supabase sends the user after token verification —
  // it appends #access_token=... so our reset page can pick it up from the hash.
  const { data, error: linkError } = await service.auth.admin.generateLink({
    type: 'recovery',
    email: trimmed,
    options: {
      redirectTo: `${APP_URL}/auth/reset-password`,
    },
  })

  if (linkError) {
    // Log internally but return a vague message so we don't leak whether the email exists.
    console.error('[api/auth/reset-password] generateLink failed:', linkError.message)
    return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 })
  }

  const resetLink = data.properties.action_link

  const { error: emailError } = await sendPasswordResetEmail(trimmed, resetLink)

  if (emailError) {
    console.error('[api/auth/reset-password] Resend failed')
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
