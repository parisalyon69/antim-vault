import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptLetter } from '@/lib/vault/encryption'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { content } = body

  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content must be a string' }, { status: 400 })
  }

  const encrypted = encryptLetter(content, user.id)
  return NextResponse.json({ encrypted })
}
