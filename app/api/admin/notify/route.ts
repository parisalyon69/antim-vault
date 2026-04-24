import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'hello@antim.services') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { type, to, name, token, reason } = body

  if (!type || !to || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vault.antim.services'

  let subject: string
  let text: string

  if (type === 'approved') {
    const accessUrl = `${appUrl}/release/view?token=${token}`
    subject = 'Your vault access request has been approved — Antim'
    text = [
      `Dear ${name},`,
      ``,
      `We have reviewed and approved your request to access the vault.`,
      ``,
      `You can view the vault using the secure link below. This link is valid for 72 hours.`,
      ``,
      accessUrl,
      ``,
      `If you have any questions, please contact us at hello@antim.services or WhatsApp +33 7 45 72 28 99.`,
      ``,
      `We are deeply sorry for your loss.`,
      ``,
      `The Antim Team`,
    ].join('\n')
  } else {
    subject = 'Update on your vault access request — Antim'
    text = [
      `Dear ${name},`,
      ``,
      `We have reviewed your request to access the vault.`,
      ``,
      `Unfortunately, we were unable to approve your request at this time.`,
      reason ? `\nReason: ${reason}\n` : '',
      `If you believe this is a mistake or have additional documentation to provide, please contact us at hello@antim.services or WhatsApp +33 7 45 72 28 99.`,
      ``,
      `We are deeply sorry for your loss.`,
      ``,
      `The Antim Team`,
    ].join('\n')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Antim Vault <noreply@antim.services>',
      to,
      subject,
      text,
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
