'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ageConsent, setAgeConsent] = useState(false)
  const [dataConsent, setDataConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!ageConsent || !dataConsent) {
      setError('Please confirm both checkboxes to continue.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // If Supabase requires email confirmation, session won't exist yet
    if (!signUpData.session) {
      setError('Please check your email to confirm your account, then sign in to subscribe.')
      setLoading(false)
      return
    }

    // Session exists — go straight to Stripe checkout
    const res = await fetch('/api/vault/create-checkout', { method: 'POST' })
    const body = await res.json()

    if (!res.ok || !body.url) {
      setError(body.error ?? 'Could not start checkout. Please sign in and try again.')
      setLoading(false)
      return
    }

    window.location.href = body.url
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      {/* Nav */}
      <nav className="border-b border-[#e5e7eb] px-6 py-4">
        <Link href="/" className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Antim
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Create your vault
          </h1>
          <p className="text-[#6b7280] text-sm mb-8">
            Set it up once. Your family will be grateful forever.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                placeholder="Your full name"
              />
            </div>

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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageConsent}
                  onChange={(e) => setAgeConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#e5e7eb] accent-[#1a1a1a] flex-shrink-0"
                />
                <span className="text-sm text-[#6b7280]">
                  I am 18 years of age or older
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dataConsent}
                  onChange={(e) => setDataConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#e5e7eb] accent-[#1a1a1a] flex-shrink-0"
                />
                <span className="text-sm text-[#6b7280]">
                  I consent to Antim storing my personal and financial information.{' '}
                  <a
                    href="https://antim.services/privacy-policy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1a1a1a] underline underline-offset-2"
                  >
                    I have read the Privacy Policy.
                  </a>
                </span>
              </label>
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
              {loading ? 'Creating your vault…' : 'Create your vault'}
            </button>
          </form>

          <p className="text-sm text-[#6b7280] text-center mt-6">
            Already have a vault?{' '}
            <Link href="/auth/login" className="text-[#1a1a1a] underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
