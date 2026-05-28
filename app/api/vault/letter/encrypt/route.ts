import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptLetter } from '@/lib/vault/encryption'
import { letterEncryptLimiter } from '@/lib/ratelimit'

// Maximum plain-text letter length. AES encryption is CPU-bound;
// an unbounded content string could be used as a DoS vector.
const MAX_CONTENT_LENGTH = 50_000 // characters

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // ── Rate limit by user ID ──────────────────────────────────────────────────
  if (letterEncryptLimiter) {
    const { success } = await letterEncryptLimiter.limit(`letter:enc:${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  const body = await request.json()
  const { content } = body

  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content must be a string' }, { status: 400 })
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` },
      { status: 400 }
    )
  }

  const encrypted = encryptLetter(content, user.id)
  return NextResponse.json({ encrypted })
}
