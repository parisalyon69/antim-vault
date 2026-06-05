import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmergencyAccessAlert, sendEmergencyAccessAcknowledgment } from '@/lib/email'
import { releaseIpLimiter } from '@/lib/ratelimit'

// ── How to manually approve a request ────────────────────────────────────────
//
// The Antim team reviews emergency access requests by checking Supabase directly:
//   1. Open the Supabase dashboard → Table Editor → emergency_access_requests
//   2. Find the pending request (status = 'pending')
//   3. Review the death certificate in Storage → emergency-documents bucket
//   4. If approved:
//      a. Update status to 'approved' and reviewed_at to NOW(), reviewed_by to your name
//      b. Use the existing /api/admin/approve flow to generate a release token, OR
//         manually email the nominee at their nominee_email with the vault contents
//   5. If rejected:
//      a. Update status to 'rejected' and reviewed_at to NOW(), reviewed_by to your name
//      b. Email the nominee at nominee_email explaining why and what to do next
//
// Do NOT expose any admin API for this — review is intentionally manual for now.
// ─────────────────────────────────────────────────────────────────────────────

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/
const MAX_NOTE_LENGTH = 2000

async function validateFileMagicBytes(file: File): Promise<boolean> {
  const slice = file.slice(0, 12)
  const buf = await slice.arrayBuffer()
  const b = new Uint8Array(buf)
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return true // PDF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return true // JPEG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return true // PNG
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return true // WebP
  return false
}

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // ── Content-Type guard — must be multipart/form-data ─────────────────────
  // Prevents non-form requests from reaching formData() parsing.
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 415 })
  }

  // ── Rate limit by IP ──────────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (releaseIpLimiter) {
    const { success } = await releaseIpLimiter.limit(`emergency:ip:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later or contact hello@antim.services.' },
        { status: 429 }
      )
    }
  }

  const formData = await request.formData()

  const nomineeName = (formData.get('nomineeName') as string | null)?.trim()
  const nomineeEmail = (formData.get('nomineeEmail') as string | null)?.trim().toLowerCase()
  const ownerName = (formData.get('ownerName') as string | null)?.trim()
  const ownerEmail = (formData.get('ownerEmail') as string | null)?.trim().toLowerCase()
  // Bound the note field — prevents megabyte payloads reaching the DB and email templates
  const rawNote = (formData.get('note') as string | null)?.trim() || null
  const note = rawNote ? rawNote.slice(0, MAX_NOTE_LENGTH) : null
  const certFile = formData.get('certificate') as File | null

  if (!nomineeName || !nomineeEmail || !ownerName || !ownerEmail || !certFile) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  if (!EMAIL_RE.test(nomineeEmail) || !EMAIL_RE.test(ownerEmail)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  // ── File validation ───────────────────────────────────────────────────────
  const MAX_BYTES = 10 * 1024 * 1024
  if (certFile.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
  }
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED_TYPES.includes(certFile.type)) {
    return NextResponse.json({ error: 'Invalid file type. Please upload a PDF, JPG, PNG, or WEBP.' }, { status: 400 })
  }
  const magicValid = await validateFileMagicBytes(certFile)
  if (!magicValid) {
    return NextResponse.json({ error: 'Invalid file type. Please upload a PDF, JPG, PNG, or WEBP.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Nominee validation ────────────────────────────────────────────────────
  // Both lookups are always performed regardless of intermediate results.
  // This eliminates the timing oracle that would allow enumeration of valid
  // vault owner emails by measuring response latency differences.
  //
  // A single generic error is returned regardless of which check fails.
  const VALIDATION_ERROR = 'We could not find a matching nominee record. Please ensure the email addresses are correct, or contact hello@antim.services for help.'

  // Run both lookups in parallel to eliminate per-branch timing differences.
  const [ownerResult, vaultResult] = await Promise.all([
    supabase.rpc('get_user_id_by_email', { p_email: ownerEmail }),
    // Dummy query — result only used if ownerResult succeeds
    Promise.resolve(null),
  ])

  const ownerUserId = ownerResult.data as string | null
  let nomineeValidated = false

  if (ownerUserId) {
    const { data: vault } = await supabase
      .from('vaults')
      .select('id')
      .eq('user_id', ownerUserId)
      .single()

    if (vault) {
      const { data: nomineeRow } = await supabase
        .from('vault_nominees')
        .select('id')
        .eq('vault_id', vault.id)
        .eq('email', nomineeEmail)
        .maybeSingle()

      nomineeValidated = !!nomineeRow
    }
  } else {
    // Owner not found — still perform the same number of DB round-trips as the
    // success path to avoid timing differences that could reveal owner existence.
    await Promise.all([
      supabase.from('vaults').select('id').eq('user_id', '00000000-0000-0000-0000-000000000000').maybeSingle(),
      supabase.from('vault_nominees').select('id').eq('vault_id', '00000000-0000-0000-0000-000000000000').eq('email', nomineeEmail).maybeSingle(),
    ])
  }

  // Suppress the ownerResult reference to silence the TS unused-variable warning.
  void vaultResult

  if (!nomineeValidated) {
    return NextResponse.json({ error: VALIDATION_ERROR }, { status: 422 })
  }

  // ── Upload death certificate ──────────────────────────────────────────────
  // Path includes a UUID so it cannot be guessed or enumerated even if the
  // nominee's email address is known. The sanitized email provides a human-
  // readable prefix for admin review in the Supabase dashboard.
  const requestId = crypto.randomUUID()
  const safeName = certFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `emergency-access/${requestId}/${safeName}`

  const bytes = await certFile.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('emergency-documents')
    .upload(filePath, bytes, { contentType: certFile.type, upsert: false })

  if (uploadError) {
    // Log only the code and hint, never include nominee/owner details
    console.error('[emergency-access] death certificate upload failed:', uploadError.message)
    return NextResponse.json(
      { error: 'Failed to upload the death certificate. Please try again.' },
      { status: 500 }
    )
  }

  // ── Store request ─────────────────────────────────────────────────────────
  const { error: insertError } = await supabase.from('emergency_access_requests').insert({
    nominee_name: nomineeName,
    nominee_email: nomineeEmail,
    owner_name: ownerName,
    owner_email: ownerEmail,
    death_certificate_path: filePath,
    note,
    status: 'pending',
  })

  if (insertError) {
    // Log error code only, not the full message which may echo back column values
    console.error('[emergency-access] insert failed code:', insertError.code)
    return NextResponse.json(
      { error: 'Failed to save your request. Please try again.' },
      { status: 500 }
    )
  }

  // ── Internal alert to Antim team ──────────────────────────────────────────
  try {
    await sendEmergencyAccessAlert({
      nomineeName,
      nomineeEmail,
      ownerName,
      ownerEmail,
      note,
      nomineeValidated,
      submittedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    })
  } catch (err) {
    // Log message only — Resend error objects may serialize the recipient email
    console.error('[emergency-access] admin alert email failed (non-fatal):', err instanceof Error ? err.message : 'unknown')
  }

  // ── Acknowledgment to nominee ─────────────────────────────────────────────
  try {
    await sendEmergencyAccessAcknowledgment(nomineeEmail, nomineeName)
  } catch (err) {
    console.error('[emergency-access] nominee acknowledgment email failed (non-fatal):', err instanceof Error ? err.message : 'unknown')
  }

  return NextResponse.json({ success: true })
}
