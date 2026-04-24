import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getLongSignedUrl } from '@/lib/vault/storage'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { data: vault } = await supabase
    .from('vaults')
    .select('id, created_at, subscription_status')
    .eq('user_id', user.id)
    .single()

  if (!vault) {
    return NextResponse.json({ error: 'No vault found' }, { status: 404 })
  }

  const [
    { data: assets },
    { data: documents },
    { data: nominees },
  ] = await Promise.all([
    supabase.from('vault_assets').select('*').eq('vault_id', vault.id),
    supabase.from('vault_documents').select('*').eq('vault_id', vault.id),
    supabase.from('vault_nominees').select('*').eq('vault_id', vault.id),
  ])

  // Generate 24-hour signed URLs for all documents
  const docsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc) => ({
      ...doc,
      signed_url: await getLongSignedUrl(doc.file_path),
      file_path: undefined, // never expose raw storage paths
    }))
  )

  const exportData = {
    exported_at: new Date().toISOString(),
    vault: {
      created_at: vault.created_at,
      subscription_status: vault.subscription_status,
    },
    assets: assets ?? [],
    documents: docsWithUrls,
    nominees: nominees ?? [],
    note: 'Document signed URLs are valid for 24 hours from export time.',
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="antim-vault-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
