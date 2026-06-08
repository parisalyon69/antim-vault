'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

// Fires a GA4 payment_completed event once when the vault dashboard loads
// with ?success=true (i.e. the user has just returned from Stripe checkout).
// After firing, replaces the URL to remove the query param so the event is
// not re-fired on a manual refresh.
export default function PaymentSuccessTracker() {
  const router = useRouter()
  useEffect(() => {
    trackEvent('payment_completed', { amount: 999 })
    router.replace('/vault')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
