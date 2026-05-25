'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mode = 'loading' | 'request-reset' | 'set-password'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token') ?? ''

    if (accessToken) {
      // Establish the recovery session so updateUser works
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => setMode('set-password'))
        .catch(() => {
          setMsg({ text: 'This reset link is invalid or has expired. Request a new one.', type: 'err' })
          setMode('request-reset')
        })
    } else {
      setMode('request-reset')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)

    if (error) {
      setMsg({ text: 'Could not send reset email. Please try again.', type: 'err' })
      return
    }

    setMsg({ text: 'Check your inbox — we sent you a password reset link.', type: 'ok' })
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    if (password !== confirm) {
      setMsg({ text: 'Passwords do not match.', type: 'err' })
      return
    }
    if (password.length < 8) {
      setMsg({ text: 'Password must be at least 8 characters.', type: 'err' })
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setMsg({ text: 'Could not update password. The link may have expired — request a new one.', type: 'err' })
      return
    }

    router.push('/vault')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}>
      <nav className="border-b border-[#e5e7eb] px-6 py-4">
        <Link href="/" className="font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          Antim
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          {mode === 'loading' && (
            <p className="text-sm text-[#6b7280]">Loading…</p>
          )}

          {mode === 'request-reset' && (
            <>
              <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
                Reset your password
              </h1>
              <p className="text-[#6b7280] text-sm mb-8">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
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

                {msg && (
                  <p className={`text-sm rounded-md px-4 py-3 border ${msg.type === 'ok' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-600'}`}>
                    {msg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || msg?.type === 'ok'}
                  className="w-full bg-[#1a1a1a] text-white rounded-md px-4 py-3 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="text-sm text-[#6b7280] text-center mt-6">
                Remembered it?{' '}
                <Link href="/auth/login" className="text-[#1a1a1a] underline underline-offset-2">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {mode === 'set-password' && (
            <>
              <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
                Set new password
              </h1>
              <p className="text-[#6b7280] text-sm mb-8">
                Choose a strong password for your vault.
              </p>

              <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-[#1a1a1a] mb-1.5">New password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                    placeholder="At least 8 characters"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#1a1a1a] mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1a1a] transition-colors"
                    placeholder="Same password again"
                  />
                </div>

                {msg && (
                  <p className={`text-sm rounded-md px-4 py-3 border ${msg.type === 'ok' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-600'}`}>
                    {msg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a1a1a] text-white rounded-md px-4 py-3 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? 'Updating…' : 'Set new password'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
