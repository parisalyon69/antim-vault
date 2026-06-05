import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST { completed: boolean }
// Sets onboarding_completed on the authenticated user's vault.
// completed = true  → dismiss the tour permanently
// completed = false → reset so the tour shows again (used by settings "Show setup tour")

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let completed = true
  try {
    const body = await request.json()
    if (typeof body.completed === 'boolean') {
      completed = body.completed
    }
  } catch {
    // Body is optional — default to completing (true)
  }

  const { error } = await supabase
    .from('vaults')
    .update({ onboarding_completed: completed })
    .eq('user_id', user.id)

  if (error) {
    console.error('[complete-onboarding] update error:', error.message)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
