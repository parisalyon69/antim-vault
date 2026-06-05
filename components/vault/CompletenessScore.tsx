'use client'

import { buildDimensions, calculateCompleteness, completenessLabel } from '@/lib/vault/completeness'
import type { VaultScoreInput, ScoreDimension } from '@/lib/vault/completeness'
import Link from 'next/link'

// Props are the four boolean inputs -- simple and extensible.
// The component computes dimensions + score internally.
type Props = VaultScoreInput

function DimensionRow({ dimension }: { dimension: ScoreDimension }) {
  const inner = (
    <div className="flex items-center justify-between py-2.5 group">
      <div className="flex items-center gap-2.5">
        <div
          className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            dimension.done ? 'bg-[#4F6F52]' : 'border-2 border-[#e5e7eb]'
          }`}
          aria-hidden="true"
        >
          {dimension.done && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span
          className={`text-sm transition-colors ${
            dimension.done
              ? 'text-[#1a1a1a]'
              : 'text-[#6b7280] group-hover:text-[#1a1a1a]'
          }`}
        >
          {dimension.label}
        </span>
      </div>
      <span className={`text-xs transition-colors ${dimension.done ? 'text-[#4F6F52] font-medium' : 'text-[#9ca3af] group-hover:text-[#6b7280]'}`}>
        {dimension.done ? 'Done' : 'Not started'}
      </span>
    </div>
  )

  // Complete dimensions are not clickable -- no need to navigate away from a finished step.
  // Incomplete dimensions link directly to the relevant vault section.
  if (dimension.done) {
    return <div>{inner}</div>
  }
  return (
    <Link href={dimension.href} aria-label={`Go to ${dimension.label}`}>
      {inner}
    </Link>
  )
}

export default function CompletenessScore({ hasDocument, hasAsset, hasNominee, hasLetter }: Props) {
  const dimensions = buildDimensions({ hasDocument, hasAsset, hasNominee, hasLetter })
  const score = calculateCompleteness(dimensions)
  const { text, colour } = completenessLabel(score)

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const dash = (score / 100) * circumference

  return (
    <div>
      {/* Score ring + label */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-24 h-24 flex-shrink-0" aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[-90deg]">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="7" />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke={colour}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-xl font-semibold"
            style={{ color: colour, fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
            aria-label={`${score} percent complete`}
          >
            {score}%
          </span>
        </div>
        <div>
          <p
            className="text-base font-medium text-[#1a1a1a] leading-snug"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            {text}
          </p>
          <p className="text-sm text-[#6b7280] mt-1">Vault completeness</p>
        </div>
      </div>

      {/* Per-dimension breakdown */}
      <div
        className="border border-[#e5e7eb] rounded-lg px-5 divide-y divide-[#f3f4f6]"
        role="list"
        aria-label="Vault completeness breakdown"
      >
        {dimensions.map((dim) => (
          <div key={dim.id} role="listitem">
            <DimensionRow dimension={dim} />
          </div>
        ))}
      </div>
    </div>
  )
}
