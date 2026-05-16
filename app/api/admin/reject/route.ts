import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendReleaseRejectedEmail } from '@/lib/email'
import { ADMIN_EMAIL } from '@/lib/constants'
import { logActivity } from '@/lib/activity'

export async function POST(request: Request) {
  // Auth check is the first operation — no DB work before this resolves.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { request_id, nominee_email, nominee_name, reason } = body

  if (!request_id || !nominee_email || !nominee_name || !reason) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = await createServiceClient()

  const { data: rejectedRequest, error: statusError } = await service
    .from('vault_release_requests')
    .update({
      status: 'rejected',
      admin_notes: reason,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', request_id)
    .select('vault_id')
    .single()

  if (statusError) {
    console.error('[admin/reject] status update failed:', statusError.message)
  }

  if (rejectedRequest?.vault_id) {
    await logActivity(service, rejectedRequest.vault_id, 'release_rejected', {
      nominee_name,
      nominee_email,
      reason,
    })
  }

  const { error: emailError } = await sendReleaseRejectedEmail(nominee_email, nominee_name, reason)
  if (emailError) {
    console.error('[admin/reject] email failed:', emailError)
    return NextResponse.json({ success: true, warning: 'email_failed' })
  }

  return NextResponse.json({ success: true })
}
