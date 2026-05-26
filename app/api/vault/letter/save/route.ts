import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptLetter } from '@/lib/vault/encryption'

export async function POST(request: Request) {
  // Auth check — must be a logged-in user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { content, vaultId } = body

  if (typeof content !== 'string' || typeof vaultId !== 'string') {
    return NextResponse.json({ error: 'content and vaultId are required' }, { status: 400 })
  }

  // Verify the user owns this vault before writing
  const { data: vault } = await supabase
    .from('vaults')
    .select('id')
    .eq('id', vaultId)
    .eq('user_id', user.id)
    .single()

  if (!vault) {
    return NextResponse.json({ error: 'Vault not found' }, { status: 403 })
  }

  const encrypted = encryptLetter(content, user.id)

  // Use service client to bypass RLS — ownership is already verified above
  const service = await createServiceClient()
  const { error } = await service.from('vault_letters').upsert(
    {
      vault_id: vaultId,
      encrypted_content: encrypted,
      last_edited: new Date().toISOString(),
    },
    { onConflict: 'vault_id' }
  )

  if (error) {
    console.error('[api/vault/letter/save] upsert failed:', error.code, error.message, error.details)
    return NextResponse.json({ error: 'Failed to save letter', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
