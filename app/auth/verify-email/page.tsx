'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_EMAIL } from '@/lib/constants'

export default function VerifyEmailPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      if (user.email_confirmed_at) { router.replace('/vault'); return }
      setEmail(user.email ?? null)
    }
    check()
  }, [supabase, router])

  async function handleResend() {
    if (!email || status === 'sending' || status === 'sent') return
    setStatus('sending')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setStatus(error ? 'error' : 'sent')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}
    >
      <nav className="border-b border-[#e5e7eb] px-6 py-4">
        <Link
          href="/"
          className="font-semibold text-[#1a1a1a]"
          style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
        >
          Antim
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1
            className="text-2xl font-semibold text-[#1a1a1a] mb-2"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            Check your inbox.
          </h1>
          <p className="text-[#6b7280] text-sm mb-1">
            We sent a verification link to:
          </p>
          {email && (
            <p className="text-[#1a1a1a] text-sm font-medium mb-6">{email}</p>
          )}
          <p className="text-[#6b7280] text-sm mb-8">
            Click the link in that email to verify your account, then sign in to continue.
          </p>

          {status === 'sent' && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-4 py-3 mb-4">
              Verification email resent. Check your inbox (and spam folder).
            </p>
          )}
          {status === 'error' && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3 mb-4">
              Failed to resend. Please try again or{' '}
              <a href={`mailto:${ADMIN_EMAIL}`} className="underline underline-offset-2">
                contact support
              </a>
              .
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleResend}
              disabled={status === 'sending' || status === 'sent'}
              className="w-full bg-[#1a1a1a] text-white rounded-md px-4 py-3 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending'
                ? 'Sending…'
                : status === 'sent'
                  ? 'Email sent'
                  : 'Resend verification email'}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full border border-[#e5e7eb] text-[#6b7280] rounded-md px-4 py-3 text-sm hover:bg-[#fafaf9] transition-colors"
            >
              Sign out and use a different email
            </button>
          </div>

          <p className="text-xs text-[#9ca3af] text-center mt-6">
            Need help?{' '}
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              className="text-[#6b7280] underline underline-offset-2"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
