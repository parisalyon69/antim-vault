'use client'

import { useEffect } from 'react'

export function VaultActivating() {
  useEffect(() => {
    // Poll by reloading with ?success=true so the middleware exemption stays active.
    // Once the webhook fires and the vault row is active, the page will render the dashboard.
    const timer = setTimeout(() => {
      window.location.href = '/vault?success=true'
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <h1
        className="text-2xl font-semibold text-[#1a1a1a] mb-3"
        style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
      >
        Activating your vault…
      </h1>
      <p className="text-[#6b7280] text-sm max-w-xs leading-relaxed">
        Your payment was received. We&apos;re setting up your vault — this usually takes a few seconds.
      </p>
      <a
        href="/vault?success=true"
        className="mt-6 text-sm text-[#1a1a1a] underline underline-offset-2"
      >
        Refresh now →
      </a>
    </div>
  )
}
