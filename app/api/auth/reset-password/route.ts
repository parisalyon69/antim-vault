import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vault.antim.services'

export async function POST(request: Request) {
  const body = await request.json()
  const { email } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const service = await createServiceClient()

  // Generate a recovery link via the admin API (bypasses Supabase's 2/hour mailer cap).
  // The redirectTo is where Supabase sends the user after token verification —
  // it appends #access_token=... so our reset page can pick it up from the hash.
  const { data, error: linkError } = await service.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim().toLowerCase(),
    options: {
      redirectTo: `${APP_URL}/auth/reset-password`,
    },
  })

  if (linkError) {
    console.error('[api/auth/reset-password] generateLink failed:', linkError.message, linkError)
    // Return a vague message to the client so we don't leak whether the email exists
    return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 })
  }

  const resetLink = data.properties.action_link

  const { error: emailError } = await sendPasswordResetEmail(email.trim(), resetLink)

  if (emailError) {
    console.error('[api/auth/reset-password] Resend failed:', emailError)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
