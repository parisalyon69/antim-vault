import { createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import Link from 'next/link'
import { ASSET_CATEGORY_LABELS, DOCUMENT_CATEGORY_LABELS } from '@/lib/types'
import { ADMIN_EMAIL, WHATSAPP_URL, WHATSAPP_DISPLAY } from '@/lib/constants'
import { tokenIpLimiter } from '@/lib/ratelimit'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ReleaseViewPage({ searchParams }: Props) {
  // ── Rate limit by IP ────────────────────────────────────────────────────────
  if (tokenIpLimiter) {
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      'unknown'
    const { success } = await tokenIpLimiter.limit(`token:ip:${ip}`)
    if (!success) {
      return <ErrorPage message="Too many requests. Please try again later." />
    }
  }

  const { token } = await searchParams

  if (!token) {
    return <ErrorPage message="No access token provided." />
  }

  const supabase = await createServiceClient()

  // Validate token
  const { data: releaseToken } = await supabase
    .from('vault_release_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (!releaseToken) {
    return <ErrorPage message="This link is invalid." />
  }

  if (releaseToken.used) {
    return <ErrorPage message="This link has already been used." />
  }

  if (new Date(releaseToken.expires_at) < new Date()) {
    return <ErrorPage message={`This link has expired. Please contact ${ADMIN_EMAIL}.`} />
  }

  const vaultId = releaseToken.vault_id

  // Fetch vault data before consuming the token — if this fails the
  // nominee can reload and try again with the same (still-valid) token.
  const [
    { data: assets },
    { data: documents },
    { data: nominees },
    { data: letter },
  ] = await Promise.all([
    supabase.from('vault_assets').select('*').eq('vault_id', vaultId),
    supabase.from('vault_documents').select('*').eq('vault_id', vaultId),
    supabase.from('vault_nominees').select('*').eq('vault_id', vaultId),
    supabase.from('vault_letters').select('encrypted_content').eq('vault_id', vaultId).single(),
  ])

  // Mark token as used only after we have the data — prevents the token
  // from being consumed if the data fetch fails mid-way.
  await supabase
    .from('vault_release_tokens')
    .update({ used: true, accessed_at: new Date().toISOString() })
    .eq('id', releaseToken.id)

  // Generate download URLs for documents (24hr)
  const docsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from('vault-documents')
        .createSignedUrl(doc.file_path, 86400)
      return { ...doc, download_url: signed?.signedUrl ?? null }
    })
  )

  return (
    <div className="min-h-screen bg-[#fafaf9]" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <nav className="bg-white border-b border-[#e5e7eb] px-6 py-4">
        <span className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Antim Vault
        </span>
      </nav>

      <main className="max-w-[720px] mx-auto px-6 py-10">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8 text-sm text-amber-800">
          This is a read-only view. Document download links are valid for 24 hours.
          If you need further assistance, contact{' '}
          <a href="mailto:hello@antim.services" className="underline underline-offset-2">hello@antim.services</a>.
        </div>

        <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-8" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Vault Contents
        </h1>

        {/* Nominees */}
        {(nominees ?? []).length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280] mb-4">
              Nominees
            </h2>
            <div className="border border-[#e5e7eb] rounded-lg divide-y divide-[#e5e7eb]">
              {nominees!.map((n) => (
                <div key={n.id} className="px-5 py-4">
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {n.full_name}
                    {n.is_primary && (
                      <span className="ml-2 text-xs bg-[#1a1a1a] text-white px-1.5 py-0.5 rounded-sm">Primary</span>
                    )}
                  </p>
                  <p className="text-xs text-[#6b7280] mt-0.5">{n.relationship}</p>
                  {n.phone && <p className="text-xs text-[#6b7280]">{n.phone}</p>}
                  {n.email && <p className="text-xs text-[#6b7280]">{n.email}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assets */}
        {(assets ?? []).length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280] mb-4">
              Accounts & Assets
            </h2>
            <div className="border border-[#e5e7eb] rounded-lg divide-y divide-[#e5e7eb]">
              {assets!.map((a) => (
                <div key={a.id} className="px-5 py-4">
                  <p className="text-xs text-[#6b7280] mb-0.5">{ASSET_CATEGORY_LABELS[a.category as keyof typeof ASSET_CATEGORY_LABELS] ?? a.category}</p>
                  <p className="text-sm font-medium text-[#1a1a1a]">{a.institution_name ?? '—'}</p>
                  {a.account_number && (
                    <p className="text-xs text-[#6b7280] mt-0.5">Account: {a.account_number}</p>
                  )}
                  {a.description && (
                    <p className="text-xs text-[#6b7280] mt-0.5">{a.description}</p>
                  )}
                  {a.nominee_name && (
                    <p className="text-xs text-[#6b7280] mt-0.5">Nominee: {a.nominee_name}</p>
                  )}
                  {a.notes && (
                    <p className="text-xs text-[#6b7280] mt-1 italic">{a.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Documents — always rendered so the section is never silently absent */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280] mb-4">
            Documents
          </h2>
          {docsWithUrls.length === 0 ? (
            <div className="border border-[#e5e7eb] rounded-lg px-5 py-6 text-sm text-[#9ca3af]">
              No documents have been uploaded to this vault yet.
            </div>
          ) : (
            <div className="border border-[#e5e7eb] rounded-lg divide-y divide-[#e5e7eb]">
              {docsWithUrls.map((doc) => (
                <div key={doc.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#6b7280] mb-0.5">
                      {DOCUMENT_CATEGORY_LABELS[doc.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? doc.category}
                    </p>
                    <p className="text-sm text-[#1a1a1a]">{doc.file_name}</p>
                    {doc.description && (
                      <p className="text-xs text-[#6b7280] mt-0.5">{doc.description}</p>
                    )}
                  </div>
                  {doc.download_url && (
                    <a
                      href={doc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#1a1a1a] border border-[#e5e7eb] rounded-md px-3 py-1.5 hover:bg-[#fafaf9] transition-colors flex-shrink-0"
                    >
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Letter — encrypted, shown as notice */}
        {letter?.encrypted_content && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280] mb-4">
              Personal Letter
            </h2>
            <div className="border border-[#e5e7eb] rounded-lg px-5 py-4">
              <p className="text-sm text-[#6b7280]">
                A personal letter has been left for you. To read it, contact{' '}
                <a href={`mailto:${ADMIN_EMAIL}`} className="text-[#1a1a1a] underline underline-offset-2">
                  {ADMIN_EMAIL}
                </a>
                {' '}with this reference: <span className="font-mono text-xs">{vaultId.slice(0, 8)}</span>.
              </p>
            </div>
          </section>
        )}

        {(assets ?? []).length === 0 && docsWithUrls.length === 0 && (nominees ?? []).length === 0 && !letter?.encrypted_content && (
          <div className="text-center py-16 text-sm text-[#6b7280]">
            This vault does not contain any information yet.
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-[#e5e7eb] text-center">
          <p className="text-sm text-[#6b7280]">
            Questions? Contact us at{' '}
            <a href={`mailto:${ADMIN_EMAIL}`} className="text-[#1a1a1a] underline underline-offset-2">
              {ADMIN_EMAIL}
            </a>
            {' '}or{' '}
            <a href={WHATSAPP_URL} className="text-[#1a1a1a] underline underline-offset-2">
              WhatsApp {WHATSAPP_DISPLAY}
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <nav className="border-b border-[#e5e7eb] px-6 py-4">
        <Link href="/" className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Antim
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold text-[#1a1a1a] mb-3" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Access unavailable
          </h1>
          <p className="text-sm text-[#6b7280] mb-6">{message}</p>
          <p className="text-sm text-[#6b7280]">
            For help, email{' '}
            <a href={`mailto:${ADMIN_EMAIL}`} className="text-[#1a1a1a] underline underline-offset-2">
              {ADMIN_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
