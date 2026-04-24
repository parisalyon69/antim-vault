'use client'

import { calculateCompleteness, completenessLabel } from '@/lib/vault/completeness'

interface Props {
  nomineeCount: number
  documentCount: number
  assetCount: number
  hasLetter: boolean
  hasBankAsset: boolean
  hasInsuranceAsset: boolean
}

export default function CompletenessScore({
  nomineeCount,
  documentCount,
  assetCount,
  hasLetter,
  hasBankAsset,
  hasInsuranceAsset,
}: Props) {
  const score = calculateCompleteness({
    nomineeCount,
    documentCount,
    assetCount,
    hasLetter,
    hasBankAsset,
    hasInsuranceAsset,
  })
  const { text, colour } = completenessLabel(score)

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const dash = (score / 100) * circumference

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-24 h-24 flex-shrink-0">
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
        >
          {score}%
        </span>
      </div>
      <div>
        <p className="text-base font-medium text-[#1a1a1a]" style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}>
          {text}
        </p>
        <p className="text-sm text-[#6b7280] mt-1">Vault completeness</p>
      </div>
    </div>
  )
}
