import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendReleaseRequestAlert } from '@/lib/email'

export async function POST(request: Request) {
  const formData = await request.formData()

  const yourName = (formData.get('yourName') as string | null)?.trim()
  const relationship = (formData.get('relationship') as string | null)?.trim()
  const deceasedName = (formData.get('deceasedName') as string | null)?.trim()
  const deceasedEmail = (formData.get('deceasedEmail') as string | null)?.trim().toLowerCase()
  const yourPhone = (formData.get('yourPhone') as string | null)?.trim()
  const yourEmail = (formData.get('yourEmail') as string | null)?.trim().toLowerCase()
  const note = (formData.get('note') as string | null)?.trim() ?? ''
  const certFile = formData.get('certificate') as File | null

  if (!yourName || !relationship || !deceasedName || !deceasedEmail || !yourPhone || !yourEmail || !certFile) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const MAX_BYTES = 10 * 1024 * 1024
  if (certFile.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
  }

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED_TYPES.includes(certFile.type)) {
    return NextResponse.json({ error: 'Invalid file type. Please upload a PDF, JPG, PNG, or WEBP.' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Look up the vault by deceased email (via auth user lookup)
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const matchedUser = authUsers?.users?.find(
    (u) => u.email?.toLowerCase() === deceasedEmail
  )

  let vaultId: string | null = null
  if (matchedUser) {
    const { data: vault } = await supabase
      .from('vaults')
      .select('id')
      .eq('user_id', matchedUser.id)
      .single()
    vaultId = vault?.id ?? null
  }

  // Upload death certificate to release-documents bucket
  const timestamp = Date.now()
  const ext = certFile.name.split('.').pop() ?? 'bin'
  const sanitizedName = certFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${yourEmail}/${timestamp}_${sanitizedName}`

  const bytes = await certFile.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('release-documents')
    .upload(filePath, bytes, { contentType: certFile.type, upsert: false })

  if (uploadError) {
    console.error('Death certificate upload error:', uploadError)
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
    console.error('Release request insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save your request. Please try again.' }, { status: 500 })
  }

  // Notify admin via email (best-effort — request is saved regardless)
  try {
    await sendReleaseRequestAlert({
      deceasedName: deceasedName!,
      deceasedEmail: deceasedEmail!,
      requestedByName: yourName!,
      requestedByEmail: yourEmail!,
      requestedByPhone: yourPhone!,
      relationship: relationship!,
      note,
      vaultFound: !!vaultId,
    })
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ success: true })
}
