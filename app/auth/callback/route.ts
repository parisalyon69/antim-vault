import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Validate next: must be an internal path (starts with / but not //).
  // Rejects protocol-relative values like //evil.com that browsers treat as
  // off-site redirects after the origin prefix is prepended.
  const rawNext = searchParams.get('next') ?? '/vault'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/vault'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
