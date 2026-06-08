'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

interface TourStep {
  id: string
  label: string
  description: string
  href: string
  cta: string
  done: boolean
}

interface Props {
  hasDocument: boolean
  hasAsset: boolean
  hasNominee: boolean
  hasLetter: boolean
}

// CheckIcon — shown on completed steps
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path
        d="M2 5l2.5 2.5 3.5-4"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ArrowIcon — shown on the active step CTA link
function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6h7M6.5 3l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

async function persistOnboardingState(completed: boolean) {
  try {
    await fetch('/api/vault/complete-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    })
  } catch {
    // Non-fatal — tour will re-appear on next load but that is acceptable
  }
}

export default function VaultOnboardingTour({ hasDocument, hasAsset, hasNominee, hasLetter }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Local dismissed state lets us hide the tour instantly without waiting for
  // the server re-render. The Supabase flag (set via the API) prevents it from
  // ever coming back on subsequent sessions or devices.
  const [dismissed, setDismissed] = useState(false)

  const steps: TourStep[] = [
    {
      id: 'document',
      label: 'Upload a document',
      description:
        'Add your will, property papers, insurance policies, or bank statements. These are the first things your family will need to find.',
      href: '/vault/documents',
      cta: 'Go to documents',
      done: hasDocument,
    },
    {
      id: 'asset',
      label: 'Map an asset',
      description:
        'Record your bank accounts, investments, and property. Your family will know exactly where everything is, and nothing will be lost.',
      href: '/vault/assets',
      cta: 'Go to accounts and assets',
      done: hasAsset,
    },
    {
      id: 'nominee',
      label: 'Add a nominee',
      description:
        'Name the people who should be notified and who can request access to this vault. Without a nominee, no one will know to look here.',
      href: '/vault/nominees',
      cta: 'Add a nominee',
      done: hasNominee,
    },
    {
      id: 'letter',
      label: 'Write your personal letter',
      description:
        'Leave a private message for your family. It stays encrypted until they open the vault. It does not have to be long.',
      href: '/vault/letter',
      cta: 'Write a letter',
      done: hasLetter,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length
  // The active step is the first incomplete one. When all are done, activeIndex is -1.
  const activeIndex = steps.findIndex((s) => !s.done)

  if (dismissed) return null

  function handleDismiss() {
    if (allDone) trackEvent('onboarding_completed')
    setDismissed(true)
    void persistOnboardingState(true)
    startTransition(() => router.refresh())
  }

  return (
    <div
      role="region"
      aria-label="Getting started guide"
      className="border border-[#e5e7eb] rounded-lg mb-10 overflow-hidden"
      style={{ fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-5 sm:px-6 pt-5 pb-4 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280] mb-1">
            Getting started
          </p>
          <h2
            className="text-lg font-semibold text-[#1a1a1a] leading-snug"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            {allDone ? 'Your vault is complete.' : 'Four steps to protect your family.'}
          </h2>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-xs text-[#9ca3af]" aria-live="polite">
            {completedCount} of {steps.length}
          </span>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="text-xs text-[#9ca3af] hover:text-[#6b7280] transition-colors underline underline-offset-2 disabled:opacity-50"
            aria-label={allDone ? 'Dismiss getting started guide' : 'Skip setup tour'}
          >
            {allDone ? 'Dismiss' : 'Skip tour'}
          </button>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────────────── */}
      <div className="mx-5 sm:mx-6 h-px bg-[#f0ece4]">
        <div
          className="h-px bg-[#4F6F52] transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-label={`${completedCount} of ${steps.length} steps complete`}
        />
      </div>

      {/* ── Steps ──────────────────────────────────────────────────────────────── */}
      <div className="divide-y divide-[#f5f3ef]">
        {steps.map((step, index) => {
          const isActive = index === activeIndex

          return (
            <div
              key={step.id}
              className={`px-5 sm:px-6 py-4 transition-colors ${isActive ? 'bg-[#FAFAF9]' : ''}`}
            >
              <div className="flex items-start gap-4">
                {/* Step status indicator */}
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    step.done
                      ? 'bg-[#4F6F52]'
                      : isActive
                      ? 'border-2 border-[#4F6F52]'
                      : 'border-2 border-[#d1d5db]'
                  }`}
                  aria-hidden="true"
                >
                  {step.done ? (
                    <CheckIcon />
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full bg-[#4F6F52]" />
                  ) : null}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.done
                        ? 'text-[#9ca3af]'
                        : isActive
                        ? 'text-[#1a1a1a]'
                        : 'text-[#9ca3af]'
                    }`}
                  >
                    {step.label}
                  </p>

                  {/* Description + CTA only on the active step */}
                  {isActive && (
                    <div className="mt-2">
                      <p className="text-sm text-[#6b7280] leading-relaxed mb-3 max-w-sm">
                        {step.description}
                      </p>
                      <Link
                        href={step.href}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4F6F52] hover:text-[#3d5940] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6F52] focus-visible:ring-offset-2 rounded"
                      >
                        {step.cta}
                        <ArrowIcon />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Step number for upcoming steps (visual only) */}
                {!step.done && !isActive && (
                  <span className="text-xs text-[#d1d5db] flex-shrink-0 mt-0.5" aria-hidden="true">
                    {index + 1}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── All done state ─────────────────────────────────────────────────────── */}
      {allDone && (
        <div className="px-5 sm:px-6 py-4 bg-[#f0fdf4] border-t border-[#bbf7d0]">
          <p className="text-sm text-[#15803d]">
            Your family has what they need. You can dismiss this guide whenever you are ready.
          </p>
        </div>
      )}
    </div>
  )
}
