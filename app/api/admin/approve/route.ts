import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendReleaseApprovedEmail } from '@/lib/email'
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
  const { request_id, nominee_email, nominee_name } = body

  if (!request_id || !nominee_email || !nominee_name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = await createServiceClient()

  // Derive vault_id from the database rather than trusting the caller-supplied value.
  // This prevents an admin UI bug (or malicious body) from associating a token with
  // the wrong vault.
  const { data: releaseRequest, error: fetchError } = await service
    .from('vault_release_requests')
    .select('vault_id')
    .eq('id', request_id)
    .single()

  if (fetchError || !releaseRequest) {
    return NextResponse.json({ error: 'Release request not found' }, { status: 404 })
  }

  const vault_id = releaseRequest.vault_id

  if (!vault_id) {
    return NextResponse.json({ error: 'No vault linked to this release request' }, { status: 422 })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const { error: tokenError } = await service.from('vault_release_tokens').insert({
    vault_id,
    token,
    expires_at: expiresAt,
    used: false,
  })

  if (tokenError) {
    console.error('[admin/approve] token insert failed:', tokenError.message)
    return NextResponse.json({ error: 'Failed to generate release token' }, { status: 500 })
  }

  const { error: statusError } = await service
    .from('vault_release_requests')
    .update({ status: 'approved', resolved_at: new Date().toISOString() })
    .eq('id', request_id)

  if (statusError) {
    console.error('[admin/approve] status update failed:', statusError.message)
  }

  await logActivity(service, vault_id, 'release_approved', {
    nominee_name,
    nominee_email,
  })

  const { error: emailError } = await sendReleaseApprovedEmail(nominee_email, nominee_name, token)
  if (emailError) {
    console.error('[admin/approve] email failed:', emailError)
    return NextResponse.json({ success: true, warning: 'email_failed' })
  }

  return NextResponse.json({ success: true })
}
