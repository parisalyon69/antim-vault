import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendNomineeAlertEmail } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nomineeId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the user owns this nominee (RLS-scoped query via anon client)
  const { data: nominee } = await supabase
    .from('vault_nominees')
    .select('id, full_name, email, vault_id')
    .eq('id', nomineeId)
    .single()

  if (!nominee) {
    return NextResponse.json({ error: 'Nominee not found' }, { status: 404 })
  }

  if (!nominee.email) {
    return NextResponse.json({ error: 'Nominee has no email address' }, { status: 400 })
  }

  const ownerName =
    (user.user_metadata?.full_name as string | undefined) ?? 'Someone'

  let emailFailed = false

  try {
    await sendNomineeAlertEmail(nominee.email, nominee.full_name, ownerName)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[nominees/notify] Resend failed (non-fatal):', msg)
    emailFailed = true
  }

  if (!emailFailed) {
    // Only mark as notified if the email actually sent
    const { error: updateErr } = await supabase
      .from('vault_nominees')
      .update({ notified: true, notified_at: new Date().toISOString() })
      .eq('id', nomineeId)

    if (updateErr) {
      console.error('[nominees/notify] update failed:', updateErr.message)
      // Return ok:true anyway -- email sent, DB update just didn't stick.
    }

    await logActivity(supabase, nominee.vault_id, 'nominee_notified', `Notified nominee: ${nominee.full_name}`, {
      nominee_name: nominee.full_name,
      nominee_email: nominee.email,
    })
  }

  return NextResponse.json({ ok: !emailFailed, emailFailed })
}
