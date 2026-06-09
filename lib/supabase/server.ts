import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// ── User-context SSR client ───────────────────────────────────────────────────
// Reads the caller's session cookie so every operation runs under that user's
// RLS policies. Use this for any operation on behalf of an authenticated user.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}

// ── Cookie-free service-role client ──────────────────────────────────────────
// Authenticates exclusively with SUPABASE_SERVICE_ROLE_KEY — bypasses RLS.
// Never reads or attaches request cookies, so a logged-in user's session can
// never influence which identity this client uses.
//
// Use ONLY for:
//   - Admin operations on service-only tables (deny-all RLS)
//   - auth.admin.* calls (generateLink, deleteUser, getUserById)
//   - Storage operations on private buckets the user cannot access directly
//
// Never import this in 'use client' files. The service-role key must not reach
// the browser bundle (it has no NEXT_PUBLIC_ prefix so Next.js won't bundle it,
// but the import must stay server-side).
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
