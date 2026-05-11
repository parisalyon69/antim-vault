'use client'

import Link from 'next/link'
import { ADMIN_EMAIL, MARKETING_URL } from '@/lib/constants'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      className="min-h-screen flex flex-col bg-[#F7F4ED]"
      style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}
    >
      {/* Wordmark */}
      <div className="px-8 pt-10">
        <Link
          href="/"
          className="text-xl font-semibold text-[#344E3C]"
          style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
        >
          Antim
        </Link>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-10 max-w-md w-full text-center shadow-sm">
          <h1
            className="text-2xl font-semibold text-[#1a1a1a] mb-4 leading-snug"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            Something went wrong.
          </h1>
          <p className="text-sm text-[#6b7280] leading-relaxed mb-4">
            We&apos;ve been notified and are looking into it. If this keeps happening, please reach out.
          </p>
          {error.digest ? (
            <p className="text-xs text-[#9ca3af] font-mono mb-8">
              Error reference: {error.digest}
            </p>
          ) : (
            <div className="mb-8" />
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-[#344E3C] text-white text-sm font-medium hover:bg-[#4F6F52] transition-colors"
            >
              Try again
            </button>
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-md border border-[#e5e7eb] text-sm text-[#6b7280] hover:border-[#4F6F52] hover:text-[#344E3C] transition-colors"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 pb-8 text-center">
        <a
          href={MARKETING_URL}
          className="text-xs text-[#9ca3af] hover:text-[#6b7280] transition-colors"
        >
          antim.services
        </a>
      </div>
    </div>
  )
}
