'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SubscribePage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function startCheckout() {
      try {
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
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}
    >
      {error ? (
        <div className="text-center max-w-xs">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <Link href="/auth/login" className="text-sm text-[#1a1a1a] underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="text-center max-w-xs">
          <p
            className="text-xl font-semibold text-[#1a1a1a] mb-3"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            Setting up your vault…
          </p>
          <p className="text-[#6b7280] text-sm leading-relaxed">
            Taking you to payment. Please wait.
          </p>
        </div>
      )}
    </div>
  )
}
