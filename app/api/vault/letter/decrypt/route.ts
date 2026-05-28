import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptLetter } from '@/lib/vault/encryption'
import { letterDecryptLimiter } from '@/lib/ratelimit'

// Encrypted output is base64; 50k plain-text chars produces ~70k encrypted chars.
// Cap at 100k to account for encoding overhead without being unreasonably tight.
const MAX_ENCRYPTED_LENGTH = 100_000

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // ── Rate limit by user ID ──────────────────────────────────────────────────
  if (letterDecryptLimiter) {
    const { success } = await letterDecryptLimiter.limit(`letter:dec:${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  const body = await request.json()
  const { encrypted } = body

  if (typeof encrypted !== 'string') {
    return NextResponse.json({ error: 'encrypted must be a string' }, { status: 400 })
  }

  if (encrypted.length > MAX_ENCRYPTED_LENGTH) {
    return NextResponse.json(
      { error: `encrypted content exceeds maximum allowed length` },
      { status: 400 }
    )
  }

  try {
    const content = decryptLetter(encrypted, user.id)
    return NextResponse.json({ content })
  } catch {
    // Do not log the encrypted payload — it contains sensitive personal content.
    console.error('[api/vault/letter/decrypt] decryption failed for user:', user.id)
    return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
  }
}
