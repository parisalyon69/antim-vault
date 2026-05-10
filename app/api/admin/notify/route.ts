import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendReleaseApprovedEmail, sendReleaseRejectedEmail } from '@/lib/email'
import { ADMIN_EMAIL } from '@/lib/constants'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { type, to, name, token, reason } = body

  if (!type || !to || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await (type === 'approved'
    ? sendReleaseApprovedEmail(to, name, token)
    : sendReleaseRejectedEmail(to, name, reason))

  if (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
