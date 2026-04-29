import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname.startsWith('/vault') || pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check active subscription for /vault routes.
    // Exception: let ?success=true through so the vault page can show
    // an "activating" state while the Stripe webhook fires asynchronously.
    if (pathname.startsWith('/vault')) {
      const isPostPayment = request.nextUrl.searchParams.get('success') === 'true'
      if (!isPostPayment) {
        const { data: vault } = await supabase
          .from('vaults')
          .select('subscription_status')
          .eq('user_id', user.id)
          .single()

        if (!vault || vault.subscription_status !== 'active') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    }
  }

  // /release is public — no protection needed

  return response
}

export const config = {
  matcher: ['/vault/:path*', '/admin/:path*'],
}
