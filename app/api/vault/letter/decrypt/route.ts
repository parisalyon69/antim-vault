import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptLetter } from '@/lib/vault/encryption'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { encrypted } = body

  if (typeof encrypted !== 'string') {
    return NextResponse.json({ error: 'encrypted must be a string' }, { status: 400 })
  }

  try {
    const content = decryptLetter(encrypted, user.id)
    return NextResponse.json({ content })
  } catch {
    console.error('[api/vault/letter/decrypt] decryption failed')
    return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
  }
}
