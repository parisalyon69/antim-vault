// ── Google Analytics 4 event tracking utility ────────────────────────────────
// Wraps window.gtag with a null-guard so it is safe to call from any component,
// including during SSR (where window is not defined) or before the GA script loads.
//
// Usage:
//   import { trackEvent } from '@/lib/analytics'
//   trackEvent('document_uploaded', { category: 'insurance_policy' })

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params)
  }
}
