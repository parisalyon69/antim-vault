import Link from 'next/link'
import { ADMIN_EMAIL, MARKETING_URL } from '@/lib/constants'

export default function NotFound() {
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
          <p className="text-xs font-medium uppercase tracking-widest text-[#4F6F52] mb-6">
            404
          </p>
          <h1
            className="text-2xl font-semibold text-[#1a1a1a] mb-4 leading-snug"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            This page doesn&apos;t exist.
          </h1>
          <p className="text-sm text-[#6b7280] leading-relaxed mb-10">
            It may have been moved or you may have followed an old link.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/vault"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-[#344E3C] text-white text-sm font-medium hover:bg-[#4F6F52] transition-colors"
            >
              Go to dashboard
            </Link>
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
