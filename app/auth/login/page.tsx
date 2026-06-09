'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { safeInternalPath } from '@/lib/safe-redirect'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    const next = safeInternalPath(searchParams.get('next'))
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <nav className="border-b border-[#e5e7eb] px-6 py-4">
        <div className="max-w-[720px] mx-auto">
          <Link href="/" className="text-xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Antim
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Sign in to your vault
          </h1>
          <p className="text-[#6b7280] text-sm mb-8">
            Your family is counting on what&apos;s inside.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                placeholder="Your password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white rounded-md px-4 py-3 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-[#6b7280] text-center mt-4">
            <Link href="/auth/reset-password" className="text-[#6b7280] underline underline-offset-2 hover:text-[#1a1a1a] transition-colors">
              Forgot password?
            </Link>
          </p>

          <p className="text-sm text-[#6b7280] text-center mt-3">
            Don&apos;t have a vault?{' '}
            <Link href="/auth/signup" className="text-[#1a1a1a] underline underline-offset-2">
              Create one
            </Link>
          </p>
        </div>
      </div>

      <footer className="border-t border-[#e5e7eb] py-8 px-6 mt-auto">
        <div className="max-w-[720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#9ca3af]">
          <span className="font-semibold text-[#6b7280]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>Antim</span>
          <div className="flex items-center gap-4">
            <a href="https://antim.services" className="hover:text-[#6b7280] transition-colors">antim.services</a>
            <span>© 2026 Orventis Partners Pvt Ltd</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
