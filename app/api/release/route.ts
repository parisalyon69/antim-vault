import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendReleaseRequestAlert, sendReleaseRequestAcknowledgmentEmail } from '@/lib/email'
import { releaseIpLimiter, releaseEmailLimiter } from '@/lib/ratelimit'
import { logActivity } from '@/lib/activity'

// Basic email format validation — rejects obvious non-emails before any DB work.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/

// Validate file content by inspecting magic bytes rather than trusting the
// client-supplied Content-Type, which can be spoofed trivially in FormData.
async function validateFileMagicBytes(file: File): Promise<boolean> {
  const HEADER_BYTES = 12
  const slice = file.slice(0, HEADER_BYTES)
  const buf = await slice.arrayBuffer()
  const b = new Uint8Array(buf)

  // PDF: %PDF (25 50 44 46)
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return true
  // JPEG: FF D8 FF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return true
  // WebP: RIFF....WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return true

  return false
}

export async function POST(request: Request) {
  // ── Rate limit by IP ────────────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (releaseIpLimiter) {
    const { success } = await releaseIpLimiter.limit(`release:ip:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later or contact support.' },
        { status: 429 }
      )
    }
  }

  const formData = await request.formData()

  const yourName = (formData.get('yourName') as string | null)?.trim()
  const relationship = (formData.get('relationship') as string | null)?.trim()
  const deceasedName = (formData.get('deceasedName') as string | null)?.trim()
  const deceasedEmail = (formData.get('deceasedEmail') as string | null)?.trim().toLowerCase()
  const yourPhone = (formData.get('yourPhone') as string | null)?.trim()
  const yourEmail = (formData.get('yourEmail') as string | null)?.trim().toLowerCase()
  const rawNote = (formData.get('note') as string | null)?.trim() ?? ''
  const note = rawNote.slice(0, 2000)
  const certFile = formData.get('certificate') as File | null

  if (!yourName || !relationship || !deceasedName || !deceasedEmail || !yourPhone || !yourEmail || !certFile) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  // ── Email format validation ─────────────────────────────────────────────────
  if (!EMAIL_RE.test(yourEmail)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(deceasedEmail)) {
    return NextResponse.json({ error: 'Invalid deceased email address.' }, { status: 400 })
  }

  // ── Rate limit by deceased email (cross-IP protection) ───────────────────────
  if (releaseEmailLimiter) {
    const { success } = await releaseEmailLimiter.limit(`release:email:${deceasedEmail}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later or contact support.' },
        { status: 429 }
      )
    }
  }

  // ── File size validation ────────────────────────────────────────────────────
  const MAX_BYTES = 10 * 1024 * 1024
  if (certFile.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
  }

  // ── File type validation — client MIME + magic bytes ───────────────────────
  // Checking certFile.type alone is insufficient because it is supplied by the
  // client. We also inspect the file's magic bytes server-side.
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED_TYPES.includes(certFile.type)) {
    return NextResponse.json({ error: 'Invalid file type. Please upload a PDF, JPG, PNG, or WEBP.' }, { status: 400 })
  }

  const magicValid = await validateFileMagicBytes(certFile)
  if (!magicValid) {
    return NextResponse.json({ error: 'Invalid file type. Please upload a PDF, JPG, PNG, or WEBP.' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Look up the vault by deceased email — single indexed DB call via RPC
  const { data: matchedUserId } = await supabase.rpc('get_user_id_by_email', {
    p_email: deceasedEmail,
  })

  let vaultId: string | null = null
  if (matchedUserId) {
    const { data: vault } = await supabase
      .from('vaults')
      .select('id')
      .eq('user_id', matchedUserId as string)
      .single()
    vaultId = vault?.id ?? null
  }

  // Upload death certificate to release-documents bucket.
  // Sanitize yourEmail before using it as a path segment to prevent path
  // traversal (e.g. an email like "../../admin" would be collapsed to a safe string).
  const timestamp = Date.now()
  const sanitizedName = certFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const sanitizedEmail = yourEmail.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${sanitizedEmail}/${timestamp}_${sanitizedName}`

  const bytes = await certFile.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('release-documents')
    .upload(filePath, bytes, { contentType: certFile.type, upsert: false })

  if (uploadError) {
    console.error('[release] death certificate upload failed')
    return NextResponse.json({ error: 'Failed to upload death certificate. Please try again.' }, { status: 500 })
  }

  // Store release request
  const { error: insertError } = await supabase.from('vault_release_requests').insert({
    vault_id: vaultId,
    deceased_email: deceasedEmail,
    requested_by_name: yourName,
    requested_by_email: yourEmail,
    requested_by_phone: yourPhone,
    relationship,
    death_certificate_path: filePath,
    status: 'pending',
    admin_notes: note || null,
  })

  if (insertError) {
    console.error('[release] release request insert failed')
    return NextResponse.json({ error: 'Failed to save your request. Please try again.' }, { status: 500 })
  }

  // Log activity on the vault (if found)
  if (vaultId) {
    await logActivity(supabase, vaultId, 'release_request_submitted', `Release request submitted by ${yourName}`, {
      requested_by: yourName,
      requested_by_email: yourEmail,
    })
  }

  // Notify admin — if this fails, surface a warning but keep the 200
  const { error: alertError } = await sendReleaseRequestAlert({
    deceasedName: deceasedName!,
    deceasedEmail: deceasedEmail!,
    requestedByName: yourName!,
    requestedByEmail: yourEmail!,
    requestedByPhone: yourPhone!,
    relationship: relationship!,
    note,
    vaultFound: !!vaultId,
  })
  if (alertError) {
    console.error('[release] admin alert email failed')
    return NextResponse.json({ success: true, warning: 'admin_notification_failed' })
  }

  // Acknowledge receipt to nominee (best-effort — request is saved regardless)
  try {
    await sendReleaseRequestAcknowledgmentEmail(yourEmail!, yourName!)
  } catch (ackErr) {
    const msg = ackErr instanceof Error ? ackErr.message : String(ackErr)
    console.error('[release] nominee acknowledgment email failed (non-fatal):', msg)
  }

  return NextResponse.json({ success: true })
}
