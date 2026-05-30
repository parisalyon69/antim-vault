'use client'

import { calculateCompleteness, completenessLabel } from '@/lib/vault/completeness'
import Link from 'next/link'

interface Props {
  nomineeCount: number
  documentCount: number
  assetCount: number
  hasLetter: boolean
  hasBankAsset: boolean
  hasInsuranceAsset: boolean
}

const sections: {
  key: keyof Props | null
  label: string
  href: string
  check: (props: Props) => boolean
  partial?: (props: Props) => boolean
}[] = [
  {
    key: null,
    label: 'Accounts and assets',
    href: '/vault/assets',
    check: (p) => p.assetCount >= 5,
    partial: (p) => p.assetCount > 0 && p.assetCount < 5,
  },
  {
    key: null,
    label: 'Documents',
    href: '/vault/documents',
    check: (p) => p.documentCount >= 3,
    partial: (p) => p.documentCount === 1 || p.documentCount === 2,
  },
  {
    key: null,
    label: 'Nominees',
    href: '/vault/nominees',
    check: (p) => p.nomineeCount > 0,
    partial: () => false,
  },
  {
    key: null,
    label: 'Personal letter',
    href: '/vault/letter',
    check: (p) => p.hasLetter,
    partial: () => false,
  },
]

function SectionRow({
  label,
  done,
  partial,
  href,
}: {
  label: string
  done: boolean
  partial: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-2 group"
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            done
              ? 'bg-[#4F6F52]'
              : partial
              ? 'bg-[#B8722C]/20 border border-[#B8722C]/40'
              : 'border-2 border-[#e5e7eb]'
          }`}
        >
          {done && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M1.5 4l2 2 3-3"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {partial && !done && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#B8722C]" />
          )}
        </div>
        <span
          className={`text-sm transition-colors group-hover:text-[#1a1a1a] ${
            done ? 'text-[#1a1a1a]' : 'text-[#6b7280]'
          }`}
        >
          {label}
        </span>
      </div>
      <span className="text-xs text-[#9ca3af] group-hover:text-[#6b7280] transition-colors">
        {done ? 'Done' : partial ? 'Partial' : 'Not started'}
      </span>
    </Link>
  )
}

export default function CompletenessScore({
  nomineeCount,
  documentCount,
  assetCount,
  hasLetter,
  hasBankAsset,
  hasInsuranceAsset,
}: Props) {
  const props: Props = {
    nomineeCount,
    documentCount,
    assetCount,
    hasLetter,
    hasBankAsset,
    hasInsuranceAsset,
  }
  const score = calculateCompleteness(props)
  const { text, colour } = completenessLabel(score)

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const dash = (score / 100) * circumference

  return (
    <div>
      {/* Score ring + label */}
      <div className="flex items-center gap-6 mb-6">
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
            style={{
              color: colour,
              fontFamily: 'var(--font-lora, Lora, Georgia, serif)',
            }}
          >
            {score}%
          </span>
        </div>
        <div>
          <p
            className="text-base font-medium text-[#1a1a1a]"
            style={{ fontFamily: 'var(--font-lora, Lora, Georgia, serif)' }}
          >
            {text}
          </p>
          <p className="text-sm text-[#6b7280] mt-1">Vault completeness</p>
        </div>
      </div>

      {/* Per-section breakdown */}
      <div className="border border-[#e5e7eb] rounded-lg px-5 divide-y divide-[#f3f4f6]">
        {sections.map((s) => (
          <SectionRow
            key={s.href}
            label={s.label}
            href={s.href}
            done={s.check(props)}
            partial={s.partial ? s.partial(props) : false}
          />
        ))}
      </div>
    </div>
  )
}
