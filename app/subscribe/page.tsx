'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

export default function SubscribePage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function startCheckout() {
      try {
        trackEvent('payment_initiated', { amount: 999 })
        const res = await fetch('/api/vault/create-checkout', { method: 'POST' })
        const body = await res.json()
        if (!res.ok || !body.url) {
          setError(body.error ?? 'Could not start checkout. Please try again.')
          return
        }
        window.location.href = body.url
      } catch {
        setError('Something went wrong. Please try again.')
      }
    }
    startCheckout()
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}
    >
      <nav className="border-b border-[#e5e7eb] px-6 py-4">
        <div className="max-w-[720px] mx-auto">
          <Link href="/" className="text-xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
            Antim
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        {error ? (
          <div className="text-center max-w-sm">
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3 mb-4">
              {error}
            </p>
            <Link href="/auth/login" className="text-sm text-[#1a1a1a] underline underline-offset-2 hover:text-[#333] transition-colors">
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="text-center max-w-xs">
            <p
              className="text-xl font-semibold text-[#1a1a1a] mb-3"
              style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
            >
              Setting up your vault...
            </p>
            <p className="text-[#6b7280] text-sm leading-relaxed">
              Taking you to payment. Please wait.
            </p>
          </div>
        )}
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
